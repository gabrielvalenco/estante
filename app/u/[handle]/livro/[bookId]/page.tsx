import { Heart, Lock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookCover } from "@/components/book-cover";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { publicReviewByHandle } from "@/lib/db/queries";
import { formatLongDate } from "@/lib/dates";
import { formatRating } from "@/lib/format";
import { SITE } from "@/lib/site";

/**
 * Página pública de uma avaliação: é o link que vai para as redes.
 * A prévia (Open Graph) é a imagem gerada em /api/og/review. Perfil privado não expõe a review aqui.
 */

type Props = { params: Promise<{ handle: string; bookId: string }> };

/** Corta no fim de uma palavra, com reticências. */
function shorten(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : clean.slice(0, clean.lastIndexOf(" ", max)).replace(/[,.;:!?-]+$/, "") + "…";
}

export const revalidate = 300;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle, bookId } = await params;
  const data = await publicReviewByHandle(handle, bookId);
  if (!data) return { title: "Avaliação não encontrada" };
  const { entry, profile } = data;
  const rating = entry.rating === null ? null : Number(entry.rating);
  const title = `${profile.name} sobre ${entry.bookTitle}`;
  const description = profile.isPrivate
    ? "Esta avaliação é de um perfil privado."
    : [rating !== null ? `${formatRating(rating)} de 5 estrelas.` : null, entry.review ? shorten(entry.review, 180) : null].filter(Boolean).join(" ");
  // A URL da imagem muda quando a avaliação muda, para as redes não mostrarem uma prévia antiga.
  const image = `/api/og/review?u=${profile.handle}&b=${entry.bookId}&f=og&v=${entry.updatedAt.getTime()}`;
  return {
    title,
    description,
    robots: profile.isPrivate ? { index: false, follow: false } : undefined,
    openGraph: { type: "article", title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function SharedReviewPage({ params }: Props) {
  const { handle, bookId } = await params;
  const data = await publicReviewByHandle(handle, bookId);
  if (!data) notFound();
  const { entry, profile } = data;
  const rating = entry.rating === null ? null : Number(entry.rating);
  const book = { id: entry.bookId, title: entry.bookTitle, author: entry.bookAuthor, coverId: entry.bookCoverId, color: entry.bookColor };

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[32rem]"
        style={{
          background: `linear-gradient(to bottom, color-mix(in oklab, ${entry.bookColor} 22%, var(--canvas)) 0%, var(--canvas) 100%)`,
        }}
      />
      <div className="container-page animate-fade-up flex justify-center pt-10 sm:pt-16">
        <article className="w-full max-w-2xl rounded-3xl border border-line bg-surface p-6 shadow-card sm:p-10">
          <Link href={`/u/${profile.handle}`} className="inline-flex items-center gap-3">
            <UserAvatar user={profile} size={44} href={false} />
            <span>
              <span className="block font-semibold text-ink">{profile.name}</span>
              <span className="block text-sm text-ink-3">
                @{profile.handle} {entry.review ? "escreveu sobre" : "avaliou"}
              </span>
            </span>
          </Link>

          <div className="mt-8 flex gap-6 sm:gap-8">
            <BookCover book={book} size="L" href={`/livro/${book.id}`} className="w-28 shrink-0 sm:w-40" priority />
            <div className="min-w-0">
              <h1 className="text-title font-semibold break-words text-ink">{entry.bookTitle}</h1>
              <p className="mt-1 text-ink-3">
                {entry.bookAuthor}
                {entry.bookYear && ` · ${entry.bookYear}`}
              </p>
              {!profile.isPrivate && (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  {rating !== null && (
                    <>
                      <Stars value={rating} size={24} />
                      <span className="tnum text-xl font-semibold text-ambar-ink">{formatRating(rating)}</span>
                    </>
                  )}
                  {entry.liked && <Heart className="size-5 fill-ameixa text-ameixa" aria-label="Curtiu" />}
                </div>
              )}
              {entry.finishedOn && !profile.isPrivate && <p className="mt-2 text-sm text-ink-3">Terminou em {formatLongDate(entry.finishedOn)}</p>}
            </div>
          </div>

          {profile.isPrivate ? (
            <p className="mt-8 flex items-center gap-2 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-2">
              <Lock className="size-4 text-ink-3" aria-hidden />
              Esta avaliação é de um perfil privado. Só seguidores aprovados podem ver.
            </p>
          ) : (
            entry.review && (
              <blockquote className="mt-8 border-l-2 border-line-strong pl-5 text-lg leading-relaxed break-words whitespace-pre-line text-ink-2">
                {entry.review}
              </blockquote>
            )
          )}

          <div className="mt-10 flex flex-wrap gap-3 border-t border-line pt-6">
            <Button render={<Link href={`/livro/${book.id}`} />} nativeButton={false}>
              Ver o livro
            </Button>
            <Button variant="secondary" render={<Link href={`/u/${profile.handle}`} />} nativeButton={false}>
              Ver perfil de {profile.name.split(" ")[0]}
            </Button>
          </div>
        </article>
      </div>
      <p className="container-page mt-8 text-center text-sm text-ink-3">
        Registre o que você lê no{" "}
        <Link href="/" className="font-medium text-anil hover:text-anil-hover">
          {SITE.name}
        </Link>
        .
      </p>
    </>
  );
}
