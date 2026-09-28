import { getSeedBook, type Book } from "@/lib/books";
import { getUser, type Review, type User } from "@/lib/data/social";
import type { Tables } from "@/lib/supabase/database.types";

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

export type EntryWithProfile = Tables<"entries"> & {
  profile: Pick<Tables<"profiles">, "handle" | "name" | "tone"> | null;
};

export function fromRow(row: EntryWithProfile): ReviewView | null {
  if (!row.profile || !row.review) return null;
  return {
    id: `${row.user_id}:${row.book_id}`,
    user: row.profile,
    book: {
      id: row.book_id,
      title: row.book_title,
      author: row.book_author,
      coverId: row.book_cover_id,
      color: row.book_color,
      year: row.book_year,
    },
    rating: row.rating === null ? null : Number(row.rating),
    text: row.review,
    date: (row.finished_on ?? row.updated_at).slice(0, 10),
    likes: null,
    liked: row.liked,
    reread: false,
    spoiler: false,
  };
}

export function byNewest(a: ReviewView, b: ReviewView) {
  return b.date.localeCompare(a.date);
}
