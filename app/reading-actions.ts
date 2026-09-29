"use server";

import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { annotations, readingProgress, type AnnotationRow } from "@/lib/db/schema";
import { planOf } from "@/lib/billing";
import { limitValue, PLANS, type PlanId } from "@/lib/plans";
import { currentProfileId } from "@/lib/session";

/**
 * Ferramentas de leitura: marcador de página, citações e notas. Tudo privado: toda consulta
 * filtra pelo id da sessão, então ninguém lê nem altera as anotações de outra pessoa.
 * Os limites do plano são conferidos aqui, no servidor.
 */

// ------------------------------------------------------------
// Tipos que vão para a tela
// ------------------------------------------------------------

export type Annotation = {
  id: string;
  kind: "quote" | "note";
  text: string;
  comment: string;
  page: number | null;
  book: { id: string; title: string; author: string; coverId: number | null; color: string };
  createdAt: number;
  updatedAt: number;
};

export type Progress = { page: number; totalPages: number | null; updatedAt: number };

export type Usage = {
  plan: PlanId;
  planName: string;
  quotes: number;
  quotesLimit: number | null;
  notesInBook: number;
  notesPerBookLimit: number | null;
};

export type ReadingData = { progress: Progress | null; annotations: Annotation[]; usage: Usage };

export type AnnotationError = "unauthenticated" | "invalid" | "not_found" | "limit_quotes" | "limit_notes" | "unavailable";

function toAnnotation(r: AnnotationRow): Annotation {
  return {
    id: r.id,
    kind: r.kind,
    text: r.text,
    comment: r.comment,
    page: r.page,
    book: { id: r.bookId, title: r.bookTitle, author: r.bookAuthor, coverId: r.bookCoverId, color: r.bookColor },
    createdAt: r.createdAt.getTime(),
    updatedAt: r.updatedAt.getTime(),
  };
}

// ------------------------------------------------------------
// Validação
// ------------------------------------------------------------

const BookId = z.string().regex(/^OL\d+W$/);
const Page = z.number().int().min(1).max(100000).nullable();

const BookRef = z.object({
  id: BookId,
  title: z.string().trim().min(1).max(300),
  author: z.string().max(200),
  coverId: z.number().int().positive().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).transform((c) => c.toLowerCase()),
});

const NewAnnotation = z
  .object({
    book: BookRef,
    kind: z.enum(["quote", "note"]),
    text: z.string().trim().min(1).max(4000),
    comment: z.string().trim().max(1000).default(""),
    page: Page.default(null),
  })
  .refine((a) => a.kind === "note" || a.text.length <= 1000, { path: ["text"], message: "Citação com até 1000 caracteres" });

const AnnotationPatch = z.object({
  text: z.string().trim().min(1).max(4000).optional(),
  comment: z.string().trim().max(1000).optional(),
  page: Page.optional(),
});

const ProgressInput = z
  .object({ bookId: BookId, page: z.number().int().min(0).max(100000), totalPages: z.number().int().min(1).max(100000).nullable() })
  .refine((p) => p.totalPages === null || p.page <= p.totalPages, { path: ["page"], message: "Página além do fim do livro" });

// ------------------------------------------------------------
// Leitura
// ------------------------------------------------------------

async function usageOf(me: string, bookId: string | null): Promise<Usage> {
  const plan = await planOf(me);
  const { limits, name } = PLANS[plan];
  const [[quotes], [notes]] = await Promise.all([
    db!.select({ n: count() }).from(annotations).where(and(eq(annotations.userId, me), eq(annotations.kind, "quote"))),
    bookId
      ? db!.select({ n: count() }).from(annotations).where(and(eq(annotations.userId, me), eq(annotations.bookId, bookId), eq(annotations.kind, "note")))
      : Promise.resolve([{ n: 0 }]),
  ]);
  return {
    plan,
    planName: name,
    quotes: quotes.n,
    quotesLimit: limitValue(limits.quotes),
    notesInBook: notes.n,
    notesPerBookLimit: limitValue(limits.notesPerBook),
  };
}

/** Marcador, anotações e uso do plano para um livro. */
export async function getReadingData(bookId: string): Promise<ReadingData | null> {
  const me = await currentProfileId();
  if (!me || !db || !BookId.safeParse(bookId).success) return null;
  const [progress, rows, usage] = await Promise.all([
    db.query.readingProgress.findFirst({ where: and(eq(readingProgress.userId, me), eq(readingProgress.bookId, bookId)) }),
    db.query.annotations.findMany({
      where: and(eq(annotations.userId, me), eq(annotations.bookId, bookId)),
      orderBy: [desc(annotations.createdAt)],
      limit: 500,
    }),
    usageOf(me, bookId),
  ]);
  return {
    progress: progress ? { page: progress.page, totalPages: progress.totalPages, updatedAt: progress.updatedAt.getTime() } : null,
    annotations: rows.map(toAnnotation),
    usage,
  };
}

/** Todas as anotações da pessoa, das mais novas para as mais antigas (tela "Anotações"). */
export async function listAnnotations(kind?: "quote" | "note"): Promise<{ annotations: Annotation[]; usage: Usage } | null> {
  const me = await currentProfileId();
  if (!me || !db) return null;
  const where = kind ? and(eq(annotations.userId, me), eq(annotations.kind, kind)) : eq(annotations.userId, me);
  const [rows, usage] = await Promise.all([
    db.query.annotations.findMany({ where, orderBy: [desc(annotations.createdAt)], limit: 1000 }),
    usageOf(me, null),
  ]);
  return { annotations: rows.map(toAnnotation), usage };
}

/** Marcadores de todos os livros (para mostrar o progresso na estante). */
export async function listProgress(): Promise<Record<string, Progress>> {
  const me = await currentProfileId();
  if (!me || !db) return {};
  const rows = await db.query.readingProgress.findMany({ where: eq(readingProgress.userId, me), limit: 500 });
  return Object.fromEntries(rows.map((r) => [r.bookId, { page: r.page, totalPages: r.totalPages, updatedAt: r.updatedAt.getTime() }]));
}

// ------------------------------------------------------------
// Escrita
// ------------------------------------------------------------

/** Salva o marcador. Página 0 sem total apaga o marcador. */
export async function setProgressAction(input: z.input<typeof ProgressInput>): Promise<{ ok: true; progress: Progress | null } | { ok: false; error: AnnotationError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = ProgressInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { bookId, page, totalPages } = parsed.data;

  if (page === 0 && totalPages === null) {
    await db.delete(readingProgress).where(and(eq(readingProgress.userId, me), eq(readingProgress.bookId, bookId)));
    return { ok: true, progress: null };
  }
  const now = new Date();
  await db
    .insert(readingProgress)
    .values({ userId: me, bookId, page, totalPages, updatedAt: now })
    .onConflictDoUpdate({ target: [readingProgress.userId, readingProgress.bookId], set: { page, totalPages, updatedAt: now } });
  return { ok: true, progress: { page, totalPages, updatedAt: now.getTime() } };
}

/** Nova citação ou nota, respeitando o limite do plano. */
export async function createAnnotationAction(
  input: z.input<typeof NewAnnotation>,
): Promise<{ ok: true; annotation: Annotation; usage: Usage } | { ok: false; error: AnnotationError; usage?: Usage }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = NewAnnotation.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const a = parsed.data;

  const usage = await usageOf(me, a.book.id);
  if (a.kind === "quote" && usage.quotesLimit !== null && usage.quotes >= usage.quotesLimit) return { ok: false, error: "limit_quotes", usage };
  if (a.kind === "note" && usage.notesPerBookLimit !== null && usage.notesInBook >= usage.notesPerBookLimit) {
    return { ok: false, error: "limit_notes", usage };
  }

  const [row] = await db
    .insert(annotations)
    .values({
      userId: me,
      bookId: a.book.id,
      bookTitle: a.book.title,
      bookAuthor: a.book.author,
      bookCoverId: a.book.coverId,
      bookColor: a.book.color,
      kind: a.kind,
      text: a.text,
      comment: a.kind === "quote" ? a.comment : "",
      page: a.page,
    })
    .returning();
  const next = { ...usage, quotes: usage.quotes + (a.kind === "quote" ? 1 : 0), notesInBook: usage.notesInBook + (a.kind === "note" ? 1 : 0) };
  return { ok: true, annotation: toAnnotation(row), usage: next };
}

export async function updateAnnotationAction(
  id: string,
  patch: z.input<typeof AnnotationPatch>,
): Promise<{ ok: true; annotation: Annotation } | { ok: false; error: AnnotationError }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsedId = z.uuid().safeParse(id);
  const parsed = AnnotationPatch.safeParse(patch);
  if (!parsedId.success || !parsed.success) return { ok: false, error: "invalid" };

  const current = await db.query.annotations.findFirst({ where: and(eq(annotations.id, parsedId.data), eq(annotations.userId, me)) });
  if (!current) return { ok: false, error: "not_found" };
  const next = { ...parsed.data, comment: current.kind === "quote" ? parsed.data.comment : undefined };
  if (current.kind === "quote" && next.text && next.text.length > 1000) return { ok: false, error: "invalid" };

  const [row] = await db
    .update(annotations)
    .set({ ...next, updatedAt: new Date() })
    .where(and(eq(annotations.id, current.id), eq(annotations.userId, me)))
    .returning();
  return { ok: true, annotation: toAnnotation(row) };
}

export async function deleteAnnotationAction(id: string): Promise<{ ok: boolean }> {
  const me = await currentProfileId();
  if (!me || !db || !z.uuid().safeParse(id).success) return { ok: false };
  const removed = await db.delete(annotations).where(and(eq(annotations.id, id), eq(annotations.userId, me))).returning({ id: annotations.id });
  return { ok: removed.length > 0 };
}
