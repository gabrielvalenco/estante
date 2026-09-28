import type { Metadata } from "next";
import Link from "next/link";

import { BookCover } from "@/components/book-cover";
import { UserAvatar } from "@/components/user-avatar";
import { books } from "@/lib/books";
import { reviewsBy, USERS } from "@/lib/data/social";
import { plural } from "@/lib/format";

export const metadata: Metadata = { title: "Leitores" };

export default function ReadersPage() {
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
    </div>
  );
}
