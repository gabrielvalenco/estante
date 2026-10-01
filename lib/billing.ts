import "server-only";

import { and, eq, inArray } from "drizzle-orm";
import Stripe from "stripe";

import { db } from "@/lib/db";
import { subscriptions, type SubscriptionRow } from "@/lib/db/schema";
import type { PlanId } from "@/lib/plans";

/**
 * Cobrança com Stripe. O cartão é digitado na página do Stripe (Checkout), nunca aqui.
 * Os preços são achados pela lookup_key (criados por scripts/stripe-setup.mjs), então
 * trocar de conta ou de modo (teste/produção) não exige mudar ids no código.
 */

export type PaidPlan = "capa-dura" | "ex-libris";
export type Interval = "month" | "year";
/** lookup_key de cada preço no Stripe (criados por scripts/stripe-setup.mjs). */
export const PRICE_KEYS: Record<PaidPlan, Record<Interval, string>> = {
  "capa-dura": { month: "capa-dura-mensal", year: "capa-dura-anual" },
  "ex-libris": { month: "ex-libris-mensal", year: "ex-libris-anual" },
};

/** Status em que a assinatura ainda dá acesso. past_due: cobrança falhou, o Stripe está tentando de novo. */
const ACTIVE = ["active", "trialing", "past_due"];

let client: Stripe | null = null;
export function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  client ??= new Stripe(key, { appInfo: { name: "Estante" } });
  return client;
}

export const billingEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);
/** Chave de teste do Stripe: nada é cobrado de verdade (o cartão 4242 funciona). */
export const billingTestMode = () => /^(sk|rk)_test_/.test(process.env.STRIPE_SECRET_KEY ?? "");

/** Plano de um perfil: Capa Dura enquanto a assinatura estiver ativa e dentro do período pago. */
export async function planOf(profileId: string): Promise<PlanId> {
  if (!db) return "brochura";
  const sub = await db.query.subscriptions.findFirst({
    where: and(eq(subscriptions.profileId, profileId), inArray(subscriptions.status, ACTIVE)),
    columns: { plan: true, currentPeriodEnd: true },
  });
  // Um dia de folga: o webhook de renovação pode chegar alguns minutos depois do fim do período.
  if (!sub || (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() + 86_400_000 < Date.now())) return "brochura";
  return sub.plan;
}

export type PlanStatus = {
  plan: PlanId;
  status: string | null;
  interval: Interval | null;
  /** Próxima renovação, ou o fim do acesso se cancelada. */
  periodEnd: number | null;
  canceling: boolean;
  /** Tem cliente no Stripe (dá para abrir o portal de assinatura). */
  hasCustomer: boolean;
};

export async function planStatusOf(profileId: string): Promise<PlanStatus> {
  const [plan, sub] = await Promise.all([planOf(profileId), db?.query.subscriptions.findFirst({ where: eq(subscriptions.profileId, profileId) })]);
  return {
    plan,
    status: sub?.status ?? null,
    interval: (sub?.interval as Interval | null) ?? null,
    periodEnd: (sub?.cancelAt ?? sub?.currentPeriodEnd)?.getTime() ?? null,
    canceling: Boolean(sub?.cancelAt),
    hasCustomer: Boolean(sub),
  };
}

/** Cliente do Stripe do perfil (cria na primeira vez). O id do perfil vai nos metadados. */
export async function customerFor(profileId: string, name: string): Promise<string | null> {
  const s = stripe();
  if (!s || !db) return null;
  const existing = await db.query.subscriptions.findFirst({ where: eq(subscriptions.profileId, profileId), columns: { stripeCustomerId: true } });
  if (existing) return existing.stripeCustomerId;
  const customer = await s.customers.create({ name, metadata: { profileId } });
  await db.insert(subscriptions).values({ profileId, stripeCustomerId: customer.id, status: "incomplete" }).onConflictDoNothing();
  const row = await db.query.subscriptions.findFirst({ where: eq(subscriptions.profileId, profileId), columns: { stripeCustomerId: true } });
  return row?.stripeCustomerId ?? customer.id;
}

export async function priceId(plan: PaidPlan, interval: Interval): Promise<string | null> {
  const s = stripe();
  if (!s) return null;
  const prices = await s.prices.list({ lookup_keys: [PRICE_KEYS[plan][interval]], active: true, limit: 1 });
  return prices.data[0]?.id ?? null;
}

/**
 * Copia uma assinatura do Stripe para a tabela. Chamado pelo webhook e na volta do checkout;
 * pode rodar várias vezes com o mesmo evento sem problema (sempre grava o estado atual).
 */
export async function syncSubscription(sub: Stripe.Subscription): Promise<SubscriptionRow | null> {
  if (!db) return null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  const item = sub.items.data[0];
  const values = {
    stripeSubscriptionId: sub.id,
    // O plano vem do preço comprado (troca de plano no portal muda o preço da assinatura).
    plan: (item?.price.lookup_key?.startsWith("ex-libris") ? "ex-libris" : "capa-dura") as PaidPlan,
    status: sub.status,
    interval: item?.price.recurring?.interval === "year" ? ("year" as const) : ("month" as const),
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
    cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000) : sub.cancel_at_period_end && item ? new Date(item.current_period_end * 1000) : null,
    updatedAt: new Date(),
  };
  const [row] = await db.update(subscriptions).set(values).where(eq(subscriptions.stripeCustomerId, customerId)).returning();
  if (row) return row;

  // Cliente criado fora do fluxo normal: acha o perfil pelos metadados.
  const profileId = sub.metadata?.profileId;
  if (!profileId) return null;
  const [inserted] = await db
    .insert(subscriptions)
    .values({ profileId, stripeCustomerId: customerId, ...values })
    .onConflictDoUpdate({ target: subscriptions.profileId, set: { stripeCustomerId: customerId, ...values } })
    .returning();
  return inserted ?? null;
}
