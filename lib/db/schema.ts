import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import type { SocialLink } from "@/lib/socials";

/**
 * Schema da Estante. Fonte de verdade para as migrações em /drizzle.
 *
 * Decisão: não existe tabela compartilhada de livros. Cada registro guarda uma cópia
 * do livro (título, autor, capa, cor), então ninguém altera como um livro aparece
 * para os outros. As regras de "cada um só escreve no que é seu" ficam nas server
 * actions (app/actions.ts), que sempre usam o id da sessão, nunca um id vindo do navegador.
 */

/** Handles dos leitores de demonstração (lib/data/social.ts). */
export const RESERVED_HANDLES = ["marina", "theo", "bia", "caio", "luiza", "rafa"] as const;

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Conta do provedor de login, ex: "github:12345". */
    providerId: text("provider_id").notNull().unique(),
    handle: text("handle").notNull().unique(),
    name: text("name").notNull(),
    bio: text("bio").notNull().default(""),
    tone: text("tone").notNull().default("anil"),
    goal: integer("goal").notNull().default(24),
    favorites: text("favorites").array().notNull().default(sql`'{}'::text[]`),
    /** Perfil privado: seguir vira pedido, e só seguidores aprovados veem estante, diário e reviews. */
    isPrivate: boolean("is_private").notNull().default(false),
    /** Selo de fundador. Só a migração define; nenhuma action altera. */
    founder: boolean("founder").notNull().default(false),
    /** Até 3 redes sociais: plataforma + @ (a URL é montada pelo app, nunca digitada). */
    socials: jsonb("socials").$type<SocialLink[]>().notNull().default(sql`'[]'::jsonb`),
    /** Foto de perfil: 256px WebP no Vercel Blob. null = iniciais no círculo colorido. */
    avatarUrl: text("avatar_url"),
    /** A pessoa removeu a foto: não importar de novo a do Google/GitHub no próximo login. */
    avatarOptOut: boolean("avatar_opt_out").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("profiles_handle_format", sql`${t.handle} ~ '^[a-z0-9_]{3,20}$'`),
    check(
      "profiles_handle_reserved",
      sql.raw(`handle not in (${RESERVED_HANDLES.map((h) => `'${h}'`).join(", ")})`),
    ),
    check("profiles_name_length", sql`char_length(${t.name}) between 1 and 60`),
    check("profiles_bio_length", sql`char_length(${t.bio}) <= 200`),
    check("profiles_tone", sql`${t.tone} in ('anil', 'ameixa', 'musgo', 'ambar')`),
    check("profiles_goal", sql`${t.goal} between 1 and 365`),
    check("profiles_favorites", sql`cardinality(${t.favorites}) <= 4`),
    check("profiles_socials", sql`jsonb_typeof(${t.socials}) = 'array' and jsonb_array_length(${t.socials}) <= 3`),
    // Só https (Vercel Blob) ou o disco local do ambiente de desenvolvimento.
    check("profiles_avatar_url", sql`${t.avatarUrl} is null or ${t.avatarUrl} ~ '^(https://|/uploads/avatars/)'`),
    // Nome de exibição único, sem diferenciar maiúsculas.
    uniqueIndex("profiles_name_unique").on(sql`lower(${t.name})`),
  ],
);

export const entries = pgTable(
  "entries",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    bookId: text("book_id").notNull(),

    // Cópia do livro no momento do registro.
    bookTitle: text("book_title").notNull(),
    bookAuthor: text("book_author").notNull(),
    bookCoverId: integer("book_cover_id"),
    bookColor: text("book_color").notNull(),
    bookYear: integer("book_year"),
    bookPages: integer("book_pages"),

    status: text("status", { enum: ["quero-ler", "lendo", "lido"] }),
    // numeric volta como string do driver; convertido em lib/db/queries.ts.
    rating: numeric("rating", { precision: 2, scale: 1 }),
    liked: boolean("liked").notNull().default(false),
    review: text("review").notNull().default(""),
    finishedOn: date("finished_on"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.bookId] }),
    index("entries_user_updated_idx").on(t.userId, t.updatedAt.desc()),
    index("entries_book_reviews_idx").on(t.bookId, t.updatedAt.desc()).where(sql`${t.review} <> ''`),
    check("entries_book_id", sql`${t.bookId} ~ '^OL[0-9]+W$'`),
    check("entries_book_title", sql`char_length(${t.bookTitle}) between 1 and 300`),
    check("entries_book_author", sql`char_length(${t.bookAuthor}) <= 200`),
    check("entries_book_color", sql`${t.bookColor} ~ '^#[0-9a-f]{6}$'`),
    check("entries_book_pages", sql`${t.bookPages} is null or ${t.bookPages} > 0`),
    check("entries_status", sql`${t.status} is null or ${t.status} in ('quero-ler', 'lendo', 'lido')`),
    check("entries_rating", sql`${t.rating} is null or (${t.rating} between 0.5 and 5 and ${t.rating} * 2 = floor(${t.rating} * 2))`),
    check("entries_review", sql`char_length(${t.review}) <= 600`),
  ],
);

/**
 * Login por e-mail e senha. Fica fora de `profiles` de propósito: perfis são públicos,
 * e o hash da senha nunca pode sair numa consulta de perfil.
 */
export const passwordLogins = pgTable(
  "password_logins",
  {
    email: text("email").primaryKey(),
    profileId: uuid("profile_id")
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    /** Tentativas erradas seguidas; zera ao acertar. */
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("password_logins_email", sql`${t.email} = lower(${t.email}) and char_length(${t.email}) <= 254 and ${t.email} ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'`),
  ],
);

/** Quem segue quem. Público, como num Letterboxd: dá para ver seguidores de qualquer perfil. */
export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    followingId: uuid("following_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followingId] }),
    // Para "quem segue esta pessoa" (contagem de seguidores).
    index("follows_following_idx").on(t.followingId),
    check("follows_not_self", sql`${t.followerId} <> ${t.followingId}`),
  ],
);

/** Pedidos para seguir perfis privados. Aprovado, vira linha em `follows` e sai daqui. */
export const followRequests = pgTable(
  "follow_requests",
  {
    requesterId: uuid("requester_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    targetId: uuid("target_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.requesterId, t.targetId] }),
    index("follow_requests_target_idx").on(t.targetId),
    check("follow_requests_not_self", sql`${t.requesterId} <> ${t.targetId}`),
  ],
);

/** Bloqueios. Quem bloqueia deixa de seguir e ser seguido, e o bloqueado não interage mais. */
export const blocks = pgTable(
  "blocks",
  {
    blockerId: uuid("blocker_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.blockerId, t.blockedId] }),
    index("blocks_blocked_idx").on(t.blockedId),
    check("blocks_not_self", sql`${t.blockerId} <> ${t.blockedId}`),
  ],
);

/**
 * Curtir (+1) ou não curtir (-1) a review de alguém. A review é o registro (autor, livro) em entries:
 * se a review for apagada, as reações vão junto.
 */
export const reviewReactions = pgTable(
  "review_reactions",
  {
    userId: uuid("user_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    reviewUserId: uuid("review_user_id").notNull(),
    bookId: text("book_id").notNull(),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.reviewUserId, t.bookId] }),
    foreignKey({ columns: [t.reviewUserId, t.bookId], foreignColumns: [entries.userId, entries.bookId] }).onDelete("cascade"),
    index("review_reactions_review_idx").on(t.reviewUserId, t.bookId),
    check("review_reactions_value", sql`${t.value} in (-1, 1)`),
    check("review_reactions_not_self", sql`${t.userId} <> ${t.reviewUserId}`),
  ],
);

export const NOTIFICATION_TYPES = ["follow", "follow_request", "follow_accepted", "review_like", "friend_finished"] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/**
 * Notificações. Uma por (destinatário, autor, tipo, livro): curtir e descurtir várias vezes
 * não empilha avisos, só atualiza o horário.
 */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientId: uuid("recipient_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    actorId: uuid("actor_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    type: text("type", { enum: NOTIFICATION_TYPES }).notNull(),
    bookId: text("book_id"),
    bookTitle: text("book_title"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
  (t) => [
    unique("notifications_dedupe").on(t.recipientId, t.actorId, t.type, t.bookId).nullsNotDistinct(),
    index("notifications_recipient_idx").on(t.recipientId, t.createdAt.desc()),
    check("notifications_type", sql.raw(`type in (${NOTIFICATION_TYPES.map((n) => `'${n}'`).join(", ")})`)),
    check("notifications_not_self", sql`${t.recipientId} <> ${t.actorId}`),
  ],
);

export type ProfileRow = typeof profiles.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type EntryInsert = typeof entries.$inferInsert;
