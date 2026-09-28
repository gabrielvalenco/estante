// Gera lib/data/books.json a partir da Open Library.
// Uso: node scripts/seed-books.mjs
// Para cada livro: metadados, capa e a cor viva da capa (usada para tingir a página do livro).
import { writeFile } from "node:fs/promises";
import sharp from "sharp";

// `isbn` fixa uma edição com capa melhor quando a capa padrão da obra é fraca.
const SEED = [
  { title: "Dom Casmurro", author: "Machado de Assis", pt: "Dom Casmurro" },
  { title: "Memórias Póstumas de Brás Cubas", author: "Machado de Assis", pt: "Memórias Póstumas de Brás Cubas" },
  { title: "A Hora da Estrela", author: "Clarice Lispector", pt: "A Hora da Estrela" },
  { title: "Grande Sertão", author: "João Guimarães Rosa", pt: "Grande Sertão: Veredas" },
  { title: "Vidas Secas", author: "Graciliano Ramos", pt: "Vidas Secas" },
  { title: "Capitães da Areia", author: "Jorge Amado", pt: "Capitães da Areia" },
  { title: "Torto Arado", author: "Itamar Vieira Junior", pt: "Torto Arado" },
  { title: "O Alquimista", author: "Paulo Coelho", pt: "O Alquimista" },
  { title: "Nineteen Eighty-Four", author: "George Orwell", pt: "1984", isbn: "9780451524935" },
  { title: "Le Petit Prince", author: "Antoine de Saint-Exupéry", pt: "O Pequeno Príncipe", isbn: "9780156012195" },
  { title: "Cien años de soledad", author: "Gabriel García Márquez", pt: "Cem Anos de Solidão", isbn: "9780060883287" },
  { title: "Harry Potter and the Philosopher's Stone", author: "J. K. Rowling", pt: "Harry Potter e a Pedra Filosofal" },
  { title: "The Hobbit", author: "J.R.R. Tolkien", pt: "O Hobbit" },
  { title: "Dune", author: "Frank Herbert", pt: "Duna" },
  { title: "Pride and Prejudice", author: "Jane Austen", pt: "Orgulho e Preconceito", isbn: "9780141439518" },
  { title: "Sapiens", author: "Yuval Noah Harari", pt: "Sapiens" },
  { title: "Die Verwandlung", author: "Franz Kafka", pt: "A Metamorfose", isbn: "9780553213690" },
  { title: "The Name of the Wind", author: "Patrick Rothfuss", pt: "O Nome do Vento" },
  { title: "Project Hail Mary", author: "Andy Weir", pt: "Devoradores de Estrelas" },
  { title: "The Great Gatsby", author: "F. Scott Fitzgerald", pt: "O Grande Gatsby", isbn: "9780743273565" },
  { title: "Ensaio sobre a cegueira", author: "José Saramago", pt: "Ensaio sobre a Cegueira" },
  { title: "Norwegian Wood", author: "Haruki Murakami", pt: "Norwegian Wood", isbn: "9780375704024" },
  { title: "The Midnight Library", author: "Matt Haig", pt: "A Biblioteca da Meia-Noite" },
  { title: "Crime and Punishment", author: "Fyodor Dostoevsky", pt: "Crime e Castigo" },
  { title: "To Kill a Mockingbird", author: "Harper Lee", pt: "O Sol é Para Todos" },
  { title: "The Seven Husbands of Evelyn Hugo", author: "Taylor Jenkins Reid", pt: "Os Sete Maridos de Evelyn Hugo" },
  { title: "Frankenstein", author: "Mary Shelley", pt: "Frankenstein" },
  { title: "Brave New World", author: "Aldous Huxley", pt: "Admirável Mundo Novo" },
];

const UA = { "User-Agent": "Estante portfolio seed (github.com/gabrielvalenco)" };

async function json(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

/**
 * Cor "viva" da capa: agrupa os pixels em baldes de matiz e escolhe o balde
 * com mais área ponderada pela saturação. Capas preto e branco caem num cinza neutro.
 */
async function coverColor(coverId) {
  const res = await fetch(`https://covers.openlibrary.org/b/id/${coverId}-M.jpg`, { headers: UA });
  const buf = Buffer.from(await res.arrayBuffer());
  const { data } = await sharp(buf).resize(40, 60, { fit: "fill" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const buckets = new Map();
  for (let i = 0; i < data.length; i += 3) {
    const [r, g, b] = [data[i] / 255, data[i + 1] / 255, data[i + 2] / 255];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    if (s < 0.25 || l < 0.12 || l > 0.9) continue;
    let h = 0;
    if (max === r) h = ((g - b) / (max - min)) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    const key = Math.round(((h * 60 + 360) % 360) / 20);
    const bucket = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
    const w = s * (1 - Math.abs(l - 0.5));
    bucket.w += w;
    bucket.r += data[i] * w;
    bucket.g += data[i + 1] * w;
    bucket.b += data[i + 2] * w;
    buckets.set(key, bucket);
  }

  const best = [...buckets.values()].sort((a, b) => b.w - a.w)[0];
  if (!best || best.w < 25) return "#6e6e73";
  const hex = (n) => Math.round(n).toString(16).padStart(2, "0");
  return `#${hex(best.r / best.w)}${hex(best.g / best.w)}${hex(best.b / best.w)}`;
}

function cleanDescription(d) {
  const text = typeof d === "string" ? d : d?.value;
  if (!text) return null;
  return text
    .split(/\r?\n-{3,}|\r?\n\s*\r?\n\(?Source|\[source\]|\r?\n\s*\r?\n\*\*/i)[0]
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

const out = [];
for (const item of SEED) {
  const q = new URLSearchParams({
    title: item.title,
    author: item.author,
    limit: "5",
    fields: "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,subject",
  });
  const { docs } = await json(`https://openlibrary.org/search.json?${q}`);
  const doc = docs.find((d) => d.cover_i);
  if (!doc) {
    console.warn("sem resultado:", item.title);
    continue;
  }
  const id = doc.key.replace("/works/", "");
  const work = await json(`https://openlibrary.org/works/${id}.json`).catch(() => ({}));

  if (item.isbn) {
    const edition = await json(`https://openlibrary.org/isbn/${item.isbn}.json`).catch(() => null);
    const cover = edition?.covers?.find((c) => c > 0);
    if (cover) doc.cover_i = cover;
    else console.warn("isbn sem capa:", item.isbn);
  }
  const color = await coverColor(doc.cover_i).catch(() => "#6e6e73");

  out.push({
    id,
    title: item.pt,
    author: item.author,
    year: doc.first_publish_year ?? null,
    pages: doc.number_of_pages_median ?? null,
    coverId: doc.cover_i,
    color,
    subjects: (doc.subject ?? []).slice(0, 4),
    description: cleanDescription(work.description),
  });
  console.log("ok", id, item.pt, color);
}

await writeFile(new URL("../lib/data/books.json", import.meta.url), JSON.stringify(out, null, 2) + "\n");
console.log(`\n${out.length} livros salvos.`);
