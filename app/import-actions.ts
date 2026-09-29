"use server";

import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { importEntriesAction } from "@/app/actions";
import { planOf } from "@/lib/billing";
import { fallbackColor, type Book } from "@/lib/books";
import { db } from "@/lib/db";
import { annotations } from "@/lib/db/schema";
import { searchTitle } from "@/lib/importers";
import { bookByIsbn, searchWithOriginal } from "@/lib/openlibrary";
import { PLANS } from "@/lib/plans";
import { fold } from "@/lib/search";
import { currentProfileId } from "@/lib/session";

/**
 * Importar de outros lugares. O navegador lê o arquivo e mostra a prévia; aqui cada livro é achado
 * na Open Library e o que chega é validado de novo. O plano é conferido no servidor.
 */

export type MatchedBook = Pick<Book, "id" | "title" | "author" | "coverId" | "color" | "year" | "pages">;

const summary = (b: Book): MatchedBook => ({ id: b.id, title: b.title, author: b.author, coverId: b.coverId, color: b.color, year: b.year, pages: b.pages });

/**
 * Melhor resultado da busca: título igual vence "título que contém" ("Duna" não vira "O Messias de Duna"),
 * autor certo pesa, e entre parecidos fica o de título mais próximo em tamanho.
 */
function pickBest(results: { book: Book; originalTitle: string }[], title: string, author: string): Book | null {
  const wanted = fold(title);
  const surname = fold(author).split(/\s+/).filter((w) => w.length > 2).pop() ?? "";
  const titleScore = (t: string) =>
    (t === wanted ? 100 : t.startsWith(wanted) ? 25 : t.includes(wanted) || wanted.includes(t) ? 10 : 0) - Math.abs(t.length - wanted.length) * 0.5;
  let best: Book | null = null;
  let bestScore = -Infinity;
  for (const [i, { book: b, originalTitle }] of results.entries()) {
    // Compara com o título mostrado e com o original (a base curada traduz: "Duna" é "Dune").
    let score = Math.max(titleScore(fold(b.title)), titleScore(fold(searchTitle(originalTitle))));
    if (surname && fold(b.author).includes(surname)) score += 30;
    // Desempate pela relevância da própria Open Library.
    score -= i;
    if (score > bestScore) {
      best = b;
      bestScore = score;
    }
  }
  // Nada parecido com o título nem com o autor: melhor não importar do que importar o livro errado.
  return bestScore >= 10 ? best : null;
}

const MatchInput =z.array(z.object({ key: z.string().max(700), title: z.string().trim().min(1).max(300), author: z.string().max(200), isbn: z.string().max(13).nullable().optional() })).max(10);

/** Acha cada livro na Open Library: pelo ISBN primeiro, depois por título e autor. Até 10 por vez. */
export async function matchBooksAction(input: z.input<typeof MatchInput>): Promise<{ key: string; book: MatchedBook | null }[] | null> {
  if (!(await currentProfileId())) return null;
  const parsed = MatchInput.safeParse(input);
  if (!parsed.success) return null;

  return Promise.all(
    parsed.data.map(async ({ key, title, author, isbn }) => {
      try {
        const byIsbn = isbn ? await bookByIsbn(isbn) : null;
        if (byIsbn) return { key, book: summary(byIsbn) };
        const clean = searchTitle(title);
        const results = await searchWithOriginal(`${clean} ${author}`.trim(), 8);
        const best = pickBest(results, clean, author);
        return { key, book: best ? summary(best) : null };
      } catch {
        return { key, book: null };
      }
    }),
  );
}

// ------------------------------------------------------------
// Goodreads → estante (grátis)
// ------------------------------------------------------------

const Matched = z.object({
  id: z.string().regex(/^OL\d+W$/),
  title: z.string().trim().min(1).max(300),
  author: z.string().max(200),
  coverId: z.number().int().positive().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  year: z.number().int().nullable(),
  pages: z.number().int().positive().nullable(),
});

const GoodreadsItem = z.object({
  book: Matched,
  status: z.enum(["quero-ler", "lendo", "lido"]),
  rating: z.number().int().min(1).max(5).nullable(),
  review: z.string().max(600),
  finishedOn: z.iso.date().nullable(),
  addedOn: z.iso.date().nullable(),
});

/**
 * Importa a estante do Goodreads (até 100 livros por vez). Livro que já está na Estante com
 * registro mais novo não é sobrescrito: vale o que a pessoa fez aqui.
 */
export async function importGoodreadsAction(input: z.input<typeof GoodreadsItem>[]): Promise<{ ok: true; imported: number } | { ok: false; error: "unauthenticated" | "plan" | "invalid" }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  if (!PLANS[await planOf(me)].features.goodreadsImport) return { ok: false, error: "plan" };
  const parsed = z.array(GoodreadsItem).max(100).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const r = await importEntriesAction(
    parsed.data.map((i) => ({
      book: { ...i.book, color: i.book.color || fallbackColor(i.book.id), year: i.book.year && Math.abs(i.book.year) <= 3000 ? i.book.year : null },
      status: i.status,
      rating: i.rating,
      liked: false,
      review: i.review,
      finishedOn: i.status === "lido" ? i.finishedOn : null,
      // A data do Goodreads vira a data do registro: qualquer coisa feita depois na Estante vence.
      updatedAt: Date.parse(`${i.finishedOn ?? i.addedOn ?? "2000-01-01"}T12:00:00Z`),
    })),
  );
  return r.ok ? { ok: true, imported: r.imported } : { ok: false, error: "invalid" };
}

// ------------------------------------------------------------
// Kindle → citações e notas (Capa Dura)
// ------------------------------------------------------------

const KindleItem = z.object({
  book: Matched.pick({ id: true, title: true, author: true, coverId: true, color: true }),
  kind: z.enum(["quote", "note"]),
  text: z.string().trim().min(1).max(20000),
  page: z.number().int().min(1).max(100000).nullable(),
});

export async function importKindleAction(
  input: z.input<typeof KindleItem>[],
): Promise<{ ok: true; imported: number; duplicates: number; truncated: number } | { ok: false; error: "unauthenticated" | "plan" | "invalid" }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  if (!PLANS[await planOf(me)].features.kindleImport) return { ok: false, error: "plan" };
  const parsed = z.array(KindleItem).max(500).safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  // Não duplica o que já foi importado antes (mesmo livro, mesmo texto).
  const bookIds = [...new Set(parsed.data.map((i) => i.book.id))];
  const existing = await db
    .select({ bookId: annotations.bookId, text: annotations.text })
    .from(annotations)
    .where(and(eq(annotations.userId, me), inArray(annotations.bookId, bookIds)));
  const seen = new Set(existing.map((e) => `${e.bookId}\u0000${e.text}`));

  let truncated = 0;
  let duplicates = 0;
  const rows = [];
  for (const i of parsed.data) {
    const max = i.kind === "quote" ? 1000 : 4000;
    let text = i.text;
    if (text.length > max) {
      text = text.slice(0, max - 1).trimEnd() + "…";
      truncated++;
    }
    const k = `${i.book.id}\u0000${text}`;
    if (seen.has(k)) {
      duplicates++;
      continue;
    }
    seen.add(k);
    rows.push({
      userId: me,
      bookId: i.book.id,
      bookTitle: i.book.title,
      bookAuthor: i.book.author,
      bookCoverId: i.book.coverId,
      bookColor: i.book.color.toLowerCase(),
      kind: i.kind,
      text,
      page: i.page,
    });
  }
  for (let n = 0; n < rows.length; n += 200) await db.insert(annotations).values(rows.slice(n, n + 200));
  return { ok: true, imported: rows.length, duplicates, truncated };
}

/** O plano da pessoa libera a importação do Kindle? (para a tela mostrar o convite certo) */
export async function importPermissions(): Promise<{ loggedIn: boolean; kindle: boolean; goodreads: boolean; planName: string }> {
  const me = await currentProfileId();
  if (!me) return { loggedIn: false, kindle: false, goodreads: false, planName: "Brochura" };
  const plan = PLANS[await planOf(me)];
  return { loggedIn: true, kindle: plan.features.kindleImport, goodreads: plan.features.goodreadsImport, planName: plan.name };
}
