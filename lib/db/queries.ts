import "server-only";

import { and, desc, eq, exists, ne, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { entries, profiles, type EntryRow, type ProfileRow } from "@/lib/db/schema";
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

const reviewAuthor = { handle: profiles.handle, name: profiles.name, tone: profiles.tone };

export function recentReviews(limit = 6): Promise<ReviewView[]> {
  return safe([], async () => {
    const rows = await db!
      .select({ entry: entries, profile: reviewAuthor })
      .from(entries)
      .innerJoin(profiles, eq(entries.userId, profiles.id))
      .where(ne(entries.review, ""))
      .orderBy(desc(entries.updatedAt))
      .limit(limit);
    return rows.map(fromRow);
  });
}

export function bookReviews(bookId: string): Promise<ReviewView[]> {
  return safe([], async () => {
    const rows = await db!
      .select({ entry: entries, profile: reviewAuthor })
      .from(entries)
      .innerJoin(profiles, eq(entries.userId, profiles.id))
      .where(and(eq(entries.bookId, bookId), ne(entries.review, "")))
      .orderBy(desc(entries.updatedAt))
      .limit(50);
    return rows.map(fromRow);
  });
}

export type PublicProfile = PublicProfileRow & { entries: EntryRow[] };

export function profileByHandle(handle: string): Promise<PublicProfile | null> {
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) return Promise.resolve(null);
  return safe(null, async () => {
    const [profile] = await db!.select(PUBLIC_PROFILE).from(profiles).where(eq(profiles.handle, handle)).limit(1);
    if (!profile) return null;
    const shelf = await db!.query.entries.findMany({
      where: eq(entries.userId, profile.id),
      orderBy: desc(entries.updatedAt),
      limit: 500,
    });
    return { ...profile, entries: shelf };
  });
}

/** Leitores reais mais recentes que já registraram algum livro, com as 4 últimas capas. */
export function recentReaders(limit = 6) {
  return safe([], async () => {
    const people = await db!
      .select(PUBLIC_PROFILE)
      .from(profiles)
      .where(exists(db!.select({ one: sql`1` }).from(entries).where(eq(entries.userId, profiles.id))))
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
