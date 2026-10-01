"use server";

import { and, asc, count, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { profiles, SUPPORT_STATUSES, supportMessages, supportTickets, type SupportContext, type SupportStatus, type SupportTopic } from "@/lib/db/schema";
import { notify } from "@/lib/db/social";
import { currentProfileId } from "@/lib/session";
import type { SupportError } from "@/lib/support";
import { createTicket, hash, isStaff, staffIds } from "@/lib/support-server";

/**
 * Suporte. Qualquer pessoa abre um pedido (sem conta, informa um e-mail e acompanha por um link
 * privado). Quem responde é a equipe listada em SUPPORT_ADMIN_IDS (ids de perfil, separados por vírgula).
 * A resposta vira notificação para quem tem conta; para quem não tem, o suporte responde por e-mail.
 */

export type SupportMessageView = { author: "pessoa" | "suporte"; body: string; createdAt: number };
export type TicketSummary = { number: number; subject: string; topic: SupportTopic; status: SupportStatus; updatedAt: number; lastFrom: "pessoa" | "suporte" };
export type TicketView = TicketSummary & { createdAt: number; messages: SupportMessageView[] };
/** Se a equipe já foi configurada (sem ela, /admin/suporte mostra como configurar). */
export async function supportAdminsConfigured(): Promise<boolean> {
  return staffIds().length > 0;
}

export type AdminTicket = TicketView & {
  email: string | null;
  name: string | null;
  profile: { handle: string; name: string } | null;
  context: SupportContext;
};

const MESSAGES_PER_HOUR = 10;

const Body = z.string().trim().min(1).max(5000);
const Token = z.string().regex(/^[A-Za-z0-9_-]{20,64}$/);

export async function createTicketAction(input: Parameters<typeof createTicket>[0]) {
  return createTicket(input, { platform: "site" });
}

async function messagesOf(ticketIds: string[]) {
  if (!ticketIds.length) return new Map<string, SupportMessageView[]>();
  const rows = await db!
    .select({ ticketId: supportMessages.ticketId, author: supportMessages.author, body: supportMessages.body, createdAt: supportMessages.createdAt })
    .from(supportMessages)
    .where(inArray(supportMessages.ticketId, ticketIds))
    .orderBy(asc(supportMessages.createdAt));
  const map = new Map<string, SupportMessageView[]>();
  for (const r of rows) {
    const list = map.get(r.ticketId) ?? [];
    list.push({ author: r.author, body: r.body, createdAt: r.createdAt.getTime() });
    map.set(r.ticketId, list);
  }
  return map;
}

function toView(t: typeof supportTickets.$inferSelect, messages: SupportMessageView[]): TicketView {
  return {
    number: t.number,
    subject: t.subject,
    topic: t.topic,
    status: t.status,
    createdAt: t.createdAt.getTime(),
    updatedAt: t.updatedAt.getTime(),
    lastFrom: messages.at(-1)?.author ?? "pessoa",
    messages,
  };
}

/** Pedidos de quem está logado, do mais recente para o mais antigo. */
export async function listMyTickets(): Promise<TicketSummary[] | null> {
  const me = await currentProfileId();
  if (!me || !db) return null;
  const rows = await db.select().from(supportTickets).where(eq(supportTickets.profileId, me)).orderBy(desc(supportTickets.updatedAt)).limit(50);
  const msgs = await messagesOf(rows.map((r) => r.id));
  return rows.map((r) => {
    const { messages, ...summary } = toView(r, msgs.get(r.id) ?? []);
    void messages;
    return summary;
  });
}

/** Um pedido: pelo número (dono logado) ou pelo token do link privado (quem não tem conta). */
type Ref = { number: number } | { token: string };

async function findTicket(ref: Ref) {
  if (!db) return null;
  if ("token" in ref) {
    if (!Token.safeParse(ref.token).success) return null;
    return (await db.query.supportTickets.findFirst({ where: eq(supportTickets.accessHash, hash(ref.token)) })) ?? null;
  }
  const me = await currentProfileId();
  if (!me || !Number.isInteger(ref.number)) return null;
  return (await db.query.supportTickets.findFirst({ where: and(eq(supportTickets.number, ref.number), eq(supportTickets.profileId, me)) })) ?? null;
}

export async function getTicket(ref: Ref): Promise<TicketView | null> {
  const t = await findTicket(ref);
  if (!t) return null;
  return toView(t, (await messagesOf([t.id])).get(t.id) ?? []);
}

/** A pessoa responde no próprio pedido (reabre se estava respondido ou resolvido). */
export async function replyTicketAction(ref: Ref, body: string): Promise<{ ok: true } | { ok: false; error: SupportError }> {
  const t = await findTicket(ref);
  if (!t || !db) return { ok: false, error: "not_found" };
  const parsed = Body.safeParse(body);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recent] = await db
    .select({ n: count() })
    .from(supportMessages)
    .where(and(eq(supportMessages.ticketId, t.id), eq(supportMessages.author, "pessoa"), gte(supportMessages.createdAt, hourAgo)));
  if (recent.n >= MESSAGES_PER_HOUR) return { ok: false, error: "rate_limited" };
  await db.insert(supportMessages).values({ ticketId: t.id, author: "pessoa", body: parsed.data });
  await db.update(supportTickets).set({ status: "aberto", updatedAt: new Date() }).where(eq(supportTickets.id, t.id));
  return { ok: true };
}

/** A pessoa marca como resolvido. */
export async function resolveTicketAction(ref: Ref): Promise<{ ok: boolean }> {
  const t = await findTicket(ref);
  if (!t || !db) return { ok: false };
  await db.update(supportTickets).set({ status: "resolvido", updatedAt: new Date() }).where(eq(supportTickets.id, t.id));
  return { ok: true };
}

// ------------------------------------------------------------
// Equipe de suporte
// ------------------------------------------------------------

async function staff() {
  const me = await currentProfileId();
  return me && db && isStaff(me) ? me : null;
}

export async function listTicketsAdmin(status?: SupportStatus): Promise<(TicketSummary & { email: string | null; who: string })[] | null> {
  if (!(await staff())) return null;
  const rows = await db!
    .select({ t: supportTickets, handle: profiles.handle, profileName: profiles.name })
    .from(supportTickets)
    .leftJoin(profiles, eq(profiles.id, supportTickets.profileId))
    .where(status && SUPPORT_STATUSES.includes(status) ? eq(supportTickets.status, status) : undefined)
    // Quem espera resposta primeiro; depois os mais recentes.
    .orderBy(sql`case ${supportTickets.status} when 'aberto' then 0 when 'respondido' then 1 else 2 end`, desc(supportTickets.updatedAt))
    .limit(200);
  const msgs = await messagesOf(rows.map((r) => r.t.id));
  return rows.map(({ t, handle, profileName }) => {
    const { messages, ...summary } = toView(t, msgs.get(t.id) ?? []);
    void messages;
    return { ...summary, email: t.email, who: handle ? `${profileName} (@${handle})` : t.name || t.email || "Visitante" };
  });
}

export async function getTicketAdmin(number: number): Promise<AdminTicket | null> {
  if (!(await staff()) || !Number.isInteger(number)) return null;
  const [row] = await db!
    .select({ t: supportTickets, handle: profiles.handle, profileName: profiles.name })
    .from(supportTickets)
    .leftJoin(profiles, eq(profiles.id, supportTickets.profileId))
    .where(eq(supportTickets.number, number));
  if (!row) return null;
  const view = toView(row.t, (await messagesOf([row.t.id])).get(row.t.id) ?? []);
  return {
    ...view,
    email: row.t.email,
    name: row.t.name,
    profile: row.handle ? { handle: row.handle, name: row.profileName! } : null,
    context: row.t.context,
  };
}

/** Resposta da equipe: grava, marca como respondido (ou resolvido) e avisa quem tem conta. */
export async function staffReplyAction(number: number, body: string, resolve = false): Promise<{ ok: true; notified: boolean } | { ok: false; error: SupportError }> {
  const me = await staff();
  if (!me) return { ok: false, error: "forbidden" };
  const parsed = Body.safeParse(body);
  if (!parsed.success || !Number.isInteger(number)) return { ok: false, error: "invalid" };
  const t = await db!.query.supportTickets.findFirst({ where: eq(supportTickets.number, number) });
  if (!t) return { ok: false, error: "not_found" };
  await db!.insert(supportMessages).values({ ticketId: t.id, author: "suporte", body: parsed.data });
  await db!.update(supportTickets).set({ status: resolve ? "resolvido" : "respondido", updatedAt: new Date() }).where(eq(supportTickets.id, t.id));
  if (t.profileId) await notify({ recipientId: t.profileId, actorId: me, type: "support_reply", bookId: `suporte:${t.number}`, bookTitle: t.subject });
  return { ok: true, notified: Boolean(t.profileId && t.profileId !== me) };
}

export async function setTicketStatusAction(number: number, status: SupportStatus): Promise<{ ok: boolean }> {
  if (!(await staff()) || !SUPPORT_STATUSES.includes(status)) return { ok: false };
  await db!.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.number, number));
  return { ok: true };
}
