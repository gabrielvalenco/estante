import "server-only";

import { books, getSeedBook, type Book } from "@/lib/books";
import { diaryOf, getUser, LISTS, reviewsBy, type List } from "@/lib/data/social";
import { profileByHandle, reviewsOf } from "@/lib/db/queries";
import type { EntryRow } from "@/lib/db/schema";
import { fromDemo, type ReviewView } from "@/lib/reviews";
import type { SocialLink } from "@/lib/socials";

export type ProfileBook = Pick<Book, "id" | "title" | "author" | "coverId" | "color" | "year">;

export type DiaryItem = {
  book: ProfileBook;
  rating: number | null;
  date: string;
  liked: boolean;
  reread: boolean;
};

/** O que fica atrás do cadeado num perfil privado. */
export type ProfileContent = {
  favorites: ProfileBook[];
  reading: ProfileBook[];
  diary: DiaryItem[];
  reviews: ReviewView[];
  readThisYear: number;
  /** Livros na estante (lidos + lendo), para o contador do cabeçalho. */
  shelfCount: number;
};

/** Perfil pronto para exibir, seja leitor de demonstração ou conta real. */
export type ProfileView = {
  handle: string;
  name: string;
  bio: string;
  tone: string;
  goal: number;
  lists: List[];
  isDemo: boolean;
  isPrivate: boolean;
  founder: boolean;
  socials: SocialLink[];
  /** Só contas reais têm seguidores; leitores de demonstração não estão no banco. */
  followers: number | null;
  following: number | null;
  /** null quando o perfil é privado: o conteúdo é pedido pelo navegador, com checagem de acesso. */
  content: ProfileContent | null;
};

const toBook = (e: EntryRow): ProfileBook => ({
  id: e.bookId,
  title: e.bookTitle,
  author: e.bookAuthor,
  coverId: e.bookCoverId,
  color: e.bookColor,
  year: e.bookYear,
});

const dateOf = (e: EntryRow) => e.finishedOn ?? e.updatedAt.toISOString().slice(0, 10);

/** Monta favoritos, lendo agora, diário e reviews a partir da estante de uma conta real. */
export function buildContent(shelf: EntryRow[], favoriteIds: string[], reviews: ReviewView[]): ProfileContent {
  const read = shelf.filter((e) => e.status === "lido");
  const year = String(new Date().getFullYear());

  // Favoritos escolhidos na conta; sem escolha, os lidos com nota mais alta.
  const byId = new Map(shelf.map((e) => [e.bookId, e]));
  const chosen = favoriteIds.map((id) => byId.get(id)).filter((e): e is EntryRow => Boolean(e));
  const favorites = (
    chosen.length
      ? chosen
      : [...read].filter((e) => e.rating !== null).sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 4)
  ).map(toBook);

  const reading = shelf.filter((e) => e.status === "lendo").map(toBook);
  return {
    favorites,
    reading,
    diary: read
      .map((e) => ({ book: toBook(e), rating: e.rating === null ? null : Number(e.rating), date: dateOf(e), liked: e.liked, reread: false }))
      .sort((a, b) => b.date.localeCompare(a.date)),
    reviews: [...reviews].sort((a, b) => b.date.localeCompare(a.date)),
    readThisYear: read.filter((e) => dateOf(e).startsWith(year)).length,
    shelfCount: read.length + reading.length,
  };
}

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
      lists: LISTS.filter((l) => l.user === handle),
      isDemo: true,
      isPrivate: false,
      founder: false,
      socials: [],
      followers: null,
      following: null,
      content: {
        favorites: books(...demo.favorites),
        reading: [],
        diary,
        reviews: reviewsBy(handle).map(fromDemo).filter((r): r is ReviewView => r !== null),
        // Na demonstração, o total do ano acompanha o calendário: fim de setembro, 3/4 da meta.
        readThisYear: Math.max(diary.length, Math.round(demo.goal * 0.74)),
        shelfCount: diary.length,
      },
    };
  }

  const p = await profileByHandle(handle);
  if (!p) return null;

  return {
    handle: p.handle,
    name: p.name,
    bio: p.bio,
    tone: p.tone,
    goal: p.goal,
    lists: [],
    isDemo: false,
    isPrivate: p.isPrivate,
    founder: p.founder,
    socials: p.socials,
    followers: p.followers,
    following: p.following,
    content: p.isPrivate ? null : buildContent(p.entries, p.favorites, await reviewsOf(p.id)),
  };
}
