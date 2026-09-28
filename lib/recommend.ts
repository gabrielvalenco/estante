import type { Book } from "@/lib/books";

/**
 * Recomendações para o leque da home. Tudo roda no navegador, sem rede extra além
 * da lista de livros bem avaliados por quem a pessoa segue.
 *
 * Sinais:
 *   - a própria estante: notas, curtidas, gêneros e autores do que leu;
 *   - quem a pessoa segue: livros que essas pessoas curtiram ou deram 4+ estrelas.
 * Livros que a pessoa já marcou ficam de fora: o leque é para descobrir coisa nova.
 */

export type ShelfSignal = {
  bookId: string;
  author: string;
  status: "quero-ler" | "lendo" | "lido" | null;
  rating: number | null;
  liked: boolean;
};

/** Livro bem avaliado por alguém que a pessoa segue. */
export type FollowedPick = Pick<Book, "id" | "title" | "author" | "coverId" | "color" | "year" | "pages"> & {
  /** Quantas pessoas seguidas curtiram ou deram 4+ estrelas. */
  fans: number;
};

type Taste = { genres: Map<string, number>; authors: Map<string, number>; known: Set<string> };

/** Quanto um registro diz sobre o gosto: nota acima de 3 puxa para cima, abaixo puxa para baixo. */
function weight(s: ShelfSignal) {
  let w = 0;
  if (s.rating !== null) w += s.rating - 3;
  if (s.liked) w += 1.5;
  if (s.status === "lendo") w += 0.5;
  if (s.status === "quero-ler") w += 0.75; // interesse declarado
  if (s.status === "lido" && s.rating === null && !s.liked) w += 0.5;
  return w;
}

export function tasteFrom(shelf: ShelfSignal[], catalog: Map<string, Book>): Taste {
  const genres = new Map<string, number>();
  const authors = new Map<string, number>();
  for (const s of shelf) {
    const w = weight(s);
    if (!w) continue;
    for (const g of catalog.get(s.bookId)?.genres ?? []) genres.set(g, (genres.get(g) ?? 0) + w);
    authors.set(s.author, (authors.get(s.author) ?? 0) + w);
  }
  return { genres, authors, known: new Set(shelf.map((s) => s.bookId)) };
}

/** Gerador pseudoaleatório com semente: a mesma visita sorteia sempre igual (sem pular entre renders). */
export function seededRandom(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export type Ranked = { book: Book; score: number; reason: "gosto" | "seguindo" | "catalogo" };

/**
 * Ordena os candidatos. O sorteio (jitter) é grande o bastante para cada visita mudar,
 * mas pequeno perto de um sinal forte: um livro que três pessoas seguidas adoraram
 * aparece quase sempre.
 */
export function rank(
  candidates: Book[],
  taste: Taste,
  picks: Map<string, number>,
  random: () => number,
): Ranked[] {
  // Gênero muito comum ("Clássico") diz pouco sobre o gosto; gênero raro ("Ficção científica") diz muito.
  // Mesmo raciocínio do IDF em busca: peso = log(total / livros com o gênero).
  const count = new Map<string, number>();
  for (const b of candidates) for (const g of b.genres) count.set(g, (count.get(g) ?? 0) + 1);
  const idf = (g: string) => Math.log((candidates.length + 1) / ((count.get(g) ?? 0) + 1));
  const genreScore = (g: string) => Math.max(0, taste.genres.get(g) ?? 0) * idf(g);
  const genreMax = Math.max(1, ...[...taste.genres.keys()].map(genreScore));
  return candidates
    .filter((b) => !taste.known.has(b.id) && b.coverId)
    .map((book) => {
      const genre = book.genres.reduce((sum, g) => sum + genreScore(g), 0) / genreMax;
      const author = Math.max(0, taste.authors.get(book.author) ?? 0);
      const fans = picks.get(book.id) ?? 0;
      const affinity = genre * 1.5 + author * 0.8;
      const social = fans * 2;
      const score = affinity + social + random() * 1.2;
      const reason: Ranked["reason"] = social > affinity && social > 0 ? "seguindo" : affinity > 0.3 ? "gosto" : "catalogo";
      return { book, score, reason };
    })
    .sort((a, b) => b.score - a.score);
}

/** Dispõe os melhores no centro do leque: 1º no meio, 2º e 3º ao lado, e assim por diante. */
export function fanOrder<T>(items: T[]): T[] {
  const out: T[] = [];
  items.forEach((item, i) => (i % 2 === 0 ? out.push(item) : out.unshift(item)));
  return out;
}
