"use server";

import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { entries, follows, profiles, RESERVED_HANDLES } from "@/lib/db/schema";
import { toProfile, type FeedItem, type Profile, type ShelfEntry } from "@/lib/db/types";

/**
 * Server actions da estante. Toda escrita:
 *   1. pega o id do perfil da sessão (nunca de um parâmetro vindo do navegador);
 *   2. valida a entrada com zod, com os mesmos limites das constraints do banco.
 * Server actions são endpoints públicos: estas duas regras são o que impede alguém
 * de escrever na estante de outra pessoa.
 */

async function currentProfileId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

// ------------------------------------------------------------
// Validação
// ------------------------------------------------------------

const Book = z.object({
  id: z.string().regex(/^OL\d+W$/),
  title: z.string().trim().min(1).max(300),
  author: z.string().max(200),
  coverId: z.number().int().positive().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).transform((c) => c.toLowerCase()),
  year: z.number().int().min(-3000).max(3000).nullable(),
  pages: z.number().int().positive().max(100000).nullable(),
});

const Entry = z.object({
  book: Book,
  status: z.enum(["quero-ler", "lendo", "lido"]).nullable(),
  rating: z
    .number()
    .min(0.5)
    .max(5)
    .refine((r) => Number.isInteger(r * 2), "De meia em meia estrela")
    .nullable(),
  liked: z.boolean(),
  review: z.string().max(600),
  finishedOn: z.iso.date().nullable(),
  updatedAt: z.number().int().positive(),
});

export type EntryInput = z.input<typeof Entry>;

function toRow(profileId: string, e: z.output<typeof Entry>) {
  return {
    userId: profileId,
    bookId: e.book.id,
    bookTitle: e.book.title,
    bookAuthor: e.book.author,
    bookCoverId: e.book.coverId,
    bookColor: e.book.color,
    bookYear: e.book.year,
    bookPages: e.book.pages,
    status: e.status,
    rating: e.rating === null ? null : e.rating.toFixed(1),
    liked: e.liked,
    review: e.review.trim(),
    finishedOn: e.finishedOn,
    // O relógio do navegador pode estar adiantado: nunca aceitar data no futuro.
    updatedAt: new Date(Math.min(e.updatedAt, Date.now())),
  };
}

const isEmpty = (e: z.output<typeof Entry>) => !e.status && !e.rating && !e.liked && !e.review.trim();

// ------------------------------------------------------------
// Conta
// ------------------------------------------------------------

/** Perfil, estante e quem a pessoa segue (handles), ou null se não houver sessão. */
export async function getMyAccount(): Promise<{ profile: Profile; shelf: ShelfEntry[]; following: string[] } | null> {
  const id = await currentProfileId();
  if (!id || !db) return null;
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, id) });
  if (!profile) return null;
  const rows = await db.query.entries.findMany({
    where: eq(entries.userId, id),
    orderBy: (e, { desc }) => desc(e.updatedAt),
  });
  const followed = await db
    .select({ handle: profiles.handle })
    .from(follows)
    .innerJoin(profiles, eq(follows.followingId, profiles.id))
    .where(eq(follows.followerId, id));
  return { profile: toProfile(profile), shelf: rows.map(toShelfEntry), following: followed.map((f) => f.handle) };
}

function toShelfEntry(r: typeof entries.$inferSelect): ShelfEntry {
  return {
    book: {
      id: r.bookId,
      title: r.bookTitle,
      author: r.bookAuthor,
      coverId: r.bookCoverId,
      color: r.bookColor,
      year: r.bookYear,
      pages: r.bookPages,
    },
    status: r.status,
    rating: r.rating === null ? null : Number(r.rating),
    liked: r.liked,
    review: r.review,
    finishedOn: r.finishedOn,
    updatedAt: r.updatedAt.getTime(),
  };
}

// ------------------------------------------------------------
// Estante
// ------------------------------------------------------------

type Result = { ok: true } | { ok: false; error: "unauthenticated" | "invalid" | "unavailable" };

/** Salva (ou remove, se ficou vazio) um livro na estante de quem está logado. */
export async function saveEntryAction(input: EntryInput): Promise<Result> {
  const id = await currentProfileId();
  if (!id || !db) return { ok: false, error: "unauthenticated" };
  const parsed = Entry.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const e = parsed.data;

  try {
    if (isEmpty(e)) {
      await db.delete(entries).where(and(eq(entries.userId, id), eq(entries.bookId, e.book.id)));
    } else {
      const row = toRow(id, e);
      await db.insert(entries).values(row).onConflictDoUpdate({
        target: [entries.userId, entries.bookId],
        set: { ...row, updatedAt: sql`now()` },
      });
    }
  } catch {
    return { ok: false, error: "unavailable" };
  }

  await revalidateAfterShelfChange(id, e.book.id);
  return { ok: true };
}

/**
 * Primeiro login: sobe o que estava no navegador. Em conflito, só substitui
 * o que está no banco se a versão do navegador for mais recente.
 */
export async function importEntriesAction(input: EntryInput[]): Promise<{ ok: true; imported: number } | { ok: false }> {
  const id = await currentProfileId();
  if (!id || !db) return { ok: false };
  const parsed = z.array(Entry).max(1000).safeParse(input);
  if (!parsed.success) return { ok: false };

  const rows = parsed.data.filter((e) => !isEmpty(e)).map((e) => toRow(id, e));
  if (!rows.length) return { ok: true, imported: 0 };

  try {
    const done = await db
      .insert(entries)
      .values(rows)
      .onConflictDoUpdate({
        target: [entries.userId, entries.bookId],
        set: Object.fromEntries(
          [
            "bookTitle", "bookAuthor", "bookCoverId", "bookColor", "bookYear", "bookPages",
            "status", "rating", "liked", "review", "finishedOn", "updatedAt",
          ].map((k) => [k, sql.raw(`excluded.${toSnake(k)}`)]),
        ),
        setWhere: sql`${entries.updatedAt} < excluded.updated_at`,
      })
      .returning({ bookId: entries.bookId });
    await revalidateAfterShelfChange(id);
    return { ok: true, imported: done.length };
  } catch {
    return { ok: false };
  }
}

const toSnake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

// ------------------------------------------------------------
// Perfil
// ------------------------------------------------------------

const ProfileDraft = z.object({
  name: z.string().trim().min(1).max(60),
  handle: z
    .string()
    .regex(/^[a-z0-9_]{3,20}$/)
    .refine((h) => !(RESERVED_HANDLES as readonly string[]).includes(h)),
  bio: z.string().trim().max(200),
  goal: z.number().int().min(1).max(365),
  tone: z.enum(["anil", "ameixa", "musgo", "ambar"]),
  favorites: z.array(z.string().regex(/^OL\d+W$/)).max(4),
});

export type ProfileDraftInput = z.input<typeof ProfileDraft>;

export async function updateProfileAction(
  input: ProfileDraftInput,
): Promise<{ ok: true; profile: Profile } | { ok: false; error: "unauthenticated" | "invalid" | "handle_taken" | "handle_unavailable" | "unavailable" }> {
  const id = await currentProfileId();
  if (!id || !db) return { ok: false, error: "unauthenticated" };

  const parsed = ProfileDraft.safeParse(input);
  if (!parsed.success) {
    const handleIssue = parsed.error.issues.some((i) => i.path[0] === "handle");
    return { ok: false, error: handleIssue ? "handle_unavailable" : "invalid" };
  }

  const before = await db.query.profiles.findFirst({ where: eq(profiles.id, id), columns: { handle: true } });
  try {
    const [updated] = await db.update(profiles).set(parsed.data).where(eq(profiles.id, id)).returning();
    if (!updated) return { ok: false, error: "unauthenticated" };
    [before?.handle, updated.handle].forEach((h) => h && revalidatePath(`/u/${h}`));
    revalidatePath("/leitores");
    return { ok: true, profile: toProfile(updated) };
  } catch (err) {
    const code = (err as { cause?: { code?: string }; code?: string }).cause?.code ?? (err as { code?: string }).code;
    if (code === "23505") return { ok: false, error: "handle_taken" };
    if (code === "23514") return { ok: false, error: "handle_unavailable" };
    return { ok: false, error: "unavailable" };
  }
}

// ------------------------------------------------------------
// Seguir
// ------------------------------------------------------------

const Handle = z.string().regex(/^[a-z0-9_]{3,20}$/);

/** Segue (ou deixa de seguir) alguém pelo @. Seguir a si mesmo é recusado aqui e no banco. */
export async function setFollowAction(
  handle: string,
  follow: boolean,
): Promise<{ ok: true } | { ok: false; error: "unauthenticated" | "not_found" | "self" | "unavailable" }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = Handle.safeParse(handle);
  if (!parsed.success) return { ok: false, error: "not_found" };

  const target = await db.query.profiles.findFirst({ where: eq(profiles.handle, parsed.data), columns: { id: true } });
  if (!target) return { ok: false, error: "not_found" };
  if (target.id === me) return { ok: false, error: "self" };

  try {
    if (follow) {
      await db.insert(follows).values({ followerId: me, followingId: target.id }).onConflictDoNothing();
    } else {
      await db.delete(follows).where(and(eq(follows.followerId, me), eq(follows.followingId, target.id)));
    }
  } catch {
    return { ok: false, error: "unavailable" };
  }

  // Contagem de seguidores do perfil seguido e de "seguindo" no perfil de quem seguiu.
  revalidatePath(`/u/${parsed.data}`);
  const mine = await db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { handle: true } });
  if (mine) revalidatePath(`/u/${mine.handle}`);
  return { ok: true };
}

/** Atividade recente de quem a pessoa segue: leituras, notas e reviews, das mais novas para as mais antigas. */
export async function getFollowingFeed(): Promise<FeedItem[] | null> {
  const me = await currentProfileId();
  if (!me || !db) return null;
  const followed = db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, me));
  const rows = await db
    .select({
      entry: entries,
      handle: profiles.handle,
      name: profiles.name,
      tone: profiles.tone,
    })
    .from(entries)
    .innerJoin(profiles, eq(entries.userId, profiles.id))
    .where(inArray(entries.userId, followed))
    .orderBy(desc(entries.updatedAt))
    .limit(60);
  return rows.map(({ entry, handle, name, tone }) => ({
    user: { handle, name, tone },
    ...toShelfEntry(entry),
  }));
}

// ------------------------------------------------------------
// Cache
// ------------------------------------------------------------

/**
 * Páginas públicas ficam em cache (ISR). Quando alguém altera a estante,
 * atualizamos a página do livro, o perfil dessa pessoa, a home e os leitores.
 */
async function revalidateAfterShelfChange(profileId: string, bookId?: string) {
  if (bookId) revalidatePath(`/livro/${bookId}`);
  revalidatePath("/");
  revalidatePath("/leitores");
  const p = await db?.query.profiles.findFirst({ where: eq(profiles.id, profileId), columns: { handle: true } });
  if (p) revalidatePath(`/u/${p.handle}`);
}
