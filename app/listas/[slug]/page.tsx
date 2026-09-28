import { Heart } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookGrid } from "@/components/book-grid";
import { UserAvatar } from "@/components/user-avatar";
import { books } from "@/lib/books";
import { getList, getUser, LISTS } from "@/lib/data/social";
import { formatCount, plural } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return LISTS.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const list = getList((await params).slug);
  return list ? { title: list.title, description: list.description } : { title: "Lista não encontrada" };
}

export default async function ListPage({ params }: Props) {
  const list = getList((await params).slug);
  if (!list) notFound();
  const user = getUser(list.user);
  const items = books(...list.books);
  const pages = items.reduce((sum, b) => sum + (b.pages ?? 0), 0);

  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <header className="max-w-2xl">
        {user && (
          <Link href={`/u/${user.handle}`} className="inline-flex items-center gap-2 text-sm text-ink-2 hover:text-ink">
            <UserAvatar user={user} size={24} href={false} />
            Lista de <span className="font-medium">{user.name}</span>
          </Link>
        )}
        <h1 className="mt-4 text-title font-semibold text-ink">{list.title}</h1>
        <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-2">{list.description}</p>
        <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-3">
          <span>{plural(items.length, "livro", "livros")}</span>
          <span aria-hidden>·</span>
          <span className="tnum">{pages.toLocaleString("pt-BR")} páginas no total</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Heart className="size-3.5" aria-hidden />
            {formatCount(list.likes)} curtidas
          </span>
        </p>
      </header>

      <BookGrid books={items} rank className="mt-12" />
    </div>
  );
}
