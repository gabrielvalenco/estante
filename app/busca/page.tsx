import { Search, SearchX, WifiOff } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { BookGrid } from "@/components/book-grid";
import { SearchCombobox } from "@/components/search-combobox";
import { Skeleton } from "@/components/ui/skeleton";
import { plural } from "@/lib/format";
import { searchBooks } from "@/lib/openlibrary";

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `Busca: ${q}` : "Buscar" };
}

const SUGGESTIONS = ["Clarice Lispector", "Tolkien", "Conceição Evaristo", "Sally Rooney", "Stephen King", "Machado de Assis"];

export default async function SearchPage({ searchParams }: Props) {
  const q = (await searchParams).q?.trim() ?? "";

  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <SearchCombobox key={q} variant="page" defaultValue={q} autoFocus={!q} />

      {q ? (
        <Suspense key={q} fallback={<ResultsSkeleton />}>
          <Results q={q} />
        </Suspense>
      ) : (
        <div className="mx-auto mt-10 max-w-2xl text-center">
          <p className="text-sm text-ink-3">Busca em mais de 20 milhões de livros da Open Library. Experimente:</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <Link
                key={s}
                href={`/busca?q=${encodeURIComponent(s)}`}
                className="rounded-full bg-sunken px-3.5 py-2 text-[0.8125rem] font-medium text-ink-2 transition-colors hover:bg-line"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

async function Results({ q }: { q: string }) {
  let results;
  try {
    results = await searchBooks(q);
  } catch {
    return (
      <EmptyState icon={WifiOff} title="A Open Library não respondeu">
        A busca depende de um serviço externo que está fora do ar ou lento agora. Tente de novo em alguns segundos.
      </EmptyState>
    );
  }

  if (!results.length) {
    return (
      <EmptyState icon={SearchX} title={`Nada encontrado para "${q}"`}>
        Confira a grafia ou tente só o sobrenome do autor.
      </EmptyState>
    );
  }

  return (
    <section className="mt-10" aria-live="polite">
      <p className="mb-6 text-sm text-ink-3">
        {plural(results.length, "resultado", "resultados")} para <span className="font-medium text-ink">&ldquo;{q}&rdquo;</span>
      </p>
      <BookGrid books={results} />
    </section>
  );
}

function ResultsSkeleton() {
  return (
    <div className="mt-10" aria-busy aria-label="Buscando">
      <Skeleton className="mb-6 h-5 w-48" />
      <div className="grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-5">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i}>
            <Skeleton className="aspect-[2/3] w-full rounded-[3px_6px_6px_3px]" />
            <Skeleton className="mt-2.5 h-4 w-4/5" />
            <Skeleton className="mt-1.5 h-3.5 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, children }: { icon: typeof Search; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-16 max-w-md text-center">
      <Icon className="mx-auto size-8 text-ink-4" strokeWidth={1.5} aria-hidden />
      <p className="mt-4 text-lg font-semibold tracking-tight text-ink">{title}</p>
      <p className="mt-1.5 text-ink-3">{children}</p>
    </div>
  );
}
