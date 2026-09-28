"use client";

import { useSyncExternalStore } from "react";

import type { Book } from "@/lib/books";

/**
 * A estante de quem está usando o app.
 * Nesta versão fica no localStorage: sem cadastro, o visitante já pode registrar leituras.
 * A interface (`useLibrary`, `useEntry`, `saveEntry`) é a mesma que uma versão com banco usaria.
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

type State = Record<string, Entry>;

const KEY = "estante:v1";
const listeners = new Set<() => void>();
let cache: State | null = null;
const EMPTY: State = {};

function read(): State {
  if (cache) return cache;
  try {
    cache = JSON.parse(localStorage.getItem(KEY) ?? "{}") as State;
  } catch {
    cache = {};
  }
  return cache;
}

function write(next: State) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Modo privado ou armazenamento cheio: a estante continua funcionando nesta aba.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLibrary(): State {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useEntry(bookId: string): Entry | undefined {
  return useLibrary()[bookId];
}

function snapshot(book: Book): Entry["book"] {
  const { id, title, author, coverId, color, year, pages } = book;
  return { id, title, author, coverId, color, year, pages };
}

export function saveEntry(book: Book, patch: Partial<Omit<Entry, "book" | "updatedAt">>) {
  const state = read();
  const prev: Partial<Entry> = state[book.id] ?? {};
  const next: Entry = {
    status: prev.status ?? null,
    rating: prev.rating ?? null,
    liked: prev.liked ?? false,
    review: prev.review ?? "",
    finishedOn: prev.finishedOn ?? null,
    ...patch,
    book: snapshot(book),
    updatedAt: Date.now(),
  };
  const empty = !next.status && !next.rating && !next.liked && !next.review;
  const copy = { ...state };
  if (empty) delete copy[book.id];
  else copy[book.id] = next;
  write(copy);
}

export function removeEntry(bookId: string) {
  const copy = { ...read() };
  delete copy[bookId];
  write(copy);
}

export const STATUS_LABEL: Record<Status, string> = {
  "quero-ler": "Quero ler",
  lendo: "Lendo",
  lido: "Lido",
};
