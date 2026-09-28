import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/books";
import { cn } from "@/lib/utils";

/** Título de seção com link opcional à direita ("Ver tudo"). */
export function SectionHeader({
  title,
  href,
  action = "Ver tudo",
  eyebrow,
  className,
}: {
  title: ReactNode;
  href?: string;
  action?: string;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex items-end justify-between gap-4", className)}>
      <div>
        {eyebrow && <p className="mb-1 text-[0.8125rem] font-medium text-ink-3">{eyebrow}</p>}
        <h2 className="text-section font-semibold text-ink">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-anil hover:text-anil-hover"
        >
          {action}
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}
    </div>
  );
}

/**
 * Prateleira: fileira de capas que rola na horizontal no celular
 * e vira grade no desktop. As capas sangram até a borda da tela no mobile.
 */
export function Shelf({ books, className, meta }: { books: Book[]; className?: string; meta?: (book: Book) => ReactNode }) {
  return (
    <ul
      className={cn(
        "scroller -mx-4 flex gap-4 overflow-x-auto px-4 pt-1 pb-3 sm:-mx-6 sm:px-6",
        "lg:mx-0 lg:grid lg:grid-cols-6 lg:gap-5 lg:overflow-visible lg:px-0",
        className,
      )}
    >
      {books.map((book, i) => (
        <li key={book.id} className="w-[31%] shrink-0 snap-start sm:w-[22%] lg:w-auto">
          <BookCover book={book} href={`/livro/${book.id}`} priority={i < 6} />
          {meta && <div className="mt-2">{meta(book)}</div>}
        </li>
      ))}
    </ul>
  );
}
