import "server-only";

import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { planOf } from "@/lib/billing";
import { db } from "@/lib/db";
import { annotations, discussionPosts, discussionThreads, entries, profiles } from "@/lib/db/schema";
import { PLANS } from "@/lib/plans";

/**
 * Retrospectiva do ano: o "Wrapped" da leitura. Conta só livros marcados como lidos com data
 * de término dentro do ano. A parte básica é de todo mundo; a completa, do Capa Dura. O que é do
 * plano pago nem é calculado para quem não tem o plano (não vai para o navegador, nem borrado).
 */

export type RetroBook = { id: string; title: string; author: string; coverId: number | null; color: string; pages: number | null; rating: number | null; finishedOn: string };

export type Retrospective = {
  year: number;
  /** Ano corrente: os números são "até agora". */
  inProgress: boolean;
  /** Anos com leituras, para trocar de ano. */
  years: number[];
  basic: {
    booksRead: number;
    goal: number;
    pagesRead: number;
    /** Livros com número de páginas conhecido (o total de páginas conta só esses). */
    pagesKnown: number;
    avgRating: number | null;
    topRated: RetroBook | null;
    byMonth: number[];
    covers: RetroBook[];
  };
  /** null quando o plano não inclui a retrospectiva completa. */
  full: {
    topAuthors: { name: string; books: number }[];
    longest: RetroBook | null;
    shortest: RetroBook | null;
    first: RetroBook | null;
    last: RetroBook | null;
    liked: number;
    reviews: number;
    ratings: number[];
    quotes: number;
    notes: number;
    quoteOfYear: { text: string; bookTitle: string; page: number | null } | null;
    threads: number;
    replies: number;
  } | null;
  plan: { name: string; full: boolean };
};

export async function retrospectiveOf(profileId: string, year: number): Promise<Retrospective | null> {
  if (!db) return null;
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  const [profile, plan, rows, yearRows] = await Promise.all([
    db.query.profiles.findFirst({ where: eq(profiles.id, profileId), columns: { goal: true } }),
    planOf(profileId),
    db
      .select()
      .from(entries)
      .where(and(eq(entries.userId, profileId), eq(entries.status, "lido"), gte(entries.finishedOn, start), lt(entries.finishedOn, end))),
    db
      .selectDistinct({ year: sql<number>`extract(year from ${entries.finishedOn})::int` })
      .from(entries)
      .where(and(eq(entries.userId, profileId), eq(entries.status, "lido"), sql`${entries.finishedOn} is not null`)),
  ]);
  if (!profile) return null;

  const books: RetroBook[] = rows
    .map((r) => ({
      id: r.bookId,
      title: r.bookTitle,
      author: r.bookAuthor,
      coverId: r.bookCoverId,
      color: r.bookColor,
      pages: r.bookPages,
      rating: r.rating === null ? null : Number(r.rating),
      finishedOn: r.finishedOn!,
    }))
    .sort((a, b) => a.finishedOn.localeCompare(b.finishedOn));

  const rated = books.filter((b) => b.rating !== null);
  const withPages = books.filter((b) => b.pages);
  const byMonth = Array.from({ length: 12 }, (_, m) => books.filter((b) => Number(b.finishedOn.slice(5, 7)) === m + 1).length);
  const topRated = rated.length ? rated.reduce((best, b) => (b.rating! > best.rating! || (b.rating === best.rating && b.finishedOn > best.finishedOn) ? b : best)) : null;
  const now = new Date();
  const currentYear = Number(now.toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 4));

  const planInfo = PLANS[plan];
  const result: Retrospective = {
    year,
    inProgress: year === currentYear,
    years: [...new Set([...yearRows.map((y) => y.year), currentYear])].sort((a, b) => b - a),
    basic: {
      booksRead: books.length,
      goal: profile.goal,
      pagesRead: withPages.reduce((n, b) => n + b.pages!, 0),
      pagesKnown: withPages.length,
      avgRating: rated.length ? Math.round((rated.reduce((n, b) => n + b.rating!, 0) / rated.length) * 10) / 10 : null,
      topRated,
      byMonth,
      // Capas para o mosaico: as mais bem avaliadas primeiro.
      covers: [...books].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 12),
    },
    full: null,
    plan: { name: planInfo.name, full: planInfo.features.fullRetrospective },
  };
  if (!planInfo.features.fullRetrospective) return result;

  const from = new Date(`${start}T00:00:00-03:00`);
  const to = new Date(`${end}T00:00:00-03:00`);
  const inYear = (col: AnyPgColumn) => and(gte(col, from), lt(col, to));
  const [[quotes], [notes], quoteRows, [threads], [replies]] = await Promise.all([
    db.select({ n: count() }).from(annotations).where(and(eq(annotations.userId, profileId), eq(annotations.kind, "quote"), inYear(annotations.createdAt))),
    db.select({ n: count() }).from(annotations).where(and(eq(annotations.userId, profileId), eq(annotations.kind, "note"), inYear(annotations.createdAt))),
    db
      .select({ text: annotations.text, comment: annotations.comment, bookTitle: annotations.bookTitle, page: annotations.page })
      .from(annotations)
      .where(and(eq(annotations.userId, profileId), eq(annotations.kind, "quote"), inYear(annotations.createdAt)))
      .limit(500),
    db.select({ n: count() }).from(discussionThreads).where(and(eq(discussionThreads.authorId, profileId), inYear(discussionThreads.createdAt))),
    db.select({ n: count() }).from(discussionPosts).where(and(eq(discussionPosts.authorId, profileId), inYear(discussionPosts.createdAt))),
  ]);

  const authors = new Map<string, number>();
  for (const b of books) if (b.author) authors.set(b.author, (authors.get(b.author) ?? 0) + 1);
  // Citação do ano: a que ganhou comentário (a pessoa quis dizer algo sobre ela); senão, a mais longa que caiba bem numa tela.
  const fit = quoteRows.filter((q) => q.text.length <= 280);
  const quote = [...fit].sort((a, b) => Number(Boolean(b.comment)) - Number(Boolean(a.comment)) || b.text.length - a.text.length)[0] ?? null;

  result.full = {
    topAuthors: [...authors.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 3)
      .map(([name, n]) => ({ name, books: n })),
    longest: withPages.length ? withPages.reduce((a, b) => (b.pages! > a.pages! ? b : a)) : null,
    shortest: withPages.length > 1 ? withPages.reduce((a, b) => (b.pages! < a.pages! ? b : a)) : null,
    first: books[0] ?? null,
    last: books.length > 1 ? books[books.length - 1] : null,
    liked: rows.filter((r) => r.liked).length,
    reviews: rows.filter((r) => r.review.trim()).length,
    ratings: Array.from({ length: 10 }, (_, i) => rated.filter((b) => b.rating === (i + 1) / 2).length),
    quotes: quotes.n,
    notes: notes.n,
    quoteOfYear: quote ? { text: quote.text, bookTitle: quote.bookTitle, page: quote.page } : null,
    threads: threads.n,
    replies: replies.n,
  };
  return result;
}
