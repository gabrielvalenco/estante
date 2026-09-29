import "server-only";

import { and, desc, eq, exists, ilike, ne, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { entries, follows, profiles, reviewReactions, type EntryRow, type ProfileRow } from "@/lib/db/schema";
import type { ProfileCard } from "@/lib/db/types";
import { fromRow, type ReviewView } from "@/lib/reviews";

/**
 * Colunas de perfil que podem sair em página pública. Nunca `select()` sem lista em profiles:
 * `provider_id` identifica a conta no provedor de login e não é público.
 */
const PUBLIC_PROFILE = {
  id: profiles.id,
  handle: profiles.handle,
  name: profiles.name,
  bio: profiles.bio,
  tone: profiles.tone,
  goal: profiles.goal,
  favorites: profiles.favorites,
  isPrivate: profiles.isPrivate,
  founder: profiles.founder,
  socials: profiles.socials,
  createdAt: profiles.createdAt,
} as const;

export type PublicProfileRow = Omit<ProfileRow, "providerId">;

/**
 * Leituras públicas do banco. Não dependem de cookies, então as páginas continuam
 * em cache (ISR). Em modo demonstração, ou se o banco falhar, devolvem vazio e
 * a página segue de pé com os dados de exemplo.
 */

async function safe<T>(fallback: T, run: () => Promise<T>): Promise<T> {
  if (!db) return fallback;
  try {
    return await run();
  } catch (err) {
    console.error("[db]", err);
    return fallback;
  }
}

const reviewAuthor = { handle: profiles.handle, name: profiles.name, tone: profiles.tone, founder: profiles.founder };

// Contagem de reações de cada review (autor + livro).
const likeCount = sql<number>`(select count(*)::int from ${reviewReactions} r where r.review_user_id = ${entries.userId} and r.book_id = ${entries.bookId} and r.value = 1)`;
const dislikeCount = sql<number>`(select count(*)::int from ${reviewReactions} r where r.review_user_id = ${entries.userId} and r.book_id = ${entries.bookId} and r.value = -1)`;

/** Reviews de perfis públicos. Perfil privado nunca aparece em página pública. */
function publicReviews() {
  return db!
    .select({ entry: entries, profile: reviewAuthor, likes: likeCount, dislikes: dislikeCount })
    .from(entries)
    .innerJoin(profiles, eq(entries.userId, profiles.id))
    .$dynamic();
}

export function recentReviews(limit = 6): Promise<ReviewView[]> {
  return safe([], async () => {
    const rows = await publicReviews()
      .where(and(ne(entries.review, ""), eq(profiles.isPrivate, false)))
      .orderBy(desc(entries.updatedAt))
      .limit(limit);
    return rows.map(fromRow);
  });
}

export function bookReviews(bookId: string): Promise<ReviewView[]> {
  return safe([], async () => {
    const rows = await publicReviews()
      .where(and(eq(entries.bookId, bookId), ne(entries.review, ""), eq(profiles.isPrivate, false)))
      .orderBy(desc(entries.updatedAt))
      .limit(50);
    return rows.map(fromRow);
  });
}

/** Reviews de um perfil (usado no conteúdo de perfil privado, depois da checagem de acesso). */
export function reviewsOf(profileId: string): Promise<ReviewView[]> {
  return safe([], async () => {
    const rows = await publicReviews()
      .where(and(eq(entries.userId, profileId), ne(entries.review, "")))
      .orderBy(desc(entries.updatedAt))
      .limit(200);
    return rows.map(fromRow);
  });
}

/**
 * Perfil para a página pública. Se for privado, `entries` vem vazio: estante, diário e reviews
 * só são entregues pelo servidor a quem tem acesso (ver getPrivateProfileContent).
 */
export type PublicProfile = PublicProfileRow & { entries: EntryRow[]; followers: number; following: number };

export function profileByHandle(handle: string): Promise<PublicProfile | null> {
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) return Promise.resolve(null);
  return safe(null, async () => {
    const [profile] = await db!.select(PUBLIC_PROFILE).from(profiles).where(eq(profiles.handle, handle)).limit(1);
    if (!profile) return null;
    const shelf = profile.isPrivate
      ? []
      : await db!.query.entries.findMany({
          where: eq(entries.userId, profile.id),
          orderBy: desc(entries.updatedAt),
          limit: 500,
        });
    const [counts] = await db!
      .select({
        followers: sql<number>`(select count(*)::int from ${follows} where ${follows.followingId} = ${profile.id})`,
        following: sql<number>`(select count(*)::int from ${follows} where ${follows.followerId} = ${profile.id})`,
      })
      .from(sql`(select 1) as one`);
    return { ...profile, entries: shelf, followers: counts?.followers ?? 0, following: counts?.following ?? 0 };
  });
}

/** Leitores reais mais recentes que já registraram algum livro, com as 4 últimas capas. */
export function recentReaders(limit = 6) {
  return safe([], async () => {
    const people = await db!
      .select(PUBLIC_PROFILE)
      .from(profiles)
      .where(
        and(eq(profiles.isPrivate, false), exists(db!.select({ one: sql`1` }).from(entries).where(eq(entries.userId, profiles.id)))),
      )
      .orderBy(desc(profiles.createdAt))
      .limit(limit);

    return Promise.all(
      people.map(async (p) => ({
        ...p,
        entries: await db!.query.entries.findMany({
          where: eq(entries.userId, p.id),
          orderBy: desc(entries.updatedAt),
          limit: 4,
        }),
      })),
    );
  });
}

/** Quantas pessoas têm conta na Estante. */
export function countReaders(): Promise<number> {
  return safe(0, async () => {
    const [row] = await db!.select({ n: sql<number>`count(*)::int` }).from(profiles);
    return row?.n ?? 0;
  });
}

/** Escapa % e _ para buscar texto literal com ilike. */
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (ch) => "\\" + ch);

/**
 * Busca de leitores por @ ou nome. O @ vale por prefixo ("gab" acha "gabrielvalenco");
 * o nome vale em qualquer parte. Perfis privados aparecem (dá para pedir para seguir).
 */
export function searchReaders(query: string, limit = 5): Promise<ProfileCard[]> {
  const q = query.trim().replace(/^@/, "");
  if (q.length < 2 || q.length > 60) return Promise.resolve([]);
  return safe([], async () => {
    const term = likeEscape(q.toLowerCase());
    return db!
      .select({ handle: profiles.handle, name: profiles.name, tone: profiles.tone, isPrivate: profiles.isPrivate, founder: profiles.founder })
      .from(profiles)
      .where(or(ilike(profiles.handle, `${term}%`), ilike(profiles.name, `%${term}%`)))
      .orderBy(sql`(${profiles.handle} ilike ${term + "%"}) desc`, profiles.handle)
      .limit(limit);
  });
}
