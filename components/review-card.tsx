import { Heart, RotateCcw } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/book-cover";
import { SpoilerText } from "@/components/spoiler-text";
import { Stars } from "@/components/stars";
import { UserAvatar } from "@/components/user-avatar";
import { formatCount, formatRelative } from "@/lib/format";
import type { ReviewView } from "@/lib/reviews";
import { cn } from "@/lib/utils";

/**
 * Review no estilo Letterboxd: curta, com personalidade.
 * `withBook` mostra a capa e o título (feed); sem ele, é a review dentro da página do livro.
 */
export function ReviewCard({ review, withBook = false, className }: { review: ReviewView; withBook?: boolean; className?: string }) {
  const { user, book } = review;

  return (
    <article className={cn("flex gap-4", className)}>
      {withBook && <BookCover book={book} size="M" href={`/livro/${book.id}`} className="w-16 shrink-0 sm:w-[72px]" />}
      <div className="min-w-0 flex-1">
        {withBook && (
          <h3 className="mb-1 truncate text-[0.9375rem] font-semibold tracking-tight text-ink">
            <Link href={`/livro/${book.id}`} className="hover:underline">
              {book.title}
            </Link>{" "}
            {book.year && <span className="font-normal text-ink-3">{book.year}</span>}
          </h3>
        )}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-ink-3">
          <UserAvatar user={user} size={22} />
          <Link href={`/u/${user.handle}`} className="font-medium text-ink-2 hover:text-ink">
            {user.name}
          </Link>
          {review.rating && <Stars value={review.rating} size={13} />}
          {review.liked && <Heart className="size-3.5 fill-ameixa text-ameixa" aria-label="Curtiu" />}
          {review.reread && <RotateCcw className="size-3.5 text-ink-4" aria-label="Releitura" />}
          <span aria-hidden>·</span>
          <time dateTime={review.date}>{formatRelative(review.date)}</time>
        </div>
        <div className="mt-2 text-[0.9375rem] leading-relaxed break-words whitespace-pre-line text-ink-2">
          {review.spoiler ? <SpoilerText text={review.text} /> : <p>{review.text}</p>}
        </div>
        {review.likes !== null && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-4">
            <Heart className="size-3.5" aria-hidden />
            {formatCount(review.likes)} curtidas
          </p>
        )}
      </div>
    </article>
  );
}
