import type { ProfileRow } from "@/lib/db/schema";

/** Tipos que atravessam a fronteira servidor → navegador (sem Date, sem campos internos). */

export type Profile = Pick<
  ProfileRow,
  "id" | "handle" | "name" | "bio" | "tone" | "goal" | "favorites" | "isPrivate" | "founder" | "socials" | "avatarUrl"
>;

export function toProfile(p: ProfileRow): Profile {
  const { id, handle, name, bio, tone, goal, favorites, isPrivate, founder, socials, avatarUrl } = p;
  return { id, handle, name, bio, tone, goal, favorites, isPrivate, founder, socials, avatarUrl };
}

/** Perfil resumido para listas (busca, sugestões, notificações). */
export type ProfileCard = {
  handle: string;
  name: string;
  tone: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  founder: boolean;
};

export type ShelfEntry = {
  book: { id: string; title: string; author: string; coverId: number | null; color: string; year: number | null; pages: number | null };
  status: "quero-ler" | "lendo" | "lido" | null;
  rating: number | null;
  liked: boolean;
  review: string;
  finishedOn: string | null;
  updatedAt: number;
};

/** Um item do feed de quem você segue: um registro da estante de outra pessoa. */
export type FeedItem = ShelfEntry & { user: { handle: string; name: string; tone: string; avatarUrl: string | null } };
