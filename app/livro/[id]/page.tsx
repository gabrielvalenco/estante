import { BookOpen, Bookmark, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookActions } from "@/components/book-actions";
import { BookCover } from "@/components/book-cover";
import { ListCard } from "@/components/list-card";
import { ReviewCard } from "@/components/review-card";
import { SectionHeader } from "@/components/shelf";
import { Stars } from "@/components/stars";
import { bookStats, listsWith, reviewsFor } from "@/lib/data/social";
import { formatAverage, formatCount } from "@/lib/format";
import { BOOKS } from "@/lib/books";
import { getBook } from "@/lib/openlibrary";
import { byNewest, fromDemo, type ReviewView } from "@/lib/reviews";
import { bookReviews } from "@/lib/supabase/queries";

type Props = { params: Promise<{ id: string }> };

// Os livros de exemplo saem prontos do build. Qualquer outra obra da Open Library é gerada no primeiro acesso.
export const revalidate = 300;

export function generateStaticParams() {
  return BOOKS.map((b) => ({ id: b.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const book = await getBook((await params).id);
  if (!book) return { title: "Livro não encontrado" };
  return {
    title: `${book.title}, de ${book.author}`,
    description: book.synopsis?.slice(0, 160) ?? `Reviews e notas de ${book.title}.`,
  };
}

export default async function BookPage({ params }: Props) {
  const book = await getBook((await params).id);
  if (!book) notFound();

  const stats = bookStats(book.id);
  // Reviews de gente de verdade primeiro, depois as de demonstração (por curtidas).
  const demo = reviewsFor(book.id).map(fromDemo).filter((r): r is ReviewView => r !== null);
  const reviews = [...(await bookReviews(book.id)).sort(byNewest), ...demo];
  const lists = listsWith(book.id);

  return (
    <>
      {/* Faixa tingida com a cor da capa: cada livro tem a sua página. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem]"
        style={{
          background: `linear-gradient(to bottom, color-mix(in oklab, ${book.color} 22%, var(--canvas)) 0%, color-mix(in oklab, ${book.color} 8%, var(--canvas)) 55%, var(--canvas) 100%)`,
        }}
      />

      <div className="container-page animate-fade-up pt-8 sm:pt-12">
        <div className="grid gap-8 md:grid-cols-[200px_1fr] lg:grid-cols-[240px_1fr_320px] lg:gap-x-10">
          {/* Capa */}
          <div className="mx-auto w-44 sm:w-52 md:mx-0 md:w-full lg:row-span-2">
            <BookCover book={book} size="L" priority />
          </div>

          {/* Informações */}
          <div className="min-w-0">
            {book.genres.length > 0 && (
              <ul className="mb-3 flex flex-wrap gap-1.5">
                {book.genres.map((g) => (
                  <li key={g} className="rounded-full bg-surface/70 px-2.5 py-1 text-xs font-medium text-ink-2 ring-1 ring-black/5">
                    {g}
                  </li>
                ))}
              </ul>
            )}
            <h1 className="text-title font-semibold text-ink">{book.title}</h1>
            <p className="mt-2 text-lg text-ink-2">
              <Link href={`/busca?q=${encodeURIComponent(book.author)}`} className="font-medium hover:underline">
                {book.author}
              </Link>
              {book.year && <span className="text-ink-3"> · {book.year}</span>}
              {book.pages && <span className="text-ink-3"> · {book.pages} páginas</span>}
            </p>

            {/* Números */}
            <div className="mt-6 flex flex-wrap items-end gap-x-8 gap-y-5">
              <div>
                <p className="flex items-baseline gap-2">
                  <span className="tnum text-5xl leading-none font-semibold tracking-tight text-ink">{formatAverage(stats.avg)}</span>
                  <Stars value={stats.avg} size={16} />
                </p>
                <p className="mt-1.5 text-[0.8125rem] text-ink-3">média de {formatCount(stats.readers)} notas</p>
              </div>
              <RatingHistogram histogram={stats.histogram} />
            </div>

            <dl className="mt-6 grid grid-cols-3 gap-2 sm:max-w-md">
              <Stat icon={Users} label="leram" value={formatCount(stats.readers)} className="text-musgo" />
              <Stat icon={BookOpen} label="lendo agora" value={formatCount(stats.reading)} className="text-ameixa" />
              <Stat icon={Bookmark} label="querem ler" value={formatCount(stats.wantToRead)} className="text-anil" />
            </dl>

          </div>

          {/* Ações: no desktop ficam presas ao rolar */}
          <aside className="md:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <div className="lg:sticky lg:top-20">
              <BookActions book={book} />
            </div>
          </aside>

          {book.synopsis && (
            <section className="max-w-2xl md:col-span-2 lg:col-span-1 lg:col-start-2">
              <h2 className="mb-2 text-xs font-semibold tracking-wide text-ink-3 uppercase">Sinopse</h2>
              <p className="text-[1.0625rem] leading-relaxed whitespace-pre-line text-ink-2">{book.synopsis}</p>
            </section>
          )}
        </div>

        {/* Reviews */}
        <section className="mt-16 max-w-3xl lg:ml-[280px]">
          <SectionHeader title="Reviews populares" eyebrow={reviews.length ? `${reviews.length} na Estante` : undefined} />
          {reviews.length ? (
            <div className="divide-y divide-line">
              {reviews.map((r) => (
                <ReviewCard key={r.id} review={r} className="py-6 first:pt-0" />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
              <p className="font-medium text-ink">Ninguém escreveu sobre este livro ainda</p>
              <p className="mt-1 text-sm text-ink-3">Registre sua leitura e seja a primeira review.</p>
            </div>
          )}
        </section>

        {lists.length > 0 && (
          <section className="mt-16">
            <SectionHeader title="Aparece nas listas" />
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {lists.map((l) => (
                <ListCard key={l.slug} list={l} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function Stat({ icon: Icon, label, value, className }: { icon: typeof Users; label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl bg-surface/70 px-3 py-2.5 ring-1 ring-black/5">
      <dt className="flex items-center gap-1.5 text-xs text-ink-3">
        <Icon className={`size-3.5 ${className}`} aria-hidden />
        {label}
      </dt>
      <dd className="tnum mt-0.5 text-[1.0625rem] font-semibold tracking-tight text-ink">{value}</dd>
    </div>
  );
}

/** Distribuição das notas em 10 colunas, de meia a cinco estrelas. */
function RatingHistogram({ histogram }: { histogram: number[] }) {
  return (
    <div className="flex items-end gap-3" aria-hidden>
      <span className="text-[0.625rem] text-ink-4">½</span>
      <div className="flex h-12 items-end gap-[3px]">
        {histogram.map((h, i) => (
          <span
            key={i}
            className="w-3 rounded-t-[3px] bg-ambar"
            style={{ height: `${Math.max(6, h * 100)}%`, opacity: 0.35 + h * 0.65 }}
          />
        ))}
      </div>
      <span className="text-[0.625rem] text-ink-4">5★</span>
    </div>
  );
}
