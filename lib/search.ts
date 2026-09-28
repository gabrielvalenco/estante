import { BOOKS, type Book } from "@/lib/books";

/**
 * Busca por prefixo de palavra, sem diferenciar acento nem maiúscula:
 * "hor" encontra "A Hora da Estrela", "clar lisp" encontra Clarice Lispector.
 */

/** Minúsculas e sem acento, caractere a caractere (mantém o tamanho, para destacar o trecho certo). */
export function fold(text: string) {
  return Array.from(text)
    .map((ch) => ch.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase() || ch)
    .join("");
}

function tokens(text: string) {
  return fold(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Cada palavra digitada precisa ser o começo de alguma palavra do texto. */
export function matchesPrefix(query: string, text: string) {
  const q = tokens(query);
  if (!q.length) return false;
  const words = tokens(text);
  return q.every((t) => words.some((w) => w.startsWith(t)));
}

/** Livros da base de exemplo que batem com a busca. Instantâneo, sem rede. */
export function searchSeed(query: string, limit = 5): Book[] {
  if (fold(query).trim().length < 2) return [];
  return BOOKS.filter((b) => matchesPrefix(query, `${b.title} ${b.author}`)).slice(0, limit);
}

/**
 * Divide o texto em trechos, marcando o começo das palavras que batem com a busca.
 * Usado para destacar "Hor" em "A **Hor**a da Estrela".
 */
export function highlight(text: string, query: string): { text: string; match: boolean }[] {
  const q = tokens(query);
  if (!q.length) return [{ text, match: false }];
  const folded = fold(text);
  const parts: { text: string; match: boolean }[] = [];
  const wordRe = /[\p{L}\p{N}]+/gu;
  let last = 0;
  for (const m of folded.matchAll(wordRe)) {
    const start = m.index ?? 0;
    const hit = q.filter((t) => m[0].startsWith(t)).sort((a, b) => b.length - a.length)[0];
    if (!hit) continue;
    if (start > last) parts.push({ text: text.slice(last, start), match: false });
    parts.push({ text: text.slice(start, start + hit.length), match: true });
    last = start + hit.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}
