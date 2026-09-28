import type { Metadata } from "next";
import Link from "next/link";

import { BookGrid } from "@/components/book-grid";
import { Stars } from "@/components/stars";
import { BOOKS } from "@/lib/books";
import { bookStats } from "@/lib/data/social";
import { formatAverage, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Livros" };

const ORDERS = {
  populares: "Populares",
  "mais-bem-avaliados": "Mais bem avaliados",
  "mais-novos": "Mais novos",
} as const;
type Order = keyof typeof ORDERS;

// Gêneros por número de livros, os mais comuns primeiro.
const GENRES = Object.entries(
  BOOKS.flatMap((b) => b.genres).reduce<Record<string, number>>((acc, g) => ({ ...acc, [g]: (acc[g] ?? 0) + 1 }), {}),
)
  .sort((a, b) => b[1] - a[1])
  .map(([g]) => g);

type Props = { searchParams: Promise<{ genero?: string; ordem?: string }> };

export default async function BooksPage({ searchParams }: Props) {
  const { genero, ordem } = await searchParams;
  const order: Order = ordem && ordem in ORDERS ? (ordem as Order) : "populares";

  const filtered = BOOKS.filter((b) => !genero || b.genres.includes(genero)).sort((a, b) => {
    if (order === "mais-novos") return (b.year ?? 0) - (a.year ?? 0);
    const sa = bookStats(a.id);
    const sb = bookStats(b.id);
    return order === "mais-bem-avaliados" ? sb.avg - sa.avg : sb.readers - sa.readers;
  });

  const href = (params: { genero?: string; ordem?: Order }) => {
    const q = new URLSearchParams();
    const g = "genero" in params ? params.genero : genero;
    const o = params.ordem ?? order;
    if (g) q.set("genero", g);
    if (o !== "populares") q.set("ordem", o);
    const s = q.toString();
    return s ? `/livros?${s}` : "/livros";
  };

  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold text-ink">{genero ?? "Livros"}</h1>
          <p className="mt-2 text-ink-3">{plural(filtered.length, "livro", "livros")} na Estante</p>
        </div>
        <nav aria-label="Ordenar" className="flex rounded-full bg-sunken p-1">
          {(Object.keys(ORDERS) as Order[]).map((o) => (
            <Link
              key={o}
              href={href({ ordem: o })}
              aria-current={o === order ? "true" : undefined}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors",
                o === order ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink",
              )}
            >
              {ORDERS[o]}
            </Link>
          ))}
        </nav>
      </div>

      <nav aria-label="Gêneros" className="scroller -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <GenreChip href={href({ genero: undefined })} active={!genero}>
          Todos
        </GenreChip>
        {GENRES.map((g) => (
          <GenreChip key={g} href={href({ genero: g })} active={g === genero}>
            {g}
          </GenreChip>
        ))}
      </nav>

      <BookGrid
        books={filtered}
        className="mt-10"
        extra={(b) => (
          <p className="mt-1 flex items-center gap-1 text-xs text-ink-3">
            <Stars value={1} size={11} />
            <span className="tnum">{formatAverage(bookStats(b.id).avg)}</span>
          </p>
        )}
      />
    </div>
  );
}

function GenreChip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "shrink-0 rounded-full px-3.5 py-2 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
        active ? "bg-ink text-white" : "bg-sunken text-ink-2 hover:bg-line",
      )}
    >
      {children}
    </Link>
  );
}
