"use server";

import { randomBytes } from "node:crypto";

import { and, asc, count, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { planOf } from "@/lib/billing";
import { isClubMember } from "@/lib/clubs";
import { db } from "@/lib/db";
import { clubMembers, clubs, entries, profiles, readingProgress, type ClubRow } from "@/lib/db/schema";
import { isBlockedEither } from "@/lib/db/social";
import { CLUB_MAX_MEMBERS, PLANS } from "@/lib/plans";
import { currentProfileId } from "@/lib/session";

/**
 * Clubes de leitura. Criar é do Ex Libris; entrar é livre, pelo link de convite.
 * Tudo do clube (membros, progresso, discussões) só aparece para quem é membro.
 * O progresso compartilhado é só o do livro do clube: o resto da estante continua como está.
 */

export type ClubBook = { id: string; title: string; author: string; coverId: number | null; color: string };
export type ClubMemberView = {
  handle: string;
  name: string;
  tone: string;
  avatarUrl: string | null;
  role: "owner" | "member";
  /** Progresso no livro do clube: página do marcador, total e se já leu. */
  page: number | null;
  totalPages: number | null;
  finished: boolean;
};
export type ClubSummary = { id: string; name: string; description: string; book: ClubBook | null; members: number; role: "owner" | "member" };
export type ClubView = ClubSummary & { inviteCode: string | null; memberList: ClubMemberView[]; maxMembers: number };
export type ClubError = "unauthenticated" | "invalid" | "not_found" | "plan" | "limit_clubs" | "full" | "blocked" | "owner_cannot_leave";

const Id = z.uuid();
const Code = z.string().regex(/^[A-Za-z0-9]{10,32}$/);
const Book = z.object({
  id: z.string().regex(/^OL\d+W$/),
  title: z.string().trim().min(1).max(300),
  author: z.string().max(200),
  coverId: z.number().int().positive().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
const ClubInput = z.object({ name: z.string().trim().min(3).max(60), description: z.string().trim().max(500).default(""), book: Book.nullable().default(null) });

const newCode = () => randomBytes(12).toString("base64").replace(/[^A-Za-z0-9]/g, "").slice(0, 16).padEnd(12, "x");

const bookOf = (c: ClubRow): ClubBook | null =>
  c.bookId && c.bookTitle ? { id: c.bookId, title: c.bookTitle, author: c.bookAuthor ?? "", coverId: c.bookCoverId, color: c.bookColor ?? "#3a2fd6" } : null;

async function memberCounts(ids: string[]) {
  if (!ids.length) return new Map<string, number>();
  const rows = await db!.select({ clubId: clubMembers.clubId, n: count() }).from(clubMembers).where(inArray(clubMembers.clubId, ids)).groupBy(clubMembers.clubId);
  return new Map(rows.map((r) => [r.clubId, r.n]));
}

/** Clubes de que a pessoa participa, e se o plano dela deixa criar outro. */
export async function listMyClubs(): Promise<{ clubs: ClubSummary[]; canCreate: boolean; owned: number; ownedLimit: number; planName: string } | null> {
  const me = await currentProfileId();
  if (!me || !db) return null;
  const rows = await db
    .select({ club: clubs, role: clubMembers.role })
    .from(clubMembers)
    .innerJoin(clubs, eq(clubMembers.clubId, clubs.id))
    .where(eq(clubMembers.profileId, me))
    .orderBy(asc(clubs.name));
  const counts = await memberCounts(rows.map((r) => r.club.id));
  const plan = PLANS[await planOf(me)];
  const owned = rows.filter((r) => r.role === "owner").length;
  return {
    clubs: rows.map((r) => ({ id: r.club.id, name: r.club.name, description: r.club.description, book: bookOf(r.club), members: counts.get(r.club.id) ?? 1, role: r.role })),
    canCreate: owned < plan.limits.clubsOwned,
    owned,
    ownedLimit: plan.limits.clubsOwned,
    planName: plan.name,
  };
}

/** Um clube, com os membros e o progresso de cada um no livro do clube. Só para membros. */
export async function getClub(clubId: string): Promise<ClubView | null> {
  const me = await currentProfileId();
  if (!me || !db || !Id.safeParse(clubId).success) return null;
  const club = await db.query.clubs.findFirst({ where: eq(clubs.id, clubId) });
  if (!club) return null;
  const members = await db
    .select({ id: profiles.id, handle: profiles.handle, name: profiles.name, tone: profiles.tone, avatarUrl: profiles.avatarUrl, role: clubMembers.role })
    .from(clubMembers)
    .innerJoin(profiles, eq(clubMembers.profileId, profiles.id))
    .where(eq(clubMembers.clubId, clubId))
    .orderBy(asc(clubMembers.joinedAt));
  const mine = members.find((m) => m.id === me);
  if (!mine) return null;

  const ids = members.map((m) => m.id);
  const [progress, finished] = club.bookId
    ? await Promise.all([
        db.select().from(readingProgress).where(and(eq(readingProgress.bookId, club.bookId), inArray(readingProgress.userId, ids))),
        db.select({ userId: entries.userId }).from(entries).where(and(eq(entries.bookId, club.bookId), eq(entries.status, "lido"), inArray(entries.userId, ids))),
      ])
    : [[], []];
  const progressOf = new Map(progress.map((p) => [p.userId, p]));
  const done = new Set(finished.map((f) => f.userId));

  return {
    id: club.id,
    name: club.name,
    description: club.description,
    book: bookOf(club),
    members: members.length,
    role: mine.role,
    // O link de convite fica com quem criou (é quem decide quem entra).
    inviteCode: mine.role === "owner" ? club.inviteCode : null,
    maxMembers: CLUB_MAX_MEMBERS,
    memberList: members.map((m) => ({
      handle: m.handle,
      name: m.name,
      tone: m.tone,
      avatarUrl: m.avatarUrl,
      role: m.role,
      page: progressOf.get(m.id)?.page ?? null,
      totalPages: progressOf.get(m.id)?.totalPages ?? null,
      finished: done.has(m.id),
    })),
  };
}

/** Prévia do convite (nome, livro, quantas pessoas), para decidir se entra. */
export async function previewInvite(code: string): Promise<{ id: string; name: string; description: string; book: ClubBook | null; members: number; ownerName: string; alreadyMember: boolean } | null> {
  const me = await currentProfileId();
  if (!me || !db || !Code.safeParse(code).success) return null;
  const club = await db.query.clubs.findFirst({ where: eq(clubs.inviteCode, code) });
  if (!club) return null;
  const [owner, counts, member] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(profiles.id, club.ownerId), columns: { name: true } }),
    memberCounts([club.id]),
    isClubMember(me, club.id),
  ]);
  return { id: club.id, name: club.name, description: club.description, book: bookOf(club), members: counts.get(club.id) ?? 1, ownerName: owner?.name ?? "", alreadyMember: member };
}

export async function createClubAction(input: z.input<typeof ClubInput>): Promise<{ ok: true; id: string } | { ok: false; error: ClubError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = ClubInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const plan = PLANS[await planOf(me)];
  if (plan.limits.clubsOwned === 0) return { ok: false, error: "plan" };
  const [{ n }] = await db.select({ n: count() }).from(clubs).where(eq(clubs.ownerId, me));
  if (n >= plan.limits.clubsOwned) return { ok: false, error: "limit_clubs" };

  const { name, description, book } = parsed.data;
  const [club] = await db
    .insert(clubs)
    .values({
      name,
      description,
      ownerId: me,
      inviteCode: newCode(),
      bookId: book?.id ?? null,
      bookTitle: book?.title ?? null,
      bookAuthor: book?.author ?? null,
      bookCoverId: book?.coverId ?? null,
      bookColor: book?.color.toLowerCase() ?? null,
    })
    .returning({ id: clubs.id });
  await db.insert(clubMembers).values({ clubId: club.id, profileId: me, role: "owner" });
  return { ok: true, id: club.id };
}

/** Entra pelo código do convite. Bloqueio com quem criou impede; clube cheio também. */
export async function joinClubAction(code: string): Promise<{ ok: true; id: string } | { ok: false; error: ClubError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  if (!Code.safeParse(code).success) return { ok: false, error: "not_found" };
  const club = await db.query.clubs.findFirst({ where: eq(clubs.inviteCode, code), columns: { id: true, ownerId: true } });
  if (!club) return { ok: false, error: "not_found" };
  if (await isClubMember(me, club.id)) return { ok: true, id: club.id };
  if (await isBlockedEither(me, club.ownerId)) return { ok: false, error: "blocked" };
  const counts = await memberCounts([club.id]);
  if ((counts.get(club.id) ?? 0) >= CLUB_MAX_MEMBERS) return { ok: false, error: "full" };
  await db.insert(clubMembers).values({ clubId: club.id, profileId: me, role: "member" }).onConflictDoNothing();
  return { ok: true, id: club.id };
}

export async function leaveClubAction(clubId: string): Promise<{ ok: boolean; error?: ClubError }> {
  const me = await currentProfileId();
  if (!me || !db || !Id.safeParse(clubId).success) return { ok: false, error: "invalid" };
  const row = await db.query.clubMembers.findFirst({ where: and(eq(clubMembers.clubId, clubId), eq(clubMembers.profileId, me)) });
  if (!row) return { ok: false, error: "not_found" };
  if (row.role === "owner") return { ok: false, error: "owner_cannot_leave" };
  await db.delete(clubMembers).where(and(eq(clubMembers.clubId, clubId), eq(clubMembers.profileId, me)));
  return { ok: true };
}

/** Só quem criou o clube. */
async function ownedClub(clubId: string) {
  const me = await currentProfileId();
  if (!me || !db || !Id.safeParse(clubId).success) return null;
  return db.query.clubs.findFirst({ where: and(eq(clubs.id, clubId), eq(clubs.ownerId, me)) });
}

export async function updateClubAction(clubId: string, input: z.input<typeof ClubInput>): Promise<{ ok: boolean; error?: ClubError }> {
  const club = await ownedClub(clubId);
  if (!club) return { ok: false, error: "not_found" };
  const parsed = ClubInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { name, description, book } = parsed.data;
  await db!
    .update(clubs)
    .set({
      name,
      description,
      bookId: book?.id ?? null,
      bookTitle: book?.title ?? null,
      bookAuthor: book?.author ?? null,
      bookCoverId: book?.coverId ?? null,
      bookColor: book?.color.toLowerCase() ?? null,
      updatedAt: new Date(),
    })
    .where(eq(clubs.id, club.id));
  return { ok: true };
}

/** Troca o código do convite: links antigos param de funcionar. */
export async function regenerateInviteAction(clubId: string): Promise<{ ok: true; inviteCode: string } | { ok: false }> {
  const club = await ownedClub(clubId);
  if (!club) return { ok: false };
  const inviteCode = newCode();
  await db!.update(clubs).set({ inviteCode, updatedAt: new Date() }).where(eq(clubs.id, club.id));
  return { ok: true, inviteCode };
}

export async function removeMemberAction(clubId: string, handle: string): Promise<{ ok: boolean }> {
  const club = await ownedClub(clubId);
  if (!club || !/^[a-z0-9_]{3,20}$/.test(handle)) return { ok: false };
  const target = await db!.query.profiles.findFirst({ where: eq(profiles.handle, handle), columns: { id: true } });
  if (!target || target.id === club.ownerId) return { ok: false };
  const removed = await db!.delete(clubMembers).where(and(eq(clubMembers.clubId, club.id), eq(clubMembers.profileId, target.id))).returning({ id: clubMembers.profileId });
  return { ok: removed.length > 0 };
}

/** Apaga o clube, com as discussões dele. */
export async function deleteClubAction(clubId: string): Promise<{ ok: boolean }> {
  const club = await ownedClub(clubId);
  if (!club) return { ok: false };
  await db!.delete(clubs).where(eq(clubs.id, club.id));
  return { ok: true };
}
