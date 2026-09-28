import Link from "next/link";
import type { ReactNode } from "react";

import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/books";
import { cn } from "@/lib/utils";

/** Grade de capas com título e autor. `rank` numera os itens (listas ordenadas). */
export function BookGrid({
  books,
  rank,
  className,
  extra,
}: {
  books: Book[];
  rank?: boolean;
  className?: string;
  extra?: (book: Book) => ReactNode;
}) {
  return (
    <ol className={cn("grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-5", className)}>
      {books.map((book, i) => (
        <li key={book.id} className="min-w-0">
          <div className="relative">
            <BookCover book={book} href={`/livro/${book.id}`} priority={i < 6} />
            {rank && (
              <span className="tnum absolute -top-2 -left-2 z-10 flex size-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-on-ink shadow-card">
                {i + 1}
              </span>
            )}
          </div>
          <Link href={`/livro/${book.id}`} className="mt-2.5 block">
            <p className="line-clamp-2 text-[0.875rem] leading-snug font-medium tracking-tight text-ink">{book.title}</p>
            <p className="mt-0.5 truncate text-[0.8125rem] text-ink-3">{book.author}</p>
          </Link>
          {extra?.(book)}
        </li>
      ))}
    </ol>
  );
}
