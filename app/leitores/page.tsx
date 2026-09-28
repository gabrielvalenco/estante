import type { Metadata } from "next";
import Link from "next/link";

import { BookCover } from "@/components/book-cover";
import { UserAvatar } from "@/components/user-avatar";
import { books } from "@/lib/books";
import { reviewsBy, USERS } from "@/lib/data/social";
import { plural } from "@/lib/format";
import { recentReaders } from "@/lib/db/queries";

export const metadata: Metadata = { title: "Leitores" };
export const revalidate = 300;

export default async function ReadersPage() {
  const real = await recentReaders(6);

  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      <h1 className="text-title font-semibold text-ink">Leitores</h1>
      <p className="mt-2 max-w-lg text-ink-3">Gente para seguir. Os quatro favoritos dizem muito sobre alguém.</p>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {USERS.map((u) => (
          <li key={u.handle} className="group relative rounded-3xl border border-line bg-surface p-5 transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-line-strong">
            <div className="flex items-center gap-3">
              <UserAvatar user={u} size={44} href={false} />
              <div className="min-w-0">
                <h2 className="font-semibold tracking-tight text-ink">
                  <Link href={`/u/${u.handle}`} className="after:absolute after:inset-0">
                    {u.name}
                  </Link>
                </h2>
                <p className="text-[0.8125rem] text-ink-3">
                  @{u.handle} · {plural(reviewsBy(u.handle).length, "review", "reviews")}
                </p>
              </div>
            </div>
            <p className="mt-3 line-clamp-2 min-h-[2.75rem] text-[0.875rem] leading-snug text-ink-2">{u.bio}</p>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {books(...u.favorites).map((b) => (
                <BookCover key={b.id} book={b} size="M" />
              ))}
            </div>
          </li>
        ))}
      </ul>

      {real.length > 0 && (
        <section className="mt-16">
          <h2 className="text-section font-semibold text-ink">Chegaram agora</h2>
          <p className="mt-1 text-sm text-ink-3">Contas de verdade, com as últimas leituras.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {real.map((p) => (
              <li key={p.id} className="group relative rounded-3xl border border-line bg-surface p-5 transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-line-strong">
                <div className="flex items-center gap-3">
                  <UserAvatar user={p} size={44} href={false} />
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold tracking-tight text-ink">
                      <Link href={`/u/${p.handle}`} className="after:absolute after:inset-0">
                        {p.name}
                      </Link>
                    </h3>
                    <p className="text-[0.8125rem] text-ink-3">@{p.handle}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {p.entries.map((e) => (
                    <BookCover
                      key={e.bookId}
                      book={{ id: e.bookId, title: e.bookTitle, author: e.bookAuthor, coverId: e.bookCoverId, color: e.bookColor }}
                      size="M"
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
