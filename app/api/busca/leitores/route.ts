import { NextResponse, type NextRequest } from "next/server";

import { searchReaders } from "@/lib/db/queries";

/**
 * Leitores por @ ou nome, para a prévia da busca. Separado da busca de livros porque
 * o cache é bem mais curto: quem acabou de criar conta precisa aparecer logo.
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const readers = await searchReaders(q, 5);
  return NextResponse.json({ readers }, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
}
