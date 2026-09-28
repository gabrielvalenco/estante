import { Heart } from "lucide-react";
import Link from "next/link";

import { BookCover } from "@/components/book-cover";
import { UserAvatar } from "@/components/user-avatar";
import { books } from "@/lib/books";
import { getUser, type List } from "@/lib/data/social";
import { formatCount, plural } from "@/lib/format";

/** Card de lista: as capas empilhadas em leque, como livros deitados na mesa. */
export function ListCard({ list }: { list: List }) {
  const user = getUser(list.user);
  const covers = books(...list.books).slice(0, 5);

  return (
    <article className="group relative flex flex-col">
      <div className="relative flex aspect-[16/10] items-center justify-center rounded-2xl bg-sunken px-5 transition-colors duration-300 group-hover:bg-line/70">
        {covers.map((book, i) => (
          <div
            key={book.id}
            className="w-[24%] shrink-0 transition-transform duration-300 ease-out group-hover:-translate-y-1"
            style={{
              marginLeft: i === 0 ? 0 : "-11%",
              zIndex: covers.length - i,
              transitionDelay: `${i * 30}ms`,
            }}
          >
            <BookCover book={book} size="M" />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[1rem] leading-snug font-semibold tracking-tight text-ink">
            <Link href={`/listas/${list.slug}`} className="after:absolute after:inset-0">
              {list.title}
            </Link>
          </h3>
          <p className="mt-1 flex items-center gap-2 text-[0.8125rem] text-ink-3">
            {user && <UserAvatar user={user} size={18} href={false} />}
            <span>{user?.name}</span>
            <span aria-hidden>·</span>
            <span>{plural(list.books.length, "livro", "livros")}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3" aria-hidden />
              {formatCount(list.likes)}
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}
