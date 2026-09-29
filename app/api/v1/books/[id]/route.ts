import { and, eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { appUser, fail, ok } from "@/lib/api";
import { buyLink } from "@/lib/affiliate";
import { bookStats, reviewsFor } from "@/lib/data/social";
import { db } from "@/lib/db";
import { bookReviews } from "@/lib/db/queries";
import { entries } from "@/lib/db/schema";
import { getBook } from "@/lib/openlibrary";
import { byNewest, fromDemo, type ReviewView } from "@/lib/reviews";

type Props = { params: Promise<{ id: string }> };

/** Página do livro no app: dados, reviews públicas, link de compra e, com token, o registro da pessoa. */
export async function GET(req: NextRequest, { params }: Props) {
  const { id } = await params;
  if (!/^OL\d+W$/.test(id)) return fail("not_found", 404);
  const book = await getBook(id);
  if (!book) return fail("not_found", 404);

  const me = await appUser(req);
  const [real, mine] = await Promise.all([
    bookReviews(id),
    me && db ? db.query.entries.findFirst({ where: and(eq(entries.userId, me), eq(entries.bookId, id)) }) : null,
  ]);
  const demo = reviewsFor(id).map(fromDemo).filter((r): r is ReviewView => r !== null);

  return ok({
    book,
    stats: bookStats(id),
    reviews: [...real.sort(byNewest), ...demo].slice(0, 30),
    buy: buyLink(book),
    myEntry: mine
      ? {
          status: mine.status,
          rating: mine.rating === null ? null : Number(mine.rating),
          liked: mine.liked,
          review: mine.review,
          finishedOn: mine.finishedOn,
          updatedAt: mine.updatedAt.getTime(),
        }
      : null,
  });
}
