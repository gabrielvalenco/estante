import { NextResponse, type NextRequest } from "next/server";

import { searchBooks } from "@/lib/openlibrary";
import { matchesPrefix } from "@/lib/search";

/**
 * Sugestões para a busca enquanto a pessoa digita.
 * A Open Library só entende palavras inteiras e devolve ruído para pedaços ("hor" traz livros
 * que não têm "hor" em lugar nenhum). Por isso filtramos: só fica o que tem alguma palavra
 * começando com o que foi digitado.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) return NextResponse.json({ books: [] });

  try {
    const results = await searchBooks(q, 20);
    const books = results
      .filter((b) => matchesPrefix(q, `${b.title} ${b.author}`))
      .slice(0, 6)
      .map(({ id, title, author, year, coverId, color }) => ({ id, title, author, year, coverId, color }));

    return NextResponse.json(
      { books },
      // Mesma busca em sequência (várias pessoas digitando "harry") sai do cache da CDN.
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    );
  } catch {
    return NextResponse.json({ books: [], unavailable: true }, { status: 200 });
  }
}
