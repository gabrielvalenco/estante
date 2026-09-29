import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { bookSummary } from "@/lib/api";
import { searchBooks } from "@/lib/openlibrary";

/** Busca de livros para o app (título, autor ou ISBN). Pública, com cache na CDN. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 80) return NextResponse.json({ books: [] });
  try {
    const books = (await searchBooks(q, 30)).map(bookSummary);
    return NextResponse.json({ books }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch {
    return NextResponse.json({ books: [], unavailable: true });
  }
}
