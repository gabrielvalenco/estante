"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { revalidateShelf } from "@/app/actions";
import type { Book } from "@/lib/books";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/supabase/database.types";

/**
 * A estante de quem está usando o app, com dois modos:
 *   - "local": sem login, fica no localStorage deste navegador.
 *   - "remote": com login, fica no Supabase. A tela atualiza na hora (otimista)
 *     e volta atrás com um aviso se o banco recusar.
 * Os componentes não sabem qual modo está ativo: usam `useLibrary`, `useEntry` e `saveEntry`.
 */

export type Status = "quero-ler" | "lendo" | "lido";

export type Entry = {
  book: Pick<Book, "id" | "title" | "author" | "coverId" | "color" | "year" | "pages">;
  status: Status | null;
  rating: number | null;
  liked: boolean;
  review: string;
  /** Data em que terminou (AAAA-MM-DD), só para "lido". */
  finishedOn: string | null;
  updatedAt: number;
};

type Entries = Record<string, Entry>;
type Mode = { kind: "local" } | { kind: "remote"; userId: string };

const KEY = "estante:v1";
const EMPTY: Entries = {};
const listeners = new Set<() => void>();

let entries: Entries | null = null;
let mode: Mode = { kind: "local" };
/** true enquanto a estante da conta está sendo buscada. */
let loading = false;

function setLoading(value: boolean) {
  loading = value;
  listeners.forEach((l) => l());
}

// ------------------------------------------------------------
// Armazenamento local
// ------------------------------------------------------------

function readLocal(): Entries {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as Entries;
  } catch {
    return {};
  }
}

function writeLocal(next: Entries) {
  try {
    if (Object.keys(next).length) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    // Modo privado ou armazenamento cheio: a estante continua funcionando nesta aba.
  }
}

// ------------------------------------------------------------
// Store
// ------------------------------------------------------------

function current(): Entries {
  entries ??= mode.kind === "local" ? readLocal() : {};
  return entries;
}

function set(next: Entries) {
  entries = next;
  if (mode.kind === "local") writeLocal(next);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY && mode.kind === "local") {
      entries = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLibrary(): Entries {
  return useSyncExternalStore(subscribe, current, () => EMPTY);
}

/** "loading" enquanto a estante da conta ainda não chegou. Evita mostrar "estante vazia" por um instante. */
export function useLibraryLoading(): boolean {
  return useSyncExternalStore(subscribe, () => loading, () => true);
}

export function useEntry(bookId: string): Entry | undefined {
  return useLibrary()[bookId];
}

// ------------------------------------------------------------
// Conversão linha do banco <-> Entry
// ------------------------------------------------------------

type Row = Tables<"entries">;

export function rowToEntry(row: Row): Entry {
  return {
    book: {
      id: row.book_id,
      title: row.book_title,
      author: row.book_author,
      coverId: row.book_cover_id,
      color: row.book_color,
      year: row.book_year,
      pages: row.book_pages,
    },
    status: row.status as Status | null,
    rating: row.rating === null ? null : Number(row.rating),
    liked: row.liked,
    review: row.review,
    finishedOn: row.finished_on,
    updatedAt: Date.parse(row.updated_at),
  };
}

function entryToRow(userId: string, e: Entry): TablesInsert<"entries"> {
  return {
    user_id: userId,
    book_id: e.book.id,
    book_title: e.book.title.slice(0, 300),
    book_author: e.book.author.slice(0, 200),
    book_cover_id: e.book.coverId,
    book_color: e.book.color.toLowerCase(),
    book_year: e.book.year,
    book_pages: e.book.pages,
    status: e.status,
    rating: e.rating,
    liked: e.liked,
    review: e.review,
    finished_on: e.finishedOn,
  };
}

function isEmpty(e: Entry) {
  return !e.status && !e.rating && !e.liked && !e.review;
}

// ------------------------------------------------------------
// Troca de modo (chamado pelo AuthSync)
// ------------------------------------------------------------

/**
 * Entrou: carrega a estante da conta e sobe o que estava no navegador.
 * Em conflito, vale a versão alterada por último.
 */
export async function connectAccount(userId: string) {
  if (mode.kind === "remote" && mode.userId === userId) return;
  const sb = getBrowserClient();
  if (!sb) return;

  const local = readLocal();
  mode = { kind: "remote", userId };
  entries = {};
  setLoading(true);

  const { data, error } = await sb.from("entries").select("*").eq("user_id", userId).order("updated_at", { ascending: false });
  if (error) {
    toast.error("Não foi possível carregar sua estante", { description: "Tente recarregar a página." });
    set({});
    setLoading(false);
    return;
  }

  const remote: Entries = Object.fromEntries(data.map((r) => [r.book_id, rowToEntry(r)]));
  const toUpload = Object.values(local).filter((e) => !isEmpty(e) && (!remote[e.book.id] || e.updatedAt > remote[e.book.id].updatedAt));

  if (toUpload.length) {
    const { error: upErr } = await sb.from("entries").upsert(toUpload.map((e) => entryToRow(userId, e)));
    if (upErr) {
      toast.error("Não foi possível salvar os livros deste navegador na sua conta", {
        description: "Eles continuam guardados aqui. Entre de novo para tentar outra vez.",
      });
    } else {
      toUpload.forEach((e) => (remote[e.book.id] = e));
      writeLocal({});
      toast(toUpload.length === 1 ? "1 livro deste navegador foi salvo na sua conta" : `${toUpload.length} livros deste navegador foram salvos na sua conta`);
      void revalidateShelf();
    }
  } else if (Object.keys(local).length) {
    writeLocal({});
  }

  set(remote);
  setLoading(false);
}

/** Saiu: volta a usar o navegador. */
export function disconnectAccount() {
  mode = { kind: "local" };
  entries = null;
  setLoading(false);
}

// ------------------------------------------------------------
// Escrita
// ------------------------------------------------------------

function snapshot(book: Book): Entry["book"] {
  const { id, title, author, coverId, color, year, pages } = book;
  return { id, title, author, coverId, color, year, pages };
}

export function saveEntry(book: Book, patch: Partial<Omit<Entry, "book" | "updatedAt">>) {
  const state = current();
  const prev: Entry | undefined = state[book.id];
  const next: Entry = {
    status: prev?.status ?? null,
    rating: prev?.rating ?? null,
    liked: prev?.liked ?? false,
    review: prev?.review ?? "",
    finishedOn: prev?.finishedOn ?? null,
    ...patch,
    book: snapshot(book),
    updatedAt: Date.now(),
  };

  const copy = { ...state };
  if (isEmpty(next)) delete copy[book.id];
  else copy[book.id] = next;
  set(copy);

  if (mode.kind === "remote") void persist(mode.userId, book.id, isEmpty(next) ? null : next, prev);
}

async function persist(userId: string, bookId: string, next: Entry | null, prev: Entry | undefined) {
  const sb = getBrowserClient();
  if (!sb) return;
  const { error } = next
    ? await sb.from("entries").upsert(entryToRow(userId, next))
    : await sb.from("entries").delete().match({ user_id: userId, book_id: bookId });

  if (error) {
    // Desfaz só este livro, sem perder outras mudanças feitas enquanto isso.
    const copy = { ...current() };
    if (prev) copy[bookId] = prev;
    else delete copy[bookId];
    set(copy);
    toast.error("Não foi possível salvar", { description: "Verifique sua conexão e tente de novo." });
    return;
  }
  void revalidateShelf(bookId);
}

export function removeEntry(bookId: string) {
  const prev = current()[bookId];
  if (!prev) return;
  const copy = { ...current() };
  delete copy[bookId];
  set(copy);
  if (mode.kind === "remote") void persist(mode.userId, bookId, null, prev);
}

export const STATUS_LABEL: Record<Status, string> = {
  "quero-ler": "Quero ler",
  lendo: "Lendo",
  lido: "Lido",
};
