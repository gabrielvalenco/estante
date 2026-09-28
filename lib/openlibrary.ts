import { fallbackColor, getSeedBook, type Book } from "@/lib/books";

const BASE = "https://openlibrary.org";
const HEADERS = { "User-Agent": "Estante (portfolio; github.com/gabrielvalenco/estante)" };

type SearchDoc = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  subject?: string[];
};

function docToBook(d: SearchDoc): Book {
  const id = d.key.replace("/works/", "");
  return (
    getSeedBook(id) ?? {
      id,
      title: d.title,
      author: d.author_name?.[0] ?? "Autor desconhecido",
      year: d.first_publish_year ?? null,
      pages: d.number_of_pages_median ?? null,
      coverId: d.cover_i ?? null,
      color: fallbackColor(id),
      genres: [],
      synopsis: null,
    }
  );
}

/** Busca por título, autor ou ISBN. Resultados com capa vêm primeiro. */
export async function searchBooks(query: string, limit = 24): Promise<Book[]> {
  const q = query.trim();
  if (!q) return [];
  const params = new URLSearchParams({
    q,
    limit: String(limit),
    fields: "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject",
  });
  const res = await fetch(`${BASE}/search.json?${params}`, {
    headers: HEADERS,
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`Open Library respondeu ${res.status}`);
  const { docs } = (await res.json()) as { docs: SearchDoc[] };
  return docs.map(docToBook).sort((a, b) => Number(Boolean(b.coverId)) - Number(Boolean(a.coverId)));
}

type Work = {
  title: string;
  description?: string | { value: string };
  covers?: number[];
  first_publish_date?: string;
  subjects?: string[];
  authors?: { author: { key: string } }[];
};

function cleanDescription(d: Work["description"]): string | null {
  const text = typeof d === "string" ? d : d?.value;
  if (!text) return null;
  return (
    text
      .split(/\r?\n-{3,}|\r?\n\s*\r?\n\(?Source|\[source\]/i)[0]
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/\*\*?|__/g, "")
      .trim() || null
  );
}

/** Livro da base de demonstração, ou buscado na Open Library pelo id da obra. */
export async function getBook(id: string): Promise<Book | null> {
  const seed = getSeedBook(id);
  if (seed) return seed;
  if (!/^OL\d+W$/.test(id)) return null;

  const res = await fetch(`${BASE}/works/${id}.json`, { headers: HEADERS, next: { revalidate: 60 * 60 * 24 * 7 } });
  if (!res.ok) return null;
  const work = (await res.json()) as Work;

  let author = "Autor desconhecido";
  const authorKey = work.authors?.[0]?.author.key;
  if (authorKey) {
    const a = await fetch(`${BASE}${authorKey}.json`, { headers: HEADERS, next: { revalidate: 60 * 60 * 24 * 30 } })
      .then((r) => (r.ok ? (r.json() as Promise<{ name?: string }>) : null))
      .catch(() => null);
    if (a?.name) author = a.name;
  }

  const year = Number(work.first_publish_date?.match(/\d{4}/)?.[0]) || null;
  return {
    id,
    title: work.title,
    author,
    year,
    pages: null,
    coverId: work.covers?.find((c) => c > 0) ?? null,
    color: fallbackColor(id),
    genres: [],
    synopsis: cleanDescription(work.description),
  };
}
