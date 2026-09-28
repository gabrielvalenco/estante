/* eslint-disable @next/next/no-img-element -- as capas vêm da Open Library, que redireciona para
   servidores do archive.org. O otimizador de imagem do Next não segue esse redirecionamento. */
import Link from "next/link";

import { coverUrl, type Book, type CoverSize } from "@/lib/books";
import { cn } from "@/lib/utils";

type CoverBook = Pick<Book, "id" | "title" | "author" | "coverId" | "color">;

/**
 * Capa com cara de livro: canto da lombada mais reto, sombra com espessura
 * e um vinco de luz na lombada. Sem capa, vira um livro de tecido na cor da marca.
 */
export function BookCover({
  book,
  size = "M",
  className,
  href,
  priority,
  sizes,
}: {
  book: CoverBook;
  size?: CoverSize;
  className?: string;
  /** Com `href`, a capa vira link com hover de "levantar da prateleira". */
  href?: string;
  priority?: boolean;
  sizes?: string;
}) {
  const src = coverUrl(book.coverId, size);

  const cover = (
    <div
      className={cn(
        "relative aspect-[2/3] w-full overflow-hidden rounded-[3px_6px_6px_3px] bg-sunken shadow-cover",
        "after:pointer-events-none after:absolute after:inset-y-0 after:left-0 after:w-[6%] after:bg-gradient-to-r after:from-black/15 after:via-white/20 after:to-transparent",
        !href && className,
      )}
      // Enquanto a capa carrega, o espaço já tem a cor do livro.
      style={{ backgroundColor: src ? `color-mix(in oklab, ${book.color} 28%, var(--sunken))` : book.color }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          sizes={sizes}
          className="absolute inset-0 size-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col justify-between p-[9%] text-white">
          <span className="line-clamp-4 text-[clamp(0.625rem,9cqw,1rem)] leading-tight font-semibold tracking-tight">
            {book.title}
          </span>
          <span className="line-clamp-2 text-[clamp(0.5rem,7cqw,0.75rem)] opacity-80">{book.author}</span>
        </div>
      )}
    </div>
  );

  if (!href) return cover;

  return (
    <Link
      href={href}
      aria-label={`${book.title}, de ${book.author}`}
      className={cn(
        "group/cover block rounded-[3px_6px_6px_3px] [container-type:inline-size]",
        "transition-transform duration-300 ease-out hover:-translate-y-1 [&>div]:transition-shadow [&>div]:duration-300 hover:[&>div]:shadow-cover-hover",
        className,
      )}
    >
      {cover}
    </Link>
  );
}
