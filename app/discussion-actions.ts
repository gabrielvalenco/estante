"use server";

import { and, asc, count, desc, eq, gte, inArray, notInArray, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { blocks, discussionPosts, discussionReports, discussionThreads, entries, profiles, readingProgress } from "@/lib/db/schema";
import { notify } from "@/lib/db/social";
import { limitValue, PLANS, planOf } from "@/lib/plans";
import { currentProfileId } from "@/lib/session";

/**
 * Discussões por livro, com proteção de spoiler pelo marcador de página:
 *   - cada tópico e cada resposta dizem até que página falam (0 = sem spoiler);
 *   - quem está numa página anterior recebe só { spoiler: true, page }, sem título nem texto;
 *   - quem já leu o livro (status "lido") vê tudo; quem pede "mostrar spoilers" também.
 * O texto escondido nunca sai do servidor, então não dá para ler pelo código da página.
 */

const HIDE_AFTER_REPORTS = 3;
const POSTS_PER_HOUR = 30;

// ------------------------------------------------------------
// Tipos que vão para a tela
// ------------------------------------------------------------

export type Author = { handle: string; name: string; tone: string; avatarUrl: string | null; founder: boolean };

export type ThreadView = {
  id: string;
  bookId: string;
  page: number;
  /** true: o tópico fala de uma página que a pessoa ainda não leu; título e texto vêm null. */
  spoiler: boolean;
  title: string | null;
  body: string | null;
  author: Author;
  replyCount: number;
  mine: boolean;
  /** Escondido pela moderação (só a autora ainda vê). */
  hidden: boolean;
  createdAt: number;
  lastActivityAt: number;
};

export type PostView = {
  id: string;
  page: number;
  spoiler: boolean;
  body: string | null;
  author: Author;
  mine: boolean;
  hidden: boolean;
  createdAt: number;
};

export type Viewer = {
  loggedIn: boolean;
  /** Até onde a pessoa leu. null = leu tudo (ou pediu para ver os spoilers). */
  page: number | null;
  finished: boolean;
  revealed: boolean;
};

export type ThreadUsage = { planName: string; threadsThisMonth: number; threadsPerMonthLimit: number | null };

export type DiscussionError = "unauthenticated" | "invalid" | "not_found" | "blocked" | "limit_threads" | "rate_limited" | "unavailable";

const author = {
  handle: profiles.handle,
  name: profiles.name,
  tone: profiles.tone,
  avatarUrl: profiles.avatarUrl,
  founder: profiles.founder,
};

// ------------------------------------------------------------
// Quem está lendo, e até onde
// ------------------------------------------------------------

async function viewerOf(me: string | null, bookId: string, reveal: boolean): Promise<Viewer> {
  if (!me || !db) return { loggedIn: false, page: reveal ? null : 0, finished: false, revealed: reveal };
  const [entry, progress] = await Promise.all([
    db.query.entries.findFirst({ where: and(eq(entries.userId, me), eq(entries.bookId, bookId)), columns: { status: true } }),
    db.query.readingProgress.findFirst({ where: and(eq(readingProgress.userId, me), eq(readingProgress.bookId, bookId)), columns: { page: true } }),
  ]);
  const finished = entry?.status === "lido";
  return { loggedIn: true, page: finished || reveal ? null : (progress?.page ?? 0), finished, revealed: reveal && !finished };
}

const visible = (viewer: Viewer, page: number, mine: boolean) => mine || viewer.page === null || page <= viewer.page;

/** Autores com bloqueio em qualquer direção: somem da lista de quem está logado. */
function blockedWith(me: string) {
  return db!
    .select({ id: sql<string>`case when ${blocks.blockerId} = ${me} then ${blocks.blockedId} else ${blocks.blockerId} end` })
    .from(blocks)
    .where(or(eq(blocks.blockerId, me), eq(blocks.blockedId, me)));
}

async function threadUsage(me: string): Promise<ThreadUsage> {
  const plan = PLANS[await planOf(me)];
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [{ n }] = await db!
    .select({ n: count() })
    .from(discussionThreads)
    .where(and(eq(discussionThreads.authorId, me), gte(discussionThreads.createdAt, monthStart)));
  return { planName: plan.name, threadsThisMonth: n, threadsPerMonthLimit: limitValue(plan.limits.threadsPerMonth) };
}

function toThread(r: typeof discussionThreads.$inferSelect & { author: Author }, me: string | null, viewer: Viewer): ThreadView {
  const mine = r.authorId === me;
  const show = visible(viewer, r.page, mine);
  return {
    id: r.id,
    bookId: r.bookId,
    page: r.page,
    spoiler: !show,
    title: show ? r.title : null,
    body: show ? r.body : null,
    author: r.author,
    replyCount: r.replyCount,
    mine,
    hidden: r.hidden,
    createdAt: r.createdAt.getTime(),
    lastActivityAt: r.lastActivityAt.getTime(),
  };
}

// ------------------------------------------------------------
// Leitura
// ------------------------------------------------------------

const BookId = z.string().regex(/^OL\d+W$/);
const Id = z.uuid();

/** Tópicos de um livro, do mais movimentado para o menos. */
export async function listThreads(
  bookId: string,
  reveal = false,
): Promise<{ threads: ThreadView[]; viewer: Viewer; usage: ThreadUsage | null } | null> {
  if (!db || !BookId.safeParse(bookId).success) return null;
  const me = await currentProfileId();
  const viewer = await viewerOf(me, bookId, reveal);
  const rows = await db
    .select({ thread: discussionThreads, author })
    .from(discussionThreads)
    .innerJoin(profiles, eq(discussionThreads.authorId, profiles.id))
    .where(
      and(
        eq(discussionThreads.bookId, bookId),
        me ? or(eq(discussionThreads.hidden, false), eq(discussionThreads.authorId, me)) : eq(discussionThreads.hidden, false),
        me ? notInArray(discussionThreads.authorId, blockedWith(me)) : undefined,
      ),
    )
    .orderBy(desc(discussionThreads.lastActivityAt))
    .limit(100);
  return {
    threads: rows.map((r) => toThread({ ...r.thread, author: r.author }, me, viewer)),
    viewer,
    usage: me ? await threadUsage(me) : null,
  };
}

/** Um tópico com as respostas, em ordem de conversa. */
export async function getThread(
  threadId: string,
  reveal = false,
): Promise<{ thread: ThreadView; posts: PostView[]; viewer: Viewer; book: { id: string; title: string } } | null> {
  if (!db || !Id.safeParse(threadId).success) return null;
  const me = await currentProfileId();
  const [row] = await db
    .select({ thread: discussionThreads, author })
    .from(discussionThreads)
    .innerJoin(profiles, eq(discussionThreads.authorId, profiles.id))
    .where(eq(discussionThreads.id, threadId))
    .limit(1);
  if (!row || (row.thread.hidden && row.thread.authorId !== me)) return null;

  const blocked = me ? (await blockedWith(me)).map((b) => b.id) : [];
  if (blocked.includes(row.thread.authorId)) return null;

  const viewer = await viewerOf(me, row.thread.bookId, reveal);
  const posts = await db
    .select({ post: discussionPosts, author })
    .from(discussionPosts)
    .innerJoin(profiles, eq(discussionPosts.authorId, profiles.id))
    .where(
      and(
        eq(discussionPosts.threadId, threadId),
        me ? or(eq(discussionPosts.hidden, false), eq(discussionPosts.authorId, me)) : eq(discussionPosts.hidden, false),
        blocked.length ? notInArray(discussionPosts.authorId, blocked) : undefined,
      ),
    )
    .orderBy(asc(discussionPosts.createdAt))
    .limit(500);

  return {
    thread: toThread({ ...row.thread, author: row.author }, me, viewer),
    posts: posts.map(({ post: p, author: a }) => {
      const mine = p.authorId === me;
      const show = visible(viewer, p.page, mine);
      return { id: p.id, page: p.page, spoiler: !show, body: show ? p.body : null, author: a, mine, hidden: p.hidden, createdAt: p.createdAt.getTime() };
    }),
    viewer,
    book: { id: row.thread.bookId, title: row.thread.bookTitle },
  };
}

// ------------------------------------------------------------
// Escrita
// ------------------------------------------------------------

const Page = z.number().int().min(0).max(100000);
const NewThread = z.object({
  book: z.object({ id: BookId, title: z.string().trim().min(1).max(300) }),
  title: z.string().trim().min(3).max(120),
  body: z.string().trim().min(1).max(4000),
  page: Page,
});
const NewPost = z.object({ body: z.string().trim().min(1).max(4000), page: Page });
const ThreadPatch = z.object({ title: z.string().trim().min(3).max(120).optional(), body: z.string().trim().min(1).max(4000).optional(), page: Page.optional() });
const PostPatch = z.object({ body: z.string().trim().min(1).max(4000).optional(), page: Page.optional() });

async function tooFast(me: string) {
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [[t], [p]] = await Promise.all([
    db!.select({ n: count() }).from(discussionThreads).where(and(eq(discussionThreads.authorId, me), gte(discussionThreads.createdAt, hourAgo))),
    db!.select({ n: count() }).from(discussionPosts).where(and(eq(discussionPosts.authorId, me), gte(discussionPosts.createdAt, hourAgo))),
  ]);
  return t.n + p.n >= POSTS_PER_HOUR;
}

export async function createThreadAction(
  input: z.input<typeof NewThread>,
): Promise<{ ok: true; thread: ThreadView; usage: ThreadUsage } | { ok: false; error: DiscussionError; usage?: ThreadUsage }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = NewThread.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { book, title, body, page } = parsed.data;

  const usage = await threadUsage(me);
  if (usage.threadsPerMonthLimit !== null && usage.threadsThisMonth >= usage.threadsPerMonthLimit) return { ok: false, error: "limit_threads", usage };
  if (await tooFast(me)) return { ok: false, error: "rate_limited" };

  const [row] = await db.insert(discussionThreads).values({ bookId: book.id, bookTitle: book.title, authorId: me, title, body, page }).returning();
  const [a] = await db.select(author).from(profiles).where(eq(profiles.id, me));
  const viewer = await viewerOf(me, book.id, false);
  return { ok: true, thread: toThread({ ...row, author: a }, me, viewer), usage: { ...usage, threadsThisMonth: usage.threadsThisMonth + 1 } };
}

export async function replyAction(threadId: string, input: z.input<typeof NewPost>): Promise<{ ok: true; post: PostView } | { ok: false; error: DiscussionError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = NewPost.safeParse(input);
  if (!Id.safeParse(threadId).success || !parsed.success) return { ok: false, error: "invalid" };

  const thread = await db.query.discussionThreads.findFirst({ where: eq(discussionThreads.id, threadId) });
  if (!thread || thread.hidden) return { ok: false, error: "not_found" };
  const blocked = (await blockedWith(me)).map((b) => b.id);
  if (blocked.includes(thread.authorId)) return { ok: false, error: "blocked" };
  if (await tooFast(me)) return { ok: false, error: "rate_limited" };

  const [row] = await db.insert(discussionPosts).values({ threadId, authorId: me, ...parsed.data }).returning();
  await db
    .update(discussionThreads)
    .set({ replyCount: sql`${discussionThreads.replyCount} + 1`, lastActivityAt: new Date() })
    .where(eq(discussionThreads.id, threadId));
  await notify({ recipientId: thread.authorId, actorId: me, type: "discussion_reply", bookId: thread.bookId, bookTitle: thread.bookTitle });

  const [a] = await db.select(author).from(profiles).where(eq(profiles.id, me));
  return { ok: true, post: { id: row.id, page: row.page, spoiler: false, body: row.body, author: a, mine: true, hidden: false, createdAt: row.createdAt.getTime() } };
}

export async function updateThreadAction(threadId: string, patch: z.input<typeof ThreadPatch>): Promise<{ ok: boolean; error?: DiscussionError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = ThreadPatch.safeParse(patch);
  if (!Id.safeParse(threadId).success || !parsed.success) return { ok: false, error: "invalid" };
  const updated = await db
    .update(discussionThreads)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(discussionThreads.id, threadId), eq(discussionThreads.authorId, me)))
    .returning({ id: discussionThreads.id });
  return updated.length ? { ok: true } : { ok: false, error: "not_found" };
}

export async function updatePostAction(postId: string, patch: z.input<typeof PostPatch>): Promise<{ ok: boolean; error?: DiscussionError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = PostPatch.safeParse(patch);
  if (!Id.safeParse(postId).success || !parsed.success) return { ok: false, error: "invalid" };
  const updated = await db
    .update(discussionPosts)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(discussionPosts.id, postId), eq(discussionPosts.authorId, me)))
    .returning({ id: discussionPosts.id });
  return updated.length ? { ok: true } : { ok: false, error: "not_found" };
}

/** Apaga o próprio tópico (e as respostas dele). */
export async function deleteThreadAction(threadId: string): Promise<{ ok: boolean }> {
  const me = await currentProfileId();
  if (!me || !db || !Id.safeParse(threadId).success) return { ok: false };
  const removed = await db
    .delete(discussionThreads)
    .where(and(eq(discussionThreads.id, threadId), eq(discussionThreads.authorId, me)))
    .returning({ id: discussionThreads.id });
  if (removed.length) await db.delete(discussionReports).where(and(eq(discussionReports.targetKind, "thread"), eq(discussionReports.targetId, threadId)));
  return { ok: removed.length > 0 };
}

export async function deletePostAction(postId: string): Promise<{ ok: boolean }> {
  const me = await currentProfileId();
  if (!me || !db || !Id.safeParse(postId).success) return { ok: false };
  const [removed] = await db
    .delete(discussionPosts)
    .where(and(eq(discussionPosts.id, postId), eq(discussionPosts.authorId, me)))
    .returning({ threadId: discussionPosts.threadId });
  if (!removed) return { ok: false };
  await db
    .update(discussionThreads)
    .set({ replyCount: sql`greatest(${discussionThreads.replyCount} - 1, 0)` })
    .where(eq(discussionThreads.id, removed.threadId));
  await db.delete(discussionReports).where(and(eq(discussionReports.targetKind, "post"), eq(discussionReports.targetId, postId)));
  return { ok: true };
}

/** Denuncia um tópico ou resposta. Com 3 denúncias de pessoas diferentes, o item some da discussão. */
export async function reportAction(kind: "thread" | "post", targetId: string, reason = ""): Promise<{ ok: boolean; hidden?: boolean }> {
  const me = await currentProfileId();
  if (!me || !db || !["thread", "post"].includes(kind) || !Id.safeParse(targetId).success) return { ok: false };
  const table = kind === "thread" ? discussionThreads : discussionPosts;
  const target = await db.select({ authorId: table.authorId }).from(table).where(eq(table.id, targetId)).limit(1);
  if (!target[0] || target[0].authorId === me) return { ok: false };

  await db
    .insert(discussionReports)
    .values({ reporterId: me, targetKind: kind, targetId, reason: reason.trim().slice(0, 300) })
    .onConflictDoNothing();
  const [{ n }] = await db
    .select({ n: count() })
    .from(discussionReports)
    .where(and(eq(discussionReports.targetKind, kind), eq(discussionReports.targetId, targetId)));
  const hidden = n >= HIDE_AFTER_REPORTS;
  if (hidden) await db.update(table).set({ hidden: true }).where(inArray(table.id, [targetId]));
  return { ok: true, hidden };
}
