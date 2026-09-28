import { getSeedBook, type Book } from "@/lib/books";
import { getUser, type Review, type User } from "@/lib/data/social";
import type { EntryRow } from "@/lib/db/schema";

/** Review pronta para exibir, venha dos dados de demonstração ou do banco. */
export type ReviewView = {
  id: string;
  user: Pick<User, "handle" | "name"> & { tone: string };
  book: Pick<Book, "id" | "title" | "author" | "coverId" | "color" | "year">;
  rating: number | null;
  text: string;
  /** AAAA-MM-DD */
  date: string;
  /** Só os dados de demonstração têm curtidas em reviews. */
  likes: number | null;
  liked: boolean;
  reread: boolean;
  spoiler: boolean;
};

export function fromDemo(r: Review): ReviewView | null {
  const user = getUser(r.user);
  const book = getSeedBook(r.bookId);
  if (!user || !book) return null;
  return {
    id: r.id,
    user,
    book,
    rating: r.rating,
    text: r.text,
    date: r.date,
    likes: r.likes,
    liked: Boolean(r.liked),
    reread: Boolean(r.reread),
    spoiler: Boolean(r.spoiler),
  };
}

export type EntryWithProfile = {
  entry: EntryRow;
  profile: { handle: string; name: string; tone: string };
};

export function fromRow({ entry: e, profile }: EntryWithProfile): ReviewView {
  return {
    id: `${e.userId}:${e.bookId}`,
    user: profile,
    book: { id: e.bookId, title: e.bookTitle, author: e.bookAuthor, coverId: e.bookCoverId, color: e.bookColor, year: e.bookYear },
    rating: e.rating === null ? null : Number(e.rating),
    text: e.review,
    date: e.finishedOn ?? e.updatedAt.toISOString().slice(0, 10),
    likes: null,
    liked: e.liked,
    reread: false,
    spoiler: false,
  };
}

export function byNewest(a: ReviewView, b: ReviewView) {
  return b.date.localeCompare(a.date);
}
