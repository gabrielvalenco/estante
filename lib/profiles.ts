import "server-only";

import { books, getSeedBook, type Book } from "@/lib/books";
import { diaryOf, getUser, LISTS, reviewsBy, type List } from "@/lib/data/social";
import { fromDemo, type ReviewView } from "@/lib/reviews";
import type { Tables } from "@/lib/supabase/database.types";
import { profileByHandle } from "@/lib/supabase/queries";

export type ProfileBook = Pick<Book, "id" | "title" | "author" | "coverId" | "color" | "year">;

export type DiaryItem = {
  book: ProfileBook;
  rating: number | null;
  date: string;
  liked: boolean;
  reread: boolean;
};

/** Perfil pronto para exibir, seja leitor de demonstração ou conta real. */
export type ProfileView = {
  handle: string;
  name: string;
  bio: string;
  tone: string;
  goal: number;
  favorites: ProfileBook[];
  reading: ProfileBook[];
  diary: DiaryItem[];
  reviews: ReviewView[];
  lists: List[];
  readThisYear: number;
  isDemo: boolean;
};

export async function getProfileView(handle: string): Promise<ProfileView | null> {
  const demo = getUser(handle);
  if (demo) {
    const diary = diaryOf(handle)
      .map((d): DiaryItem | null => {
        const book = getSeedBook(d.bookId);
        return book ? { book, rating: d.rating, date: d.date, liked: d.liked, reread: d.reread } : null;
      })
      .filter((d): d is DiaryItem => d !== null);
    return {
      handle: demo.handle,
      name: demo.name,
      bio: demo.bio,
      tone: demo.tone,
      goal: demo.goal,
      favorites: books(...demo.favorites),
      reading: [],
      diary,
      reviews: reviewsBy(handle).map(fromDemo).filter((r): r is ReviewView => r !== null),
      lists: LISTS.filter((l) => l.user === handle),
      // Na demonstração, o total do ano acompanha o calendário: fim de setembro, 3/4 da meta.
      readThisYear: Math.max(diary.length, Math.round(demo.goal * 0.74)),
      isDemo: true,
    };
  }

  const p = await profileByHandle(handle);
  if (!p) return null;

  const toBook = (e: Tables<"entries">): ProfileBook => ({
    id: e.book_id,
    title: e.book_title,
    author: e.book_author,
    coverId: e.book_cover_id,
    color: e.book_color,
    year: e.book_year,
  });

  const read = p.entries.filter((e) => e.status === "lido");
  const dateOf = (e: Tables<"entries">) => e.finished_on ?? e.updated_at.slice(0, 10);
  const year = String(new Date().getFullYear());

  // Favoritos escolhidos na conta; sem escolha, os lidos com nota mais alta.
  const byId = new Map(p.entries.map((e) => [e.book_id, e]));
  const chosen = p.favorites.map((id) => byId.get(id)).filter((e): e is Tables<"entries"> => Boolean(e));
  const favorites = (
    chosen.length
      ? chosen
      : [...read].filter((e) => e.rating !== null).sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 4)
  ).map(toBook);

  const profile = { handle: p.handle, name: p.name, tone: p.tone };

  return {
    handle: p.handle,
    name: p.name,
    bio: p.bio,
    tone: p.tone,
    goal: p.goal,
    favorites,
    reading: p.entries.filter((e) => e.status === "lendo").map(toBook),
    diary: read
      .map((e) => ({ book: toBook(e), rating: e.rating === null ? null : Number(e.rating), date: dateOf(e), liked: e.liked, reread: false }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    reviews: p.entries
      .filter((e) => e.review)
      .map((e) => ({
        id: `${e.user_id}:${e.book_id}`,
        user: profile,
        book: toBook(e),
        rating: e.rating === null ? null : Number(e.rating),
        text: e.review,
        date: dateOf(e),
        likes: null,
        liked: e.liked,
        reread: false,
        spoiler: false,
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    lists: [],
    readThisYear: read.filter((e) => dateOf(e).startsWith(year)).length,
    isDemo: false,
  };
}
