import { NextResponse } from "next/server";

import { bookSummary } from "@/lib/api";
import { BOOKS } from "@/lib/books";
import { recentReviews } from "@/lib/db/queries";

export const revalidate = 300;

/** Início do app: livros da vitrine e reviews recentes. Público (o mesmo para todo mundo). */
export async function GET() {
  const books = BOOKS.map(bookSummary);
  return NextResponse.json({ books, reviews: await recentReviews(12) });
}
