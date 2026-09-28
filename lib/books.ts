import raw from "@/lib/data/books.json";
import { CURATION } from "@/lib/data/curation";

export type Book = {
  /** Chave da obra na Open Library, ex: OL27482W. */
  id: string;
  title: string;
  author: string;
  year: number | null;
  pages: number | null;
  coverId: number | null;
  /** Cor viva da capa, usada para tingir a página do livro. */
  color: string;
  genres: string[];
  synopsis: string | null;
};

type RawBook = (typeof raw)[number];

function fromSeed(b: RawBook): Book {
  const c = CURATION[b.id];
  return {
    id: b.id,
    title: b.title,
    author: b.author,
    year: c?.year ?? b.year,
    pages: b.pages,
    coverId: b.coverId,
    color: c?.color ?? b.color,
    genres: c?.genres ?? [],
    synopsis: c?.synopsis ?? b.description,
  };
}

export const BOOKS: Book[] = raw.map(fromSeed);

const byId = new Map(BOOKS.map((b) => [b.id, b]));

export function getSeedBook(id: string): Book | undefined {
  return byId.get(id);
}

export function books(...ids: string[]): Book[] {
  return ids.map((id) => byId.get(id)).filter((b): b is Book => Boolean(b));
}

export type CoverSize = "S" | "M" | "L";

export function coverUrl(coverId: number | null, size: CoverSize = "M"): string | null {
  return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg` : null;
}

/** Cor de reserva para livros sem cor calculada (resultados de busca). Sempre uma das cores da marca. */
const FALLBACK = ["#3a2fd6", "#8e2c80", "#2e7d4f", "#c9821a"];

export function fallbackColor(seed: string): string {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}
