import { ArrowRight, BookOpen, Bookmark, Check } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/book-cover";
import { ListCard } from "@/components/list-card";
import { ReviewCard } from "@/components/review-card";
import { SectionHeader, Shelf } from "@/components/shelf";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { books } from "@/lib/books";
import { bookStats, LISTS, REVIEWS } from "@/lib/data/social";
import { byNewest, fromDemo, type ReviewView } from "@/lib/reviews";
import { recentReviews } from "@/lib/supabase/queries";
import { formatAverage } from "@/lib/format";
import { SITE } from "@/lib/site";
import { cn } from "@/lib/utils";

// Leque do hero: capas com cores bem diferentes entre si.
const HERO = books("OL1168083W", "OL24141556W", "OL796465W", "OL21745884W", "OL274505W", "OL18203673W", "OL10263W");
const POPULAR = books("OL18203673W", "OL21745884W", "OL24141556W", "OL1003040W", "OL8479867W", "OL1168083W");

const STATES = [
  {
    icon: Bookmark,
    title: "Quero ler",
    text: "A pilha de livros que você ainda vai ler, sem perder nenhuma indicação.",
    card: "bg-anil-soft",
    ink: "text-anil",
    books: books("OL893414W", "OL8479867W", "OL32525579W"),
  },
  {
    icon: BookOpen,
    title: "Lendo",
    text: "O que está na sua mesa de cabeceira agora, visível para quem te segue.",
    card: "bg-ameixa-soft",
    ink: "text-ameixa",
    books: books("OL1756937W", "OL274505W", "OL20965973W"),
  },
  {
    icon: Check,
    title: "Lido",
    text: "Nota de meia em meia estrela, review curta e a data em que terminou.",
    card: "bg-musgo-soft",
    ink: "text-musgo",
    books: books("OL1003040W", "OL2900596W", "OL3140822W"),
  },
];

// Feed com reviews reais: a página fica em cache e é atualizada quando alguém publica.
export const revalidate = 300;

export default async function Home() {
  const demo = REVIEWS.map(fromDemo).filter((r): r is ReviewView => r !== null);
  const reviews = [...(await recentReviews(6)), ...demo].sort(byNewest).slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="overflow-hidden pt-16 pb-12 sm:pt-24 sm:pb-16">
        <div className="container-page animate-fade-up text-center">
          <h1 className="mx-auto max-w-3xl text-hero font-semibold text-ink">{SITE.tagline}</h1>
          <p className="mx-auto mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-ink-3 sm:text-lg">
            Marque o que você <span className="font-medium text-anil">quer ler</span>, acompanhe o que está{" "}
            <span className="font-medium text-ameixa">lendo</span> e dê nota ao que já{" "}
            <span className="font-medium text-musgo">leu</span>. Com reviews curtas e listas de gente que lê de verdade.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" render={<Link href="/livros" />} nativeButton={false}>
              Começar minha estante
            </Button>
            <Button size="lg" variant="ghost" render={<Link href={`/u/${SITE.demoUser}`} />} nativeButton={false} className="text-anil hover:text-anil-hover">
              Ver um perfil
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </div>

        <CoverFan />
      </section>

      {/* Os três estados, nas cores do logo */}
      <section className="container-page mt-24 sm:mt-32">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-title font-semibold text-ink">Três cores, uma estante.</h2>
          <p className="mt-3 text-[1.0625rem] text-ink-3">
            Cada camada do logo é um momento da leitura. Você vê de relance onde cada livro está.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {STATES.map((s) => (
            <div key={s.title} className={cn("relative flex flex-col overflow-hidden rounded-3xl p-6 pb-0", s.card)}>
              <s.icon className={cn("size-6", s.ink)} strokeWidth={2} aria-hidden />
              <h3 className={cn("mt-4 text-xl font-semibold tracking-tight", s.ink)}>{s.title}</h3>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-2">{s.text}</p>
              <div className="mt-6 flex items-end justify-center gap-3 px-2">
                {s.books.map((b, i) => (
                  <div key={b.id} className={cn("w-1/3 translate-y-4", i === 1 && "translate-y-2")}>
                    <BookCover book={b} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Populares */}
      <section className="container-page mt-24">
        <SectionHeader eyebrow="Mais registrados" title="Populares esta semana" href="/livros" />
        <Shelf
          books={POPULAR}
          meta={(b) => {
            const s = bookStats(b.id);
            return (
              <p className="flex items-center gap-1.5 text-xs text-ink-3">
                <Stars value={1} size={12} />
                <span className="tnum font-medium text-ink-2">{formatAverage(s.avg)}</span>
                <span className="truncate">{b.author}</span>
              </p>
            );
          }}
        />
      </section>

      {/* Reviews */}
      <section className="container-page mt-20">
        <SectionHeader eyebrow="Da comunidade" title="Reviews recentes" href="/leitores" action="Ver leitores" />
        <div className="grid gap-x-10 gap-y-8 md:grid-cols-2">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} withBook />
          ))}
        </div>
      </section>

      {/* Listas */}
      <section className="container-page mt-20">
        <SectionHeader eyebrow="Curadoria" title="Listas em destaque" href="/listas" />
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {LISTS.map((l) => (
            <ListCard key={l.slug} list={l} />
          ))}
        </div>
      </section>

      {/* Chamada final */}
      <section className="container-page mt-24">
        <div className="relative overflow-hidden rounded-[2rem] bg-anil px-6 py-14 text-center text-on-brand dark:bg-anil-soft dark:text-ink sm:px-12 sm:py-20">
          <DecorLayers />
          <h2 className="relative text-title font-semibold">Sua estante começa com um livro.</h2>
          <p className="relative mx-auto mt-3 max-w-md text-[1.0625rem] text-on-brand/80 dark:text-ink-2">
            Sem cadastro nesta demonstração. O que você marcar fica salvo neste navegador.
          </p>
          <Button
            size="lg"
            render={<Link href="/livros" />}
            nativeButton={false}
            className="relative mt-8 bg-on-brand text-anil hover:bg-on-brand/90 dark:bg-anil dark:text-on-brand dark:hover:bg-anil-hover"
          >
            Escolher meu primeiro livro
          </Button>
        </div>
      </section>
    </>
  );
}

/** Leque de capas do hero, como cartas na mão. Some a rotação no celular para caber mais. */
function CoverFan() {
  const mid = (HERO.length - 1) / 2;
  return (
    <div className="relative mx-auto mt-14 flex max-w-5xl items-end justify-center px-4 sm:mt-20" aria-hidden>
      {HERO.map((book, i) => {
        const d = i - mid;
        return (
          <Link
            key={book.id}
            href={`/livro/${book.id}`}
            tabIndex={-1}
            className="w-[22%] shrink-0 transition-transform duration-500 ease-out hover:z-20 hover:-translate-y-3 sm:w-[16%] [&:nth-child(1)]:hidden [&:nth-child(7)]:hidden sm:[&:nth-child(1)]:block sm:[&:nth-child(7)]:block"
            style={{
              marginInline: "-1.2%",
              zIndex: 10 - Math.abs(d),
              rotate: `${d * 4}deg`,
              translate: `0 ${Math.abs(d) ** 1.6 * 10}px`,
            }}
          >
            <BookCover book={book} size="L" priority />
          </Link>
        );
      })}
    </div>
  );
}

/** As camadas do logo, grandes e translúcidas, no canto do bloco anil. */
function DecorLayers() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="pointer-events-none absolute -right-16 -bottom-20 size-80 opacity-90 sm:-right-10 sm:size-96">
      <path d="M10 12a4 4 0 0 1 4-4h15v16a6 6 0 0 1-6 6H10z" fill="var(--ameixa)" opacity="0.55" />
      <path d="M17 18a4 4 0 0 1 4-4h8v10a6 6 0 0 1-6 6h-6z" fill="var(--musgo)" opacity="0.8" />
    </svg>
  );
}
