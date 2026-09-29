"use server";

import { and, desc, eq, gte, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";

import { db } from "@/lib/db";
import { reviewsOf } from "@/lib/db/queries";
import {
  blocks,
  entries,
  followRequests,
  follows,
  notifications,
  profiles,
  reviewReactions,
  type NotificationType,
} from "@/lib/db/schema";
import { notify, relationship, unnotify } from "@/lib/db/social";
import type { ProfileCard } from "@/lib/db/types";
import { buildContent, type ProfileContent } from "@/lib/profiles";
import { currentProfileId } from "@/lib/session";

/**
 * Ações sociais: conteúdo de perfil privado, reações, notificações, pedidos, bloqueios e sugestões.
 * Mesmas regras de app/actions.ts: id sempre da sessão, entrada sempre validada.
 */

const Handle = z.string().regex(/^[a-z0-9_]{3,20}$/);
const BookId = z.string().regex(/^OL\d+W$/);

async function profileIdByHandle(handle: string) {
  const parsed = Handle.safeParse(handle);
  if (!parsed.success || !db) return null;
  const p = await db.query.profiles.findFirst({
    where: eq(profiles.handle, parsed.data),
    columns: { id: true, isPrivate: true, handle: true },
  });
  return p ?? null;
}

// ------------------------------------------------------------
// Perfil privado
// ------------------------------------------------------------

/**
 * Estante, diário e reviews de um perfil privado. Só para a própria pessoa e seguidores aprovados;
 * bloqueio em qualquer direção nega. Nada disso vai para o HTML público da página.
 */
export async function getPrivateProfileContent(
  handle: string,
): Promise<{ ok: true; content: ProfileContent } | { ok: false; reason: "login" | "not_follower" | "blocked" | "not_found" }> {
  const owner = await profileIdByHandle(handle);
  if (!owner || !db) return { ok: false, reason: "not_found" };
  const me = await currentProfileId();
  if (!me) return { ok: false, reason: "login" };

  if (me !== owner.id) {
    const rel = await relationship(me, owner.id);
    if (rel.blocking || rel.blockedBy) return { ok: false, reason: "blocked" };
    if (owner.isPrivate && !rel.following) return { ok: false, reason: "not_follower" };
  }

  const full = await db.query.profiles.findFirst({ where: eq(profiles.id, owner.id), columns: { favorites: true } });
  const shelf = await db.query.entries.findMany({ where: eq(entries.userId, owner.id), orderBy: desc(entries.updatedAt), limit: 500 });
  return { ok: true, content: buildContent(shelf, full?.favorites ?? [], await reviewsOf(owner.id)) };
}

// ------------------------------------------------------------
// Reações a reviews
// ------------------------------------------------------------

export type ReviewKey = `${string}:${string}`; // "@handle:OL123W"

/** Minhas reações para um lote de reviews (a página pede todas de uma vez). */
export async function getMyReactions(keys: string[]): Promise<Record<string, 1 | -1>> {
  const me = await currentProfileId();
  if (!me || !db || !keys.length) return {};
  const parsed = keys.slice(0, 100).map((k) => k.split(":")).filter(([h, b]) => Handle.safeParse(h).success && BookId.safeParse(b).success);
  if (!parsed.length) return {};
  const handles = [...new Set(parsed.map(([h]) => h))];
  const rows = await db
    .select({ handle: profiles.handle, bookId: reviewReactions.bookId, value: reviewReactions.value })
    .from(reviewReactions)
    .innerJoin(profiles, eq(reviewReactions.reviewUserId, profiles.id))
    .where(and(eq(reviewReactions.userId, me), inArray(profiles.handle, handles)));
  return Object.fromEntries(rows.map((r) => [`${r.handle}:${r.bookId}`, r.value as 1 | -1]));
}

/**
 * Curtir (1), não curtir (-1) ou tirar a reação (0). Não dá para reagir à própria review,
 * nem com bloqueio, nem a review de perfil privado que a pessoa não segue.
 */
export async function reactToReviewAction(
  handle: string,
  bookId: string,
  value: 1 | -1 | 0,
): Promise<{ ok: true; likes: number; dislikes: number } | { ok: false; error: "unauthenticated" | "not_found" | "self" | "forbidden" }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const author = await profileIdByHandle(handle);
  if (!author || !BookId.safeParse(bookId).success || ![1, -1, 0].includes(value)) return { ok: false, error: "not_found" };
  if (author.id === me) return { ok: false, error: "self" };

  const rel = await relationship(me, author.id);
  if (rel.blocking || rel.blockedBy || (author.isPrivate && !rel.following)) return { ok: false, error: "forbidden" };

  const review = await db.query.entries.findFirst({
    where: and(eq(entries.userId, author.id), eq(entries.bookId, bookId)),
    columns: { review: true, bookTitle: true },
  });
  if (!review?.review) return { ok: false, error: "not_found" };

  const where = and(eq(reviewReactions.userId, me), eq(reviewReactions.reviewUserId, author.id), eq(reviewReactions.bookId, bookId));
  if (value === 0) {
    await db.delete(reviewReactions).where(where);
  } else {
    await db
      .insert(reviewReactions)
      .values({ userId: me, reviewUserId: author.id, bookId, value })
      .onConflictDoUpdate({ target: [reviewReactions.userId, reviewReactions.reviewUserId, reviewReactions.bookId], set: { value } });
  }

  // Só a curtida vira notificação; "não curti" não avisa ninguém.
  if (value === 1) await notify({ recipientId: author.id, actorId: me, type: "review_like", bookId, bookTitle: review.bookTitle });
  else await unnotify({ recipientId: author.id, actorId: me, type: "review_like", bookId });

  const [counts] = await db
    .select({
      likes: sql<number>`count(*) filter (where ${reviewReactions.value} = 1)::int`,
      dislikes: sql<number>`count(*) filter (where ${reviewReactions.value} = -1)::int`,
    })
    .from(reviewReactions)
    .where(and(eq(reviewReactions.reviewUserId, author.id), eq(reviewReactions.bookId, bookId)));

  revalidatePath(`/livro/${bookId}`);
  revalidatePath("/");
  revalidatePath(`/u/${author.handle}`);
  return { ok: true, likes: counts?.likes ?? 0, dislikes: counts?.dislikes ?? 0 };
}

// ------------------------------------------------------------
// Notificações
// ------------------------------------------------------------

export type NotificationItem = {
  id: string;
  type: NotificationType;
  actor: ProfileCard;
  bookId: string | null;
  bookTitle: string | null;
  createdAt: number;
  read: boolean;
  /** Para pedidos de seguir: ainda está pendente? */
  pending: boolean;
};

export async function getNotifications(limit = 30): Promise<{ items: NotificationItem[]; unread: number } | null> {
  const me = await currentProfileId();
  if (!me || !db) return null;
  const rows = await db
    .select({
      n: notifications,
      actor: { handle: profiles.handle, name: profiles.name, tone: profiles.tone, isPrivate: profiles.isPrivate, founder: profiles.founder },
      pending: sql<boolean>`exists (select 1 from ${followRequests} fr where fr.requester_id = ${notifications.actorId} and fr.target_id = ${me})`,
    })
    .from(notifications)
    .innerJoin(profiles, eq(notifications.actorId, profiles.id))
    .where(eq(notifications.recipientId, me))
    .orderBy(desc(notifications.createdAt))
    .limit(Math.min(limit, 100));
  const unread = await getUnreadCount();
  return {
    unread,
    items: rows.map(({ n, actor, pending }) => ({
      id: n.id,
      type: n.type,
      actor,
      bookId: n.bookId,
      bookTitle: n.bookTitle,
      createdAt: n.createdAt.getTime(),
      read: n.readAt !== null,
      pending,
    })),
  };
}

/** Só o número, para o sininho (chamada leve, repetida de tempos em tempos). */
export async function getUnreadCount(): Promise<number> {
  const me = await currentProfileId();
  if (!me || !db) return 0;
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, me), isNull(notifications.readAt)));
  return row?.n ?? 0;
}

export async function markNotificationsRead() {
  const me = await currentProfileId();
  if (!me || !db) return;
  await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.recipientId, me), isNull(notifications.readAt)));
}

/** Aceitar ou recusar um pedido para seguir meu perfil privado. */
export async function respondFollowRequest(handle: string, accept: boolean): Promise<{ ok: boolean }> {
  const me = await currentProfileId();
  const requester = await profileIdByHandle(handle);
  if (!me || !db || !requester) return { ok: false };

  const deleted = await db
    .delete(followRequests)
    .where(and(eq(followRequests.requesterId, requester.id), eq(followRequests.targetId, me)))
    .returning();
  if (!deleted.length) return { ok: false };

  await unnotify({ recipientId: me, actorId: requester.id, type: "follow_request" });
  if (accept) {
    await db.insert(follows).values({ followerId: requester.id, followingId: me }).onConflictDoNothing();
    await notify({ recipientId: requester.id, actorId: me, type: "follow_accepted" });
    const mine = await db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { handle: true } });
    if (mine) revalidatePath(`/u/${mine.handle}`);
    revalidatePath(`/u/${requester.handle}`);
  }
  return { ok: true };
}

// ------------------------------------------------------------
// Bloqueio
// ------------------------------------------------------------

/**
 * Bloquear desfaz tudo entre as duas pessoas: follows e pedidos nas duas direções,
 * reações de uma nas reviews da outra e notificações trocadas.
 */
export async function setBlockAction(handle: string, block: boolean): Promise<{ ok: boolean }> {
  const me = await currentProfileId();
  const other = await profileIdByHandle(handle);
  if (!me || !db || !other || other.id === me) return { ok: false };

  if (!block) {
    await db.delete(blocks).where(and(eq(blocks.blockerId, me), eq(blocks.blockedId, other.id)));
  } else {
    const pair = (a: AnyPgColumn, b: AnyPgColumn) =>
      or(and(eq(a, me), eq(b, other.id)), and(eq(a, other.id), eq(b, me)));
    await db.insert(blocks).values({ blockerId: me, blockedId: other.id }).onConflictDoNothing();
    await db.delete(follows).where(pair(follows.followerId, follows.followingId));
    await db.delete(followRequests).where(pair(followRequests.requesterId, followRequests.targetId));
    await db.delete(reviewReactions).where(pair(reviewReactions.userId, reviewReactions.reviewUserId));
    await db.delete(notifications).where(pair(notifications.recipientId, notifications.actorId));
  }

  const mine = await db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { handle: true } });
  revalidatePath(`/u/${other.handle}`);
  if (mine) revalidatePath(`/u/${mine.handle}`);
  return { ok: true };
}

/** Quem eu bloqueei (para a lista em Configurações). */
export async function getBlockedReaders(): Promise<ProfileCard[]> {
  const me = await currentProfileId();
  if (!me || !db) return [];
  return db
    .select({ handle: profiles.handle, name: profiles.name, tone: profiles.tone, isPrivate: profiles.isPrivate, founder: profiles.founder })
    .from(blocks)
    .innerJoin(profiles, eq(blocks.blockedId, profiles.id))
    .where(eq(blocks.blockerId, me))
    .orderBy(desc(blocks.createdAt));
}

// ------------------------------------------------------------
// Sugestões de leitores
// ------------------------------------------------------------

export type SuggestedReader = ProfileCard & { reason: string; score: number };

/**
 * Leitores para seguir, por proximidade de gosto e de rede (não coletamos localização):
 *   - gosto: quantos livros que eu amei (4+ estrelas ou curtidos) a pessoa também amou;
 *   - rede: quantas pessoas que eu sigo seguem ela (amigos de amigos).
 * Sem sinais (conta nova ou visitante), sugere os leitores mais seguidos.
 */
export async function getSuggestedReaders(limit = 6): Promise<SuggestedReader[]> {
  if (!db) return [];
  const me = await currentProfileId();
  const card = { handle: profiles.handle, name: profiles.name, tone: profiles.tone, isPrivate: profiles.isPrivate, founder: profiles.founder };

  // Quem não pode aparecer: eu, quem já sigo ou pedi, e bloqueios nas duas direções.
  const excluded = new Set<string>();
  if (me) {
    excluded.add(me);
    const [f, r, b] = await Promise.all([
      db.select({ id: follows.followingId }).from(follows).where(eq(follows.followerId, me)),
      db.select({ id: followRequests.targetId }).from(followRequests).where(eq(followRequests.requesterId, me)),
      db.select({ a: blocks.blockerId, b: blocks.blockedId }).from(blocks).where(or(eq(blocks.blockerId, me), eq(blocks.blockedId, me))),
    ]);
    f.forEach((x) => excluded.add(x.id));
    r.forEach((x) => excluded.add(x.id));
    b.forEach((x) => (excluded.add(x.a), excluded.add(x.b)));
  }
  const notExcluded = excluded.size ? notInArray(profiles.id, [...excluded]) : undefined;

  const scores = new Map<string, { taste: number; network: number; via?: string }>();
  if (me) {
    const loved = db
      .select({ id: entries.bookId })
      .from(entries)
      .where(and(eq(entries.userId, me), or(eq(entries.liked, true), gte(entries.rating, "4"))));
    const [taste, network] = await Promise.all([
      db
        .select({ id: entries.userId, n: sql<number>`count(*)::int` })
        .from(entries)
        .where(and(inArray(entries.bookId, loved), or(eq(entries.liked, true), gte(entries.rating, "4"))))
        .groupBy(entries.userId),
      db
        .select({ id: follows.followingId, n: sql<number>`count(*)::int`, via: sql<string>`min(p.name)` })
        .from(follows)
        .innerJoin(sql`${follows} as f1`, sql`f1.following_id = ${follows.followerId} and f1.follower_id = ${me}`)
        .innerJoin(sql`${profiles} as p`, sql`p.id = ${follows.followerId}`)
        .groupBy(follows.followingId),
    ]);
    taste.forEach((t) => scores.set(t.id, { taste: t.n, network: 0 }));
    network.forEach((n) => scores.set(n.id, { ...(scores.get(n.id) ?? { taste: 0 }), network: n.n, via: n.via }));
  }

  const candidates = [...scores.entries()].filter(([id]) => !excluded.has(id));
  const people = candidates.length
    ? await db.select({ id: profiles.id, ...card }).from(profiles).where(inArray(profiles.id, candidates.map(([id]) => id)))
    : [];

  const ranked: SuggestedReader[] = people
    .map((p) => {
      const s = scores.get(p.id)!;
      const reason =
        s.taste >= s.network && s.taste > 0
          ? `Amou ${s.taste} ${s.taste === 1 ? "livro" : "livros"} que você também amou`
          : s.network === 1
            ? `Seguido por ${s.via}`
            : `Seguido por ${s.via} e mais ${s.network - 1}`;
      const { id: _id, ...rest } = p;
      void _id;
      return { ...rest, reason, score: s.taste * 2 + s.network * 1.5 };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  if (ranked.length >= limit) return ranked;

  // Completa com os mais seguidos (e que já registraram algum livro).
  const taken = new Set(ranked.map((r) => r.handle));
  const popular = await db
    .select({ ...card, followers: sql<number>`(select count(*)::int from ${follows} x where x.following_id = ${profiles.id})` })
    .from(profiles)
    .where(and(notExcluded, sql`exists (select 1 from ${entries} e where e.user_id = ${profiles.id})`))
    .orderBy(desc(sql`(select count(*) from ${follows} x where x.following_id = ${profiles.id})`), desc(profiles.createdAt))
    .limit(limit * 2);
  for (const p of popular) {
    if (ranked.length >= limit) break;
    if (taken.has(p.handle)) continue;
    const { followers, ...rest } = p;
    ranked.push({ ...rest, reason: followers > 0 ? `${followers} ${followers === 1 ? "seguidor" : "seguidores"}` : "Leitor novo na Estante", score: 0 });
  }
  return ranked;
}
