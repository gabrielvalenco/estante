import { Heart, RotateCcw } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/book-cover";
import { ListCard } from "@/components/list-card";
import { ReviewCard } from "@/components/review-card";
import { Stars } from "@/components/stars";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { List } from "@/lib/data/social";
import { formatMonth } from "@/lib/format";
import type { DiaryItem, ProfileContent } from "@/lib/profiles";

/**
 * Conteúdo do perfil: números, meta, favoritos, lendo agora, diário e reviews.
 * Sem "use client" e sem nada de servidor: roda na página pública (perfil aberto)
 * e dentro do cadeado no navegador (perfil privado, para quem tem acesso).
 */
export function ProfileBody({
  content,
  goal,
  firstName,
  lists = [],
  showLists = false,
}: {
  content: ProfileContent;
  goal: number;
  firstName: string;
  lists?: List[];
  showLists?: boolean;
}) {
  const { diary, reviews, favorites, reading, readThisYear } = content;
  const progress = Math.min(1, readThisYear / goal);
  const year = new Date().getFullYear();
  const months = Object.entries(
    diary.reduce<Record<string, DiaryItem[]>>((acc, d) => {
      (acc[d.date.slice(0, 7)] ??= []).push(d);
      return acc;
    }, {}),
  );

  return (
    <>
      <dl className="mt-8 grid grid-cols-3 gap-2 sm:max-w-md">
        <ProfileStat label={`em ${year}`} value={readThisYear} />
        <ProfileStat label="reviews" value={reviews.length} />
        <ProfileStat label={showLists ? "listas" : "na estante"} value={showLists ? lists.length : content.shelfCount} />
      </dl>

      <div className="mt-6 rounded-2xl bg-musgo-soft p-5">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <p className="font-medium text-musgo">Meta de leitura de {year}</p>
          <p className="tnum text-ink-2">
            <span className="font-semibold text-ink">{readThisYear}</span> de {goal} livros
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-surface/70"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da meta"
        >
          <div className="h-full rounded-full bg-musgo" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {favorites.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-ink-3 uppercase">Favoritos</h2>
          <ul className="grid grid-cols-4 gap-3 sm:gap-5 lg:max-w-2xl">
            {favorites.map((b) => (
              <li key={b.id}>
                <BookCover book={b} size="L" href={`/livro/${b.id}`} priority />
              </li>
            ))}
          </ul>
        </section>
      )}

      {reading.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xs font-semibold tracking-wide text-ameixa uppercase">Lendo agora</h2>
          <ul className="flex flex-wrap gap-4">
            {reading.map((b) => (
              <li key={b.id} className="flex w-full max-w-xs items-center gap-3 rounded-2xl bg-ameixa-soft p-3">
                <BookCover book={b} size="M" href={`/livro/${b.id}`} className="w-12 shrink-0" />
                <Link href={`/livro/${b.id}`} className="min-w-0">
                  <p className="truncate font-medium tracking-tight text-ink">{b.title}</p>
                  <p className="truncate text-[0.8125rem] text-ink-3">{b.author}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Tabs defaultValue="diario" className="mt-14">
        <TabsList className="h-10 rounded-full p-1">
          <TabsTrigger value="diario" className="rounded-full px-4">
            Diário
          </TabsTrigger>
          <TabsTrigger value="reviews" className="rounded-full px-4">
            Reviews
          </TabsTrigger>
          {showLists && (
            <TabsTrigger value="listas" className="rounded-full px-4">
              Listas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="diario" className="mt-8 max-w-3xl">
          {months.length === 0 && <Empty>{firstName} ainda não registrou nenhuma leitura terminada.</Empty>}
          {months.map(([month, items]) => (
            <section key={month} className="mb-10">
              <h3 className="sticky top-14 z-10 -mx-1 mb-2 bg-canvas/90 px-1 py-2 text-sm font-semibold text-ink backdrop-blur">
                {formatMonth(`${month}-01`)}
              </h3>
              <ol className="divide-y divide-line">
                {items.map((e) => (
                  <li key={`${e.book.id}-${e.date}`} className="flex items-center gap-4 py-3">
                    <span className="tnum w-8 shrink-0 text-center text-2xl font-semibold tracking-tight text-ink-4">
                      {Number(e.date.slice(8))}
                    </span>
                    <BookCover book={e.book} size="S" href={`/livro/${e.book.id}`} className="w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/livro/${e.book.id}`} className="block truncate font-medium tracking-tight text-ink hover:underline">
                        {e.book.title}
                      </Link>
                      <p className="truncate text-[0.8125rem] text-ink-3">
                        {e.book.author}
                        {e.book.year && ` · ${e.book.year}`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {e.rating && <Stars value={e.rating} size={13} />}
                      {e.liked && <Heart className="size-3.5 fill-ameixa text-ameixa" aria-label="Curtiu" />}
                      {e.reread && <RotateCcw className="size-3.5 text-ink-4" aria-label="Releitura" />}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="reviews" className="mt-8 max-w-3xl">
          {reviews.length === 0 && <Empty>{firstName} ainda não escreveu reviews.</Empty>}
          <div className="divide-y divide-line">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} withBook className="py-6 first:pt-0" />
            ))}
          </div>
        </TabsContent>

        {showLists && (
          <TabsContent value="listas" className="mt-8">
            {lists.length ? (
              <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {lists.map((l) => (
                  <ListCard key={l.slug} list={l} />
                ))}
              </div>
            ) : (
              <Empty>{firstName} ainda não criou listas.</Empty>
            )}
          </TabsContent>
        )}
      </Tabs>
    </>
  );
}

function ProfileStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col-reverse rounded-xl bg-surface px-3 py-3 text-center ring-1 ring-line">
      <dt className="text-xs text-ink-3">{label}</dt>
      <dd className="tnum text-2xl font-semibold tracking-tight text-ink">{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center text-ink-3">{children}</p>;
}
