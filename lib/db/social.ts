import "server-only";

import { and, eq, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { blocks, followRequests, follows, notifications, type NotificationType } from "@/lib/db/schema";

/** Como duas pessoas se relacionam. Base de toda regra de privacidade e bloqueio. */
export type Relationship = {
  following: boolean;
  requested: boolean;
  /** Eu bloqueei a outra pessoa. */
  blocking: boolean;
  /** A outra pessoa me bloqueou. */
  blockedBy: boolean;
};

export async function relationship(me: string, other: string): Promise<Relationship> {
  if (!db) return { following: false, requested: false, blocking: false, blockedBy: false };
  const [f, r, b] = await Promise.all([
    db.select({ x: follows.followerId }).from(follows).where(and(eq(follows.followerId, me), eq(follows.followingId, other))).limit(1),
    db
      .select({ x: followRequests.requesterId })
      .from(followRequests)
      .where(and(eq(followRequests.requesterId, me), eq(followRequests.targetId, other)))
      .limit(1),
    db
      .select({ blocker: blocks.blockerId })
      .from(blocks)
      .where(
        or(
          and(eq(blocks.blockerId, me), eq(blocks.blockedId, other)),
          and(eq(blocks.blockerId, other), eq(blocks.blockedId, me)),
        ),
      ),
  ]);
  return {
    following: f.length > 0,
    requested: r.length > 0,
    blocking: b.some((x) => x.blocker === me),
    blockedBy: b.some((x) => x.blocker === other),
  };
}

/** Existe bloqueio em qualquer direção? */
export async function isBlockedEither(a: string, b: string) {
  const r = await relationship(a, b);
  return r.blocking || r.blockedBy;
}

/**
 * Cria (ou renova) uma notificação. Curtir e descurtir várias vezes não empilha avisos:
 * a notificação é única por (destinatário, autor, tipo, livro) e só volta a ficar "não lida".
 * Nunca notifica quem bloqueou o autor.
 */
export async function notify(n: {
  recipientId: string;
  actorId: string;
  type: NotificationType;
  bookId?: string | null;
  bookTitle?: string | null;
}) {
  if (!db || n.recipientId === n.actorId) return;
  if (await isBlockedEither(n.recipientId, n.actorId)) return;
  await db
    .insert(notifications)
    .values({ ...n, bookId: n.bookId ?? null, bookTitle: n.bookTitle ?? null })
    .onConflictDoUpdate({
      target: [notifications.recipientId, notifications.actorId, notifications.type, notifications.bookId],
      set: { createdAt: new Date(), readAt: null, bookTitle: n.bookTitle ?? null },
    });
}

/** Remove uma notificação que deixou de fazer sentido (deixou de seguir, tirou a curtida). */
export async function unnotify(n: { recipientId: string; actorId: string; type: NotificationType; bookId?: string | null }) {
  if (!db) return;
  await db
    .delete(notifications)
    .where(
      and(
        eq(notifications.recipientId, n.recipientId),
        eq(notifications.actorId, n.actorId),
        eq(notifications.type, n.type),
        n.bookId ? eq(notifications.bookId, n.bookId) : undefined,
      ),
    );
}
