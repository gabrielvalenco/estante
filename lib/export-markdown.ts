/**
 * Anotações em Markdown: um arquivo que abre em qualquer editor e entra direto no Notion,
 * no Obsidian e no Google Docs. Função pura (testável e usada pela rota de exportação).
 */

export type ExportAnnotation = { bookId: string; kind: "quote" | "note"; text: string; comment: string; page: number | null; createdAt: Date };
export type ExportBook = {
  id: string;
  title: string;
  author: string;
  status?: "quero-ler" | "lendo" | "lido" | null;
  rating?: number | null;
  finishedOn?: string | null;
  review?: string;
  bookmark?: { page: number; totalPages: number | null } | null;
};

const STATUS = { "quero-ler": "Quero ler", lendo: "Lendo", lido: "Lido" } as const;

/** Tira do texto o que o Markdown leria como formatação no começo da linha. */
function escapeLine(line: string) {
  return line.replace(/^(\s*)([#>*+-]|\d+\.)(\s)/, "$1\\$2$3");
}

const quoteBlock = (text: string) =>
  text
    .split("\n")
    .map((l) => `> ${escapeLine(l)}`.trimEnd())
    .join("\n");

const stars = (r: number) => "★".repeat(Math.floor(r)) + (r % 1 ? "½" : "");

function brDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export function annotationsToMarkdown(books: ExportBook[], annotations: ExportAnnotation[], opts: { exportedAt: Date; site: string }): string {
  const byBook = new Map<string, ExportAnnotation[]>();
  for (const a of annotations) byBook.set(a.bookId, [...(byBook.get(a.bookId) ?? []), a]);

  const out: string[] = [];
  if (books.length > 1) {
    out.push(
      "# Minhas anotações",
      "",
      `Exportado da Estante (${opts.site}) em ${opts.exportedAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. ${books.length} livros, ${annotations.length} anotações.`,
      "",
    );
  }
  const level = books.length > 1 ? "##" : "#";

  for (const b of books) {
    const items = (byBook.get(b.id) ?? []).slice().sort((x, y) => (x.page ?? Infinity) - (y.page ?? Infinity) || x.createdAt.getTime() - y.createdAt.getTime());
    out.push(`${level} ${b.title}`, "");
    const meta = [
      b.author ? `**${b.author}**` : null,
      b.status ? STATUS[b.status] + (b.status === "lido" && b.finishedOn ? ` em ${brDate(b.finishedOn)}` : "") : null,
      b.rating ? stars(b.rating) : null,
      b.bookmark && b.status === "lendo" ? `Parei na página ${b.bookmark.page}${b.bookmark.totalPages ? ` de ${b.bookmark.totalPages}` : ""}` : null,
    ].filter(Boolean);
    if (meta.length) out.push(meta.join(" · "), "");
    if (b.review) out.push(`${level}# Minha review`, "", b.review.split("\n").map(escapeLine).join("\n"), "");

    const quotes = items.filter((a) => a.kind === "quote");
    const notes = items.filter((a) => a.kind === "note");
    if (quotes.length) {
      out.push(`${level}# Citações`, "");
      for (const q of quotes) {
        out.push(quoteBlock(q.text));
        if (q.page) out.push(`> — p. ${q.page}`);
        out.push("");
        if (q.comment) out.push(q.comment.split("\n").map(escapeLine).join("\n"), "");
      }
    }
    if (notes.length) {
      out.push(`${level}# Notas`, "");
      for (const n of notes) {
        const [first, ...rest] = n.text.split("\n");
        out.push(`- ${n.page ? `**p. ${n.page}:** ` : ""}${escapeLine(first)}`);
        for (const l of rest) out.push(`  ${l}`.trimEnd());
      }
      out.push("");
    }
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/** Nome de arquivo sem acentos nem espaços. */
export function slug(text: string) {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "livro"
  );
}
