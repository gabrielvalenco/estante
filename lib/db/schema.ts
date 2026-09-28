import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

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

export type ProfileRow = typeof profiles.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type EntryInsert = typeof entries.$inferInsert;
