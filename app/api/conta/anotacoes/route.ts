import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { planOf } from "@/lib/billing";
import { db } from "@/lib/db";
import { annotations, entries, readingProgress } from "@/lib/db/schema";
import { annotationsToMarkdown, slug, type ExportBook } from "@/lib/export-markdown";
import { PLANS } from "@/lib/plans";
import { currentProfileId } from "@/lib/session";

/**
 * Exporta citações e notas em Markdown (Capa Dura). ?livro=OL123W exporta só um livro.
 * Funciona com a sessão do site e com o token do app. Os dados completos da conta (LGPD)
 * continuam grátis em /api/conta/exportar.
 */
export async function GET(req: NextRequest) {
  const me = await currentProfileId();
  if (!me || !db) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const plan = PLANS[await planOf(me)];
  if (!plan.features.exportNotes) return NextResponse.json({ error: "plan", planName: plan.name }, { status: 402 });

  const bookId = req.nextUrl.searchParams.get("livro");
  if (bookId && !/^OL\d+W$/.test(bookId)) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const rows = await db
    .select()
    .from(annotations)
    .where(bookId ? and(eq(annotations.userId, me), eq(annotations.bookId, bookId)) : eq(annotations.userId, me))
    .orderBy(desc(annotations.createdAt))
    .limit(10000);
  if (!rows.length) return NextResponse.json({ error: "empty" }, { status: 404 });

  const ids = [...new Set(rows.map((r) => r.bookId))];
  const [shelf, progress] = await Promise.all([
    db.select().from(entries).where(and(eq(entries.userId, me), inArray(entries.bookId, ids))),
    db.select().from(readingProgress).where(and(eq(readingProgress.userId, me), inArray(readingProgress.bookId, ids))),
  ]);
  const entryOf = new Map(shelf.map((e) => [e.bookId, e]));
  const progressOf = new Map(progress.map((p) => [p.bookId, p]));

  // Livros na ordem da anotação mais recente.
  const books: ExportBook[] = ids.map((id) => {
    const a = rows.find((r) => r.bookId === id)!;
    const e = entryOf.get(id);
    const p = progressOf.get(id);
    return {
      id,
      title: a.bookTitle,
      author: a.bookAuthor,
      status: e?.status ?? null,
      rating: e?.rating ? Number(e.rating) : null,
      finishedOn: e?.finishedOn ?? null,
      review: e?.review ?? "",
      bookmark: p ? { page: p.page, totalPages: p.totalPages } : null,
    };
  });

  const markdown = annotationsToMarkdown(
    books,
    rows.map((r) => ({ bookId: r.bookId, kind: r.kind, text: r.text, comment: r.comment, page: r.page, createdAt: r.createdAt })),
    { exportedAt: new Date(), site: req.nextUrl.host },
  );
  const name = bookId ? `${slug(books[0].title)}-anotacoes.md` : `estante-anotacoes-${new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })}.md`;
  return new NextResponse(markdown, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "private, no-store",
    },
  });
}
