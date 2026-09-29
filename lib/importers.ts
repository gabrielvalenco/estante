/**
 * Leitura dos arquivos que as pessoas trazem de outros lugares. Funções puras: rodam no navegador
 * (para mostrar a prévia antes de importar) e o servidor valida de novo o que chega.
 *
 * - Kindle: "My Clippings.txt" (pasta documents do Kindle), em português ou inglês.
 * - Goodreads: CSV de My Books → Import and export → Export library.
 */

// ------------------------------------------------------------
// Kindle
// ------------------------------------------------------------

export type KindleClip = { kind: "quote" | "note"; text: string; page: number | null; location: string | null };
export type KindleBook = { key: string; title: string; author: string; clips: KindleClip[] };

const KIND = [
  { kind: "quote" as const, re: /highlight|destaque|subrayado|surlignement|markierung/i },
  { kind: "note" as const, re: /\bnote\b|\bnota\b|remarque|notiz/i },
  { kind: null, re: /bookmark|marcador|signet|lesezeichen/i },
];

/** "Título (Autor)" → título e autor. O autor é o último parêntese da linha. */
function splitTitle(line: string) {
  const m = line.match(/^(.*)\(([^()]*)\)\s*$/);
  const title = (m ? m[1] : line).trim();
  const author = (m ? m[2] : "").trim();
  // Kindle usa "Sobrenome, Nome" em alguns livros.
  const pretty = /^[^,]+,\s*[^,]+$/.test(author) ? author.split(/,\s*/).reverse().join(" ") : author;
  return { title: title || line.trim(), author: pretty };
}

export function parseKindleClippings(raw: string): { books: KindleBook[]; skipped: number } {
  const books = new Map<string, KindleBook>();
  let skipped = 0;
  const blocks = raw.replace(/^﻿/, "").replace(/\r\n?/g, "\n").split(/\n?==========\s*\n?/);

  for (const block of blocks) {
    const lines = block.split("\n").map((l) => l.replace(/^﻿/, "").trim());
    while (lines.length && !lines[0]) lines.shift();
    if (lines.length < 2) continue;
    const [head, meta, ...rest] = lines;
    if (!meta.startsWith("-")) {
      skipped++;
      continue;
    }
    const kind = KIND.find((k) => k.re.test(meta))?.kind;
    const text = rest.join("\n").trim();
    // Marcadores não têm texto; o aviso de "limite de recortes" do Kindle também não é trecho.
    if (!kind || !text || /^<.*(clipping limit|limite de recorte).*>$/i.test(text)) {
      skipped++;
      continue;
    }
    const page = Number(meta.match(/(?:page|página|pagina|seite)\s+(\d+)/i)?.[1]) || null;
    const location = meta.match(/(?:location|posição|posicao|posición|loc\.?)\s+([\d-]+)/i)?.[1] ?? null;
    const { title, author } = splitTitle(head);
    const key = `${title}\u0000${author}`.toLowerCase();
    const book = books.get(key) ?? { key, title, author, clips: [] };
    // O Kindle guarda de novo o destaque quando ele é ajustado: fica só a versão mais completa.
    const start = location?.split("-")[0];
    const dup = book.clips.findIndex(
      (c) => c.kind === kind && start && c.location?.split("-")[0] === start && (c.text.includes(text) || text.includes(c.text)),
    );
    if (dup >= 0) {
      if (text.length > book.clips[dup].text.length) book.clips[dup] = { kind, text, page, location };
    } else if (!book.clips.some((c) => c.kind === kind && c.text === text)) {
      book.clips.push({ kind, text, page, location });
    }
    books.set(key, book);
  }
  return { books: [...books.values()].filter((b) => b.clips.length), skipped };
}

// ------------------------------------------------------------
// Goodreads
// ------------------------------------------------------------

export type GoodreadsBook = {
  key: string;
  title: string;
  author: string;
  isbn: string | null;
  status: "quero-ler" | "lendo" | "lido";
  rating: number | null;
  review: string;
  finishedOn: string | null;
  addedOn: string | null;
  pages: number | null;
  year: number | null;
};

/** CSV (RFC 4180): aspas, vírgulas e quebras de linha dentro de campos. */
export function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const text = raw.replace(/^﻿/, "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const SHELF: Record<string, GoodreadsBook["status"]> = { read: "lido", "currently-reading": "lendo", "to-read": "quero-ler" };

const cleanIsbn = (v: string | undefined) => {
  const digits = (v ?? "").replace(/[^0-9X]/gi, "");
  return digits.length === 13 || digits.length === 10 ? digits : null;
};
const toISO = (v: string | undefined) => {
  const m = (v ?? "").match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  return m ? `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}` : null;
};
const stripHtml = (v: string) =>
  v
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();

export function parseGoodreadsCsv(raw: string): { books: GoodreadsBook[]; skipped: number } {
  const [header, ...rows] = parseCsv(raw);
  if (!header) return { books: [], skipped: 0 };
  const col = (name: string) => header.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  const idx = {
    title: col("Title"),
    author: col("Author"),
    isbn: col("ISBN"),
    isbn13: col("ISBN13"),
    rating: col("My Rating"),
    pages: col("Number of Pages"),
    year: col("Original Publication Year"),
    yearPub: col("Year Published"),
    dateRead: col("Date Read"),
    dateAdded: col("Date Added"),
    shelf: col("Exclusive Shelf"),
    review: col("My Review"),
  };
  if (idx.title < 0 || idx.shelf < 0) throw new Error("not_goodreads");

  let skipped = 0;
  const books: GoodreadsBook[] = [];
  for (const r of rows) {
    const title = (r[idx.title] ?? "").trim();
    if (!title) {
      skipped++;
      continue;
    }
    const rating = Number(r[idx.rating]) || null;
    const review = stripHtml(r[idx.review] ?? "");
    books.push({
      key: `${title}\u0000${r[idx.author] ?? ""}`.toLowerCase(),
      title,
      author: (r[idx.author] ?? "").trim(),
      isbn: cleanIsbn(r[idx.isbn13]) ?? cleanIsbn(r[idx.isbn]),
      // Estantes próprias (além das três padrão) viram "quero ler".
      status: SHELF[(r[idx.shelf] ?? "").trim()] ?? "quero-ler",
      rating: rating && rating >= 1 && rating <= 5 ? rating : null,
      review: review.length > 600 ? review.slice(0, 599).trimEnd() + "…" : review,
      finishedOn: toISO(r[idx.dateRead]),
      addedOn: toISO(r[idx.dateAdded]),
      pages: Number(r[idx.pages]) || null,
      year: Number(r[idx.year]) || Number(r[idx.yearPub]) || null,
    });
  }
  return { books, skipped };
}

/** Título para a busca: sem série "(Jogos Vorazes, #1)" e sem subtítulo. */
export function searchTitle(title: string) {
  return title
    .replace(/\s*\([^)]*#\s*\d+[^)]*\)\s*$/, "")
    .replace(/\s*[:–—].*$/, "")
    .trim();
}
