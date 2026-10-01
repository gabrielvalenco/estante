"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";

import { billingEnabled, customerFor, planStatusOf, priceId, stripe, syncSubscription, type Interval, type PaidPlan, type PlanStatus } from "@/lib/billing";
import { db } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";
import { currentProfileId } from "@/lib/session";

/**
 * Assinar, gerenciar e confirmar o plano. O id da pessoa vem sempre da sessão; o Stripe
 * só recebe o id do perfil e o nome (sem e-mail: o Stripe pede na própria página do checkout).
 */

export type BillingError = "unauthenticated" | "unavailable" | "already_subscribed" | "not_found";

async function origin() {
  const h = await headers();
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3100";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function getPlanStatus(): Promise<{ status: PlanStatus | null; enabled: boolean }> {
  const me = await currentProfileId();
  return { status: me ? await planStatusOf(me) : null, enabled: billingEnabled() };
}

/**
 * Abre o checkout do Stripe para um plano pago (mensal ou anual). Devolve a URL para redirecionar.
 * Quem já assina troca de plano pelo portal (o Stripe calcula a diferença proporcional).
 */
export async function startCheckoutAction(plan: PaidPlan, interval: Interval): Promise<{ ok: true; url: string } | { ok: false; error: BillingError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const s = stripe();
  if (!s || (interval !== "month" && interval !== "year") || (plan !== "capa-dura" && plan !== "ex-libris")) return { ok: false, error: "unavailable" };

  const current = await planStatusOf(me);
  if (current.plan !== "brochura") return { ok: false, error: "already_subscribed" };

  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { name: true } });
  const [customer, price] = await Promise.all([customerFor(me, profile?.name ?? "Leitor"), priceId(plan, interval)]);
  if (!customer || !price) return { ok: false, error: "unavailable" };

  const base = await origin();
  const session = await s.checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: me,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { profileId: me } },
    allow_promotion_codes: true,
    locale: "pt-BR",
    success_url: `${base}/planos?sessao={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/planos`,
  });
  return session.url ? { ok: true, url: session.url } : { ok: false, error: "unavailable" };
}

/** Portal do Stripe: trocar cartão, ver faturas, cancelar. */
export async function openPortalAction(): Promise<{ ok: true; url: string } | { ok: false; error: BillingError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const s = stripe();
  if (!s) return { ok: false, error: "unavailable" };
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.profileId, me), columns: { stripeCustomerId: true } });
  if (!sub) return { ok: false, error: "not_found" };
  const portal = await s.billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${await origin()}/planos?portal=1` });
  return { ok: true, url: portal.url };
}

/**
 * Volta do portal: relê a assinatura no Stripe (troca de plano, cancelamento), sem esperar o webhook.
 * O cliente é sempre o da própria pessoa, lido do banco.
 */
export async function syncPortalAction(): Promise<PlanStatus | null> {
  const me = await currentProfileId();
  if (!me || !db) return null;
  const s = stripe();
  const sub = await db.query.subscriptions.findFirst({ where: eq(subscriptions.profileId, me), columns: { stripeCustomerId: true } });
  if (s && sub) {
    const list = await s.subscriptions.list({ customer: sub.stripeCustomerId, status: "all", limit: 1 }).catch(() => null);
    if (list?.data[0]) await syncSubscription(list.data[0]);
  }
  return planStatusOf(me);
}

/**
 * Volta do checkout: confirma a assinatura direto no Stripe (não espera o webhook).
 * Só aceita a sessão criada para a própria pessoa.
 */
export async function syncCheckoutAction(sessionId: string): Promise<{ ok: true; status: PlanStatus } | { ok: false; error: BillingError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const s = stripe();
  if (!s || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return { ok: false, error: "not_found" };
  const session = await s.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] }).catch(() => null);
  if (!session || session.client_reference_id !== me) return { ok: false, error: "not_found" };
  if (session.subscription && typeof session.subscription !== "string") await syncSubscription(session.subscription);
  return { ok: true, status: await planStatusOf(me) };
}
