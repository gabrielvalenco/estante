"use server";

import { revalidatePath } from "next/cache";

import { getServerClient } from "@/lib/supabase/server";

/**
 * Páginas públicas ficam em cache (ISR). Quando alguém altera a estante,
 * atualizamos a página do livro, o perfil dessa pessoa e o feed da home.
 */
export async function revalidateShelf(bookId?: string) {
  if (bookId && /^OL\d+W$/.test(bookId)) revalidatePath(`/livro/${bookId}`);
  revalidatePath("/");

  const sb = await getServerClient();
  if (!sb) return;
  const { data } = await sb.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return;
  const { data: profile } = await sb.from("profiles").select("handle").eq("id", userId).single();
  if (profile) revalidatePath(`/u/${profile.handle}`);
}

/** Depois de editar o perfil: o endereço antigo (se o @ mudou) e o novo. */
export async function revalidateProfile(handles: string[]) {
  handles.filter((h) => /^[a-z0-9_]{3,20}$/.test(h)).forEach((h) => revalidatePath(`/u/${h}`));
  revalidatePath("/leitores");
}
