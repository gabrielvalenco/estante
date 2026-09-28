import { Heart, RotateCcw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCover } from "@/components/book-cover";
import { FollowSection } from "@/components/follow-button";
import { ListCard } from "@/components/list-card";
import { OwnProfileActions } from "@/components/own-profile-actions";
import { ReviewCard } from "@/components/review-card";
import { Stars } from "@/components/stars";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserAvatar } from "@/components/user-avatar";
import { USERS } from "@/lib/data/social";
import { formatMonth } from "@/lib/format";
import { getProfileView, type DiaryItem } from "@/lib/profiles";

type Props = { params: Promise<{ handle: string }> };

// Perfis de demonstração saem prontos do build; os reais são gerados no primeiro acesso
// e atualizados quando a pessoa mexe na estante (revalidatePath) ou a cada 5 minutos.
export const revalidate = 300;

export function generateStaticParams() {
  return USERS.map((u) => ({ handle: u.handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getProfileView((await params).handle);
  return { title: profile ? `${profile.name} (@${profile.handle})` : "Leitor não encontrado" };
}

export default async function ProfilePage({ params }: Props) {
  const profile = await getProfileView((await params).handle);
  if (!profile) notFound();

  const { diary, reviews, lists, favorites, reading } = profile;
  const progress = Math.min(1, profile.readThisYear / profile.goal);
  const firstName = profile.name.split(" ")[0];
  const year = new Date().getFullYear();

  const months = Object.entries(
    diary.reduce<Record<string, DiaryItem[]>>((acc, d) => {
      (acc[d.date.slice(0, 7)] ??= []).push(d);
      return acc;
    }, {}),
  );

  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      {/* Cabeçalho */}
      <header className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-5">
          <UserAvatar user={profile} size={88} href={false} />
          <div className="min-w-0">
            <h1 className="text-title font-semibold break-words text-ink">{profile.name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-ink-3">
              @{profile.handle}
              <OwnProfileActions handle={profile.handle} />
            </p>
            {profile.bio && <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">{profile.bio}</p>}
            {profile.followers !== null && profile.following !== null ? (
              <FollowSection handle={profile.handle} followers={profile.followers} following={profile.following} />
            ) : (
              <p className="mt-4 inline-flex rounded-full bg-sunken px-3 py-1 text-xs font-medium text-ink-3">
                Leitor de demonstração
              </p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-2 lg:w-[26rem]">
          <ProfileStat label={`em ${year}`} value={profile.readThisYear} />
          <ProfileStat label="reviews" value={reviews.length} />
          <ProfileStat label={profile.isDemo ? "listas" : "na estante"} value={profile.isDemo ? lists.length : diary.length + reading.length} />
        </dl>
      </header>

      {/* Meta do ano */}
      <div className="mt-8 rounded-2xl bg-musgo-soft p-5">
        <div className="flex items-baseline justify-between gap-4 text-sm">
          <p className="font-medium text-musgo">Meta de leitura de {year}</p>
          <p className="tnum text-ink-2">
            <span className="font-semibold text-ink">{profile.readThisYear}</span> de {profile.goal} livros
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

      {/* Top 4 */}
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

      {/* Lendo agora */}
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
          {profile.isDemo && (
            <TabsTrigger value="listas" className="rounded-full px-4">
              Listas
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="diario" className="mt-8 max-w-3xl">
          {months.length === 0 && <Empty>{firstName} ainda não registrou nenhuma leitura terminada.</Empty>}
          {months.map(([month, entries]) => (
            <section key={month} className="mb-10">
              <h3 className="sticky top-14 z-10 -mx-1 mb-2 bg-canvas/90 px-1 py-2 text-sm font-semibold text-ink backdrop-blur">
                {formatMonth(`${month}-01`)}
              </h3>
              <ol className="divide-y divide-line">
                {entries.map((e) => (
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

        {profile.isDemo && (
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
    </div>
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
