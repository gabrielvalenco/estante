import "server-only";

import type { Tables } from "@/lib/supabase/database.types";
import { getPublicClient } from "@/lib/supabase/server";
import { fromRow, type EntryWithProfile, type ReviewView } from "@/lib/reviews";

/**
 * Leituras públicas do banco. Todas usam o cliente anônimo (sem cookies)
 * e devolvem vazio em modo demonstração ou se o banco falhar: a página
 * continua de pé com os dados de exemplo.
 */

const WITH_PROFILE = "*, profile:profiles(handle, name, tone)";

function reviews(rows: EntryWithProfile[] | null): ReviewView[] {
  return (rows ?? []).map(fromRow).filter((r): r is ReviewView => r !== null);
}

export async function recentReviews(limit = 6): Promise<ReviewView[]> {
  const sb = getPublicClient();
  if (!sb) return [];
  const { data } = await sb
    .from("entries")
    .select(WITH_PROFILE)
    .neq("review", "")
    .order("updated_at", { ascending: false })
    .limit(limit)
    .returns<EntryWithProfile[]>();
  return reviews(data);
}

export async function bookReviews(bookId: string): Promise<ReviewView[]> {
  const sb = getPublicClient();
  if (!sb) return [];
  const { data } = await sb
    .from("entries")
    .select(WITH_PROFILE)
    .eq("book_id", bookId)
    .neq("review", "")
    .order("updated_at", { ascending: false })
    .limit(50)
    .returns<EntryWithProfile[]>();
  return reviews(data);
}

/** Quantas pessoas de verdade marcaram o livro, por status. */
export async function bookCounts(bookId: string) {
  const sb = getPublicClient();
  const empty = { lido: 0, lendo: 0, "quero-ler": 0, ratings: [] as number[] };
  if (!sb) return empty;
  const { data } = await sb.from("entries").select("status, rating").eq("book_id", bookId).limit(1000);
  for (const row of data ?? []) {
    if (row.status) empty[row.status as "lido" | "lendo" | "quero-ler"] += 1;
    if (row.rating !== null) empty.ratings.push(Number(row.rating));
  }
  return empty;
}

export type PublicProfile = Tables<"profiles"> & { entries: Tables<"entries">[] };

export async function profileByHandle(handle: string): Promise<PublicProfile | null> {
  const sb = getPublicClient();
  if (!sb || !/^[a-z0-9_]{3,20}$/.test(handle)) return null;
  const { data: profile } = await sb.from("profiles").select("*").eq("handle", handle).maybeSingle();
  if (!profile) return null;
  const { data: entries } = await sb
    .from("entries")
    .select("*")
    .eq("user_id", profile.id)
    .order("updated_at", { ascending: false })
    .limit(500);
  return { ...profile, entries: entries ?? [] };
}

/** Leitores reais mais recentes que já registraram algum livro. */
export async function recentReaders(limit = 6) {
  const sb = getPublicClient();
  if (!sb) return [];
  const { data } = await sb
    .from("profiles")
    .select("*, entries!inner(book_id, book_title, book_author, book_cover_id, book_color, rating, updated_at)")
    .order("created_at", { ascending: false })
    .order("updated_at", { referencedTable: "entries", ascending: false })
    .limit(4, { referencedTable: "entries" })
    .limit(limit);
  return data ?? [];
}
