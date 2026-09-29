"use server";

import { and, desc, eq, gte, inArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { blocks, entries, followRequests, follows, passwordLogins, profiles, RESERVED_HANDLES } from "@/lib/db/schema";
import { notify, relationship, unnotify } from "@/lib/db/social";
import { currentProfileId } from "@/lib/session";
import { toProfile, type FeedItem, type Profile, type ShelfEntry } from "@/lib/db/types";
import type { FollowedPick } from "@/lib/recommend";

/**
 * Server actions da estante. Toda escrita:
 *   1. pega o id do perfil da sessão (nunca de um parâmetro vindo do navegador);
 *   2. valida a entrada com zod, com os mesmos limites das constraints do banco.
 * Server actions são endpoints públicos: estas duas regras são o que impede alguém
 * de escrever na estante de outra pessoa.
 */

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

export type MyAccount = {
  profile: Profile;
  shelf: ShelfEntry[];
  /** Handles de quem a pessoa segue, pediu para seguir e bloqueou. */
  following: string[];
  requested: string[];
  blocked: string[];
  /** Tem login por e-mail e senha (mostra "Mudar senha"). */
  hasPassword: boolean;
};

/** Tudo que o navegador precisa saber sobre quem está logado, ou null se não houver sessão. */
export async function getMyAccount(): Promise<MyAccount | null> {
  const id = await currentProfileId();
  if (!id || !db) return null;
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, id) });
  if (!profile) return null;
  const rows = await db.query.entries.findMany({
    where: eq(entries.userId, id),
    orderBy: (e, { desc }) => desc(e.updatedAt),
  });
  const [followed, requested, blocked, password] = await Promise.all([
    db.select({ handle: profiles.handle }).from(follows).innerJoin(profiles, eq(follows.followingId, profiles.id)).where(eq(follows.followerId, id)),
    db
      .select({ handle: profiles.handle })
      .from(followRequests)
      .innerJoin(profiles, eq(followRequests.targetId, profiles.id))
      .where(eq(followRequests.requesterId, id)),
    db.select({ handle: profiles.handle }).from(blocks).innerJoin(profiles, eq(blocks.blockedId, profiles.id)).where(eq(blocks.blockerId, id)),
    db.select({ email: passwordLogins.email }).from(passwordLogins).where(eq(passwordLogins.profileId, id)).limit(1),
  ]);
  return {
    profile: toProfile(profile),
    shelf: rows.map(toShelfEntry),
    following: followed.map((f) => f.handle),
    requested: requested.map((r) => r.handle),
    blocked: blocked.map((b) => b.handle),
    hasPassword: password.length > 0,
  };
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
  const before = await db.query.entries.findFirst({
    where: and(eq(entries.userId, id), eq(entries.bookId, e.book.id)),
    columns: { status: true },
  });

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

  if (e.status === "lido" && before?.status !== "lido") await notifyFriendsWhoWantIt(id, e.book.id, e.book.title);
  await revalidateAfterShelfChange(id, e.book.id);
  return { ok: true };
}

/** Terminou um livro: avisa quem segue a pessoa e tem esse livro em "Quero ler". */
async function notifyFriendsWhoWantIt(profileId: string, bookId: string, bookTitle: string) {
  if (!db) return;
  const wanting = await db
    .select({ id: entries.userId })
    .from(entries)
    .innerJoin(follows, and(eq(follows.followerId, entries.userId), eq(follows.followingId, profileId)))
    .where(and(eq(entries.bookId, bookId), eq(entries.status, "quero-ler")))
    .limit(200);
  await Promise.all(wanting.map((w) => notify({ recipientId: w.id, actorId: profileId, type: "friend_finished", bookId, bookTitle })));
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
): Promise<
  | { ok: true; profile: Profile }
  | { ok: false; error: "unauthenticated" | "invalid" | "handle_taken" | "handle_unavailable" | "name_taken" | "unavailable" }
> {
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
    const cause = (err as { cause?: { code?: string; constraint_name?: string } }).cause;
    const code = cause?.code ?? (err as { code?: string }).code;
    if (code === "23505") return { ok: false, error: cause?.constraint_name === "profiles_name_unique" ? "name_taken" : "handle_taken" };
    if (code === "23514") return { ok: false, error: "handle_unavailable" };
    return { ok: false, error: "unavailable" };
  }
}

// ------------------------------------------------------------
// Seguir
// ------------------------------------------------------------

const Handle = z.string().regex(/^[a-z0-9_]{3,20}$/);

/**
 * Segue (ou deixa de seguir) alguém pelo @. Perfil privado recebe um pedido em vez de um follow.
 * Deixar de seguir também cancela um pedido pendente. Bloqueio em qualquer direção impede seguir.
 */
export async function setFollowAction(
  handle: string,
  follow: boolean,
): Promise<
  | { ok: true; state: "following" | "requested" | "none" }
  | { ok: false; error: "unauthenticated" | "not_found" | "self" | "blocked" | "unavailable" }
> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = Handle.safeParse(handle);
  if (!parsed.success) return { ok: false, error: "not_found" };

  const target = await db.query.profiles.findFirst({
    where: eq(profiles.handle, parsed.data),
    columns: { id: true, isPrivate: true },
  });
  if (!target) return { ok: false, error: "not_found" };
  if (target.id === me) return { ok: false, error: "self" };

  let state: "following" | "requested" | "none" = "none";
  try {
    if (follow) {
      const rel = await relationship(me, target.id);
      if (rel.blocking || rel.blockedBy) return { ok: false, error: "blocked" };
      if (rel.following) {
        state = "following";
      } else if (target.isPrivate) {
        await db.insert(followRequests).values({ requesterId: me, targetId: target.id }).onConflictDoNothing();
        await notify({ recipientId: target.id, actorId: me, type: "follow_request" });
        state = "requested";
      } else {
        await db.insert(follows).values({ followerId: me, followingId: target.id }).onConflictDoNothing();
        await notify({ recipientId: target.id, actorId: me, type: "follow" });
        state = "following";
      }
    } else {
      await db.delete(follows).where(and(eq(follows.followerId, me), eq(follows.followingId, target.id)));
      await db.delete(followRequests).where(and(eq(followRequests.requesterId, me), eq(followRequests.targetId, target.id)));
      await unnotify({ recipientId: target.id, actorId: me, type: "follow" });
      await unnotify({ recipientId: target.id, actorId: me, type: "follow_request" });
    }
  } catch {
    return { ok: false, error: "unavailable" };
  }

  // Contagem de seguidores do perfil seguido e de "seguindo" no perfil de quem seguiu.
  revalidatePath(`/u/${parsed.data}`);
  const mine = await db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { handle: true } });
  if (mine) revalidatePath(`/u/${mine.handle}`);
  return { ok: true, state };
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

/**
 * Livros que quem a pessoa segue curtiu ou avaliou com 4+ estrelas, agrupados, com quantas
 * pessoas gostaram de cada um. Alimenta as recomendações da home. Só o necessário para a capa.
 */
export async function getFollowingPicks(): Promise<FollowedPick[]> {
  const me = await currentProfileId();
  if (!me || !db) return [];
  const followed = db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, me));
  return db
    .select({
      id: entries.bookId,
      title: sql<string>`max(${entries.bookTitle})`,
      author: sql<string>`max(${entries.bookAuthor})`,
      coverId: sql<number | null>`max(${entries.bookCoverId})`,
      color: sql<string>`max(${entries.bookColor})`,
      year: sql<number | null>`max(${entries.bookYear})`,
      pages: sql<number | null>`max(${entries.bookPages})`,
      fans: sql<number>`count(*)::int`,
    })
    .from(entries)
    .where(and(inArray(entries.userId, followed), or(eq(entries.liked, true), gte(entries.rating, "4"))))
    .groupBy(entries.bookId)
    .orderBy(desc(sql`count(*)`))
    .limit(40);
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
