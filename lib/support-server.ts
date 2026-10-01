import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { and, count, eq, gte } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { planStatusOf } from "@/lib/billing";
import { db } from "@/lib/db";
import { SUPPORT_TOPICS, supportMessages, supportTickets, type SupportContext } from "@/lib/db/schema";
import { currentProfileId } from "@/lib/session";

/** Parte do suporte que só roda no servidor e não vira action pública (ver app/support-actions.ts). */

import type { SupportError } from "@/lib/support";

const TICKETS_PER_HOUR = { account: 5, guest: 3 };

export const staffIds = () =>
  (process.env.SUPPORT_ADMIN_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function isStaff(profileId: string | null): boolean {
  return Boolean(profileId && staffIds().includes(profileId));
}

export const hash = (s: string) => createHash("sha256").update(s).digest("hex");

async function ipHash() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  return hash(`support-ip:${process.env.AUTH_SECRET ?? ""}:${ip}`);
}

const Email = z.string().trim().toLowerCase().max(254).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
const NewTicket = z.object({
  topic: z.enum(SUPPORT_TOPICS),
  subject: z.string().trim().min(3).max(120),
  body: z.string().trim().min(10).max(5000),
  email: z.union([Email, z.literal("")]).optional(),
  name: z.string().trim().max(80).optional(),
  /** Campo escondido: gente não preenche, robô sim. */
  website: z.string().max(0).optional(),
  page: z.string().max(200).optional(),
});
export type Origin = { platform: "site" | "app"; appVersion?: string | null };

/** Usado pela action (site) e pela rota da API (app), que informa a plataforma. */
export async function createTicket(
  input: z.input<typeof NewTicket>,
  origin: Origin = { platform: "site" },
): Promise<{ ok: true; number: number; token: string } | { ok: false; error: SupportError }> {
  if (!db) return { ok: false, error: "invalid" };
  const parsed = NewTicket.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const me = await currentProfileId();
  const { topic, subject, body, name, page } = parsed.data;
  const email = parsed.data.email || null;
  if (!me && !email) return { ok: false, error: "invalid" };

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const ip = me ? null : await ipHash();
  const [recent] = await db
    .select({ n: count() })
    .from(supportTickets)
    .where(and(me ? eq(supportTickets.profileId, me) : eq(supportTickets.ipHash, ip!), gte(supportTickets.createdAt, hourAgo)));
  if (recent.n >= (me ? TICKETS_PER_HOUR.account : TICKETS_PER_HOUR.guest)) return { ok: false, error: "rate_limited" };

  const plan = me ? await planStatusOf(me) : null;
  const context: SupportContext = {
    plan: plan?.plan,
    subscription: plan?.status ?? null,
    platform: origin.platform,
    appVersion: origin.appVersion ?? null,
    page: page || null,
  };
  const token = randomBytes(24).toString("base64url");
  const [ticket] = await db
    .insert(supportTickets)
    .values({ profileId: me, email, name: me ? null : name || null, topic, subject, accessHash: hash(token), ipHash: ip, context })
    .returning({ id: supportTickets.id, number: supportTickets.number });
  await db.insert(supportMessages).values({ ticketId: ticket.id, author: "pessoa", body });
  return { ok: true, number: ticket.number, token };
}

