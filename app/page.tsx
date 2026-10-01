import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { AppTeaser } from "@/components/app-teaser";
import { CoverFan, type FanBook } from "@/components/cover-fan";
import { ListCard } from "@/components/list-card";
import { ReviewCard } from "@/components/review-card";
import { SectionHeader, Shelf } from "@/components/shelf";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { BOOKS, getSeedBook, type Book } from "@/lib/books";
import { bookStats, LISTS, REVIEWS } from "@/lib/data/social";
import { byNewest, fromDemo, type ReviewView } from "@/lib/reviews";
import { countReaders, popularBooks, recentReviews, type PopularBook } from "@/lib/db/queries";
import { formatAverage } from "@/lib/format";
import { seededRandom } from "@/lib/recommend";
import { SITE } from "@/lib/site";

// Catálogo que o leque usa para recomendar e girar: só o necessário para a capa (sem sinopse).
const FAN_CATALOG: FanBook[] = BOOKS.filter((b) => b.coverId).map(({ id, title, author, coverId, color, year, pages, genres }) => ({
  id,
  title,
  author,
  coverId,
  color,
  year,
  pages,
  genres,
}));

/** Embaralha com uma semente fixa (Fisher-Yates), para todos verem a mesma ordem no mesmo período. */
function shuffled<T>(items: T[], seed: number): T[] {
  const random = seededRandom(seed);
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}

/** Leque inicial, igual para todos até a próxima revalidação: muda a cada 10 minutos. */
function initialFan(): FanBook[] {
  return shuffled(FAN_CATALOG, Math.floor(Date.now() / 600_000)).slice(0, 7);
}

const asBook = (p: PopularBook): Book => getSeedBook(p.id) ?? { ...p, genres: [], synopsis: null };

/**
 * Populares da semana: os livros que mais gente registrou nos últimos 7 dias (com pelo menos
 * 2 leitores), completados com livros do catálogo que mudam a cada semana.
 */
function weekPopular(real: PopularBook[], count = 6): Book[] {
  const picked = real.filter((p) => p.readers >= 2).map(asBook);
  const seen = new Set(picked.map((b) => b.id));
  const week = Math.floor(Date.now() / (7 * 86_400_000));
  for (const b of shuffled(FAN_CATALOG, week)) {
    if (picked.length >= count) break;
    const book = seen.has(b.id) ? undefined : getSeedBook(b.id);
    if (book) picked.push(book);
  }
  return picked;
}

// Feed com reviews reais: a página fica em cache e é atualizada quando alguém publica.
export const revalidate = 300;

export default async function Home() {
  const demo = REVIEWS.map(fromDemo).filter((r): r is ReviewView => r !== null);
  const [recent, readers, popular] = await Promise.all([recentReviews(6), countReaders(), popularBooks(7, 12)]);
  const reviews = [...recent, ...demo].sort(byNewest).slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="overflow-x-clip pt-16 pb-16 sm:pt-24 sm:pb-20">
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
          {readers > 0 && (
            <p className="mt-6 text-sm text-ink-3">
              <Link href="/leitores" className="hover:text-ink">
                <span className="tnum font-semibold text-ink">{readers.toLocaleString("pt-BR")}</span>{" "}
                {readers === 1 ? "leitor já montou a estante" : "leitores já montaram a estante"}
              </Link>
            </p>
          )}
        </div>

        <CoverFan initial={initialFan()} catalog={FAN_CATALOG} />
      </section>

      {/* App, em breve */}
      <AppTeaser />

      {/* Populares */}
      <section className="container-page mt-24">
        <SectionHeader eyebrow="Mais registrados" title="Populares esta semana" href="/livros" />
        <Shelf
          books={weekPopular(popular)}
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

/** As camadas do logo, grandes e translúcidas, no canto do bloco anil. */
function DecorLayers() {
  return (
    <svg aria-hidden viewBox="0 0 32 32" className="pointer-events-none absolute -right-16 -bottom-20 size-80 opacity-90 sm:-right-10 sm:size-96">
      <path d="M10 12a4 4 0 0 1 4-4h15v16a6 6 0 0 1-6 6H10z" fill="var(--ameixa)" opacity="0.55" />
      <path d="M17 18a4 4 0 0 1 4-4h8v10a6 6 0 0 1-6 6h-6z" fill="var(--musgo)" opacity="0.8" />
    </svg>
  );
}
