"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";

import { getMyAccount, importEntriesAction, saveEntryAction } from "@/app/actions";
import type { Book } from "@/lib/books";
import type { ShelfEntry } from "@/lib/db/types";

/**
 * A estante de quem está usando o app, com dois modos:
 *   - "local": sem login, fica no localStorage deste navegador.
 *   - "remote": com login, fica no Postgres via server actions. A tela atualiza na hora
 *     (otimista) e volta atrás com um aviso se o servidor recusar.
 * Os componentes não sabem qual modo está ativo: usam `useLibrary`, `useEntry` e `saveEntry`.
 */

export type Status = "quero-ler" | "lendo" | "lido";

export type Entry = ShelfEntry & {
  book: Pick<Book, "id" | "title" | "author" | "coverId" | "color" | "year" | "pages">;
};

type Entries = Record<string, Entry>;
type Mode = { kind: "local" } | { kind: "remote" };

const KEY = "estante:v1";
const EMPTY: Entries = {};
const listeners = new Set<() => void>();

let entries: Entries | null = null;
let mode: Mode = { kind: "local" };
/** true enquanto a estante da conta está sendo buscada. */
let loading = false;

function notify() {
  listeners.forEach((l) => l());
}

function setLoading(value: boolean) {
  loading = value;
  notify();
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
  notify();
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

/** true enquanto a estante da conta ainda não chegou. Evita mostrar "estante vazia" por um instante. */
export function useLibraryLoading(): boolean {
  return useSyncExternalStore(subscribe, () => loading, () => true);
}

export function useEntry(bookId: string): Entry | undefined {
  return useLibrary()[bookId];
}

function isEmpty(e: Entry) {
  return !e.status && !e.rating && !e.liked && !e.review;
}

// ------------------------------------------------------------
// Troca de modo (chamado pelo AuthSync)
// ------------------------------------------------------------

export function beginAccountLoad() {
  mode = { kind: "remote" };
  entries = {};
  setLoading(true);
}

/**
 * Entrou: recebe a estante da conta e sobe o que estava no navegador.
 * Em conflito, vale a versão alterada por último (o servidor decide).
 */
export async function connectAccount(shelf: ShelfEntry[]) {
  const local = readLocal();
  mode = { kind: "remote" };
  const remote: Entries = Object.fromEntries(shelf.map((e) => [e.book.id, e]));

  const toUpload = Object.values(local).filter(
    (e) => !isEmpty(e) && (!remote[e.book.id] || e.updatedAt > remote[e.book.id].updatedAt),
  );

  if (toUpload.length) {
    const result = await importEntriesAction(toUpload);
    if (result.ok) {
      toUpload.forEach((e) => (remote[e.book.id] = e));
      writeLocal({});
      toast(
        toUpload.length === 1
          ? "1 livro deste navegador foi salvo na sua conta"
          : `${toUpload.length} livros deste navegador foram salvos na sua conta`,
      );
    } else {
      toast.error("Não foi possível salvar os livros deste navegador na sua conta", {
        description: "Eles continuam guardados aqui. Entre de novo para tentar outra vez.",
      });
    }
  } else if (Object.keys(local).length) {
    writeLocal({});
  }

  set(remote);
  setLoading(false);
}

/** Recarrega a estante da conta (depois de algo feito no servidor, como uma importação). */
export async function refreshLibrary() {
  if (mode.kind !== "remote") return;
  const account = await getMyAccount();
  if (account) set(Object.fromEntries(account.shelf.map((e) => [e.book.id, e])));
}

/** Saiu (ou não há contas): volta a usar o navegador. */
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

  if (mode.kind === "remote") void persist(next, prev);
}

async function persist(next: Entry, prev: Entry | undefined) {
  const bookId = next.book.id;
  const result = await saveEntryAction(next).catch(() => ({ ok: false as const }));
  if (result.ok) return;

  // Desfaz só este livro, sem perder outras mudanças feitas enquanto isso.
  const copy = { ...current() };
  if (prev) copy[bookId] = prev;
  else delete copy[bookId];
  set(copy);
  toast.error("Não foi possível salvar", { description: "Verifique sua conexão e tente de novo." });
}

export function removeEntry(bookId: string) {
  const prev = current()[bookId];
  if (!prev) return;
  const copy = { ...current() };
  delete copy[bookId];
  set(copy);
  // Salvar um registro vazio remove do banco.
  if (mode.kind === "remote") void persist({ ...prev, status: null, rating: null, liked: false, review: "" }, prev);
}

export const STATUS_LABEL: Record<Status, string> = {
  "quero-ler": "Quero ler",
  lendo: "Lendo",
  lido: "Lido",
};
