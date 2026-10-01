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
import { SUPPORT_STATUSES, SUPPORT_TOPICS, type SupportContext } from "@/lib/support";

export { SUPPORT_STATUSES, SUPPORT_TOPICS };
export type { SupportContext, SupportStatus, SupportTopic } from "@/lib/support";

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

export const NOTIFICATION_TYPES = ["follow", "follow_request", "follow_accepted", "review_like", "friend_finished", "discussion_reply", "support_reply", "club_invite"] as const;
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

/**
 * Marcador de página: onde a pessoa está em cada livro. Separado de `entries` para
 * atualizar a página (coisa frequente) sem mexer no registro da estante. Sempre privado.
 */
export const readingProgress = pgTable(
  "reading_progress",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    bookId: text("book_id").notNull(),
    page: integer("page").notNull(),
    /** Páginas da edição que a pessoa lê (a da Open Library nem sempre bate). */
    totalPages: integer("total_pages"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.bookId] }),
    check("reading_progress_book_id", sql`${t.bookId} ~ '^OL[0-9]+W$'`),
    check("reading_progress_page", sql`${t.page} between 0 and 100000`),
    check("reading_progress_total", sql`${t.totalPages} is null or (${t.totalPages} between 1 and 100000 and ${t.page} <= ${t.totalPages})`),
  ],
);

export const ANNOTATION_KINDS = ["quote", "note"] as const;
export type AnnotationKind = (typeof ANNOTATION_KINDS)[number];

/**
 * Citações (trechos do livro) e notas (o que a pessoa pensou). Privadas: só a dona lê.
 * Guardam uma cópia do livro, como `entries`, para listar tudo sem depender da estante.
 */
export const annotations = pgTable(
  "annotations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    bookId: text("book_id").notNull(),
    bookTitle: text("book_title").notNull(),
    bookAuthor: text("book_author").notNull(),
    bookCoverId: integer("book_cover_id"),
    bookColor: text("book_color").notNull(),
    kind: text("kind", { enum: ANNOTATION_KINDS }).notNull(),
    /** O trecho (citação) ou o texto da nota. */
    text: text("text").notNull(),
    /** Comentário da pessoa sobre a citação. Notas não usam. */
    comment: text("comment").notNull().default(""),
    page: integer("page"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("annotations_user_book_idx").on(t.userId, t.bookId, t.createdAt.desc()),
    index("annotations_user_kind_idx").on(t.userId, t.kind, t.createdAt.desc()),
    check("annotations_book_id", sql`${t.bookId} ~ '^OL[0-9]+W$'`),
    check("annotations_book_title", sql`char_length(${t.bookTitle}) between 1 and 300`),
    check("annotations_book_author", sql`char_length(${t.bookAuthor}) <= 200`),
    check("annotations_book_color", sql`${t.bookColor} ~ '^#[0-9a-f]{6}$'`),
    check("annotations_kind", sql`${t.kind} in ('quote', 'note')`),
    check("annotations_text", sql`char_length(${t.text}) between 1 and 4000 and (${t.kind} = 'note' or char_length(${t.text}) <= 1000)`),
    check("annotations_comment", sql`char_length(${t.comment}) <= 1000`),
    check("annotations_page", sql`${t.page} is null or ${t.page} between 1 and 100000`),
  ],
);

export type AnnotationRow = typeof annotations.$inferSelect;
export type ReadingProgressRow = typeof readingProgress.$inferSelect;

/**
 * Discussões por livro. Cada tópico e cada resposta dizem até que página falam
 * (0 = sem spoiler). Quem ainda não chegou lá recebe só o aviso de spoiler, sem o texto.
 * São públicas, como as reviews; bloqueios escondem os dois lados.
 */
export const discussionThreads = pgTable(
  "discussion_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bookId: text("book_id").notNull(),
    /** Cópia do título do livro, para as notificações. */
    bookTitle: text("book_title").notNull(),
    /** Discussão de um clube: só os membros veem. null = discussão pública do livro. */
    clubId: uuid("club_id").references(() => clubs.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    page: integer("page").notNull().default(0),
    replyCount: integer("reply_count").notNull().default(0),
    /** Escondido pela moderação (3 denúncias de pessoas diferentes). */
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("discussion_threads_book_idx").on(t.bookId, t.lastActivityAt.desc()),
    index("discussion_threads_club_idx").on(t.clubId, t.lastActivityAt.desc()),
    index("discussion_threads_author_idx").on(t.authorId, t.createdAt.desc()),
    check("discussion_threads_book_id", sql`${t.bookId} ~ '^OL[0-9]+W$'`),
    check("discussion_threads_book_title", sql`char_length(${t.bookTitle}) between 1 and 300`),
    check("discussion_threads_title", sql`char_length(${t.title}) between 3 and 120`),
    check("discussion_threads_body", sql`char_length(${t.body}) between 1 and 4000`),
    check("discussion_threads_page", sql`${t.page} between 0 and 100000`),
  ],
);

export const discussionPosts = pgTable(
  "discussion_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    page: integer("page").notNull().default(0),
    hidden: boolean("hidden").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("discussion_posts_thread_idx").on(t.threadId, t.createdAt),
    index("discussion_posts_author_idx").on(t.authorId, t.createdAt.desc()),
    check("discussion_posts_body", sql`char_length(${t.body}) between 1 and 4000`),
    check("discussion_posts_page", sql`${t.page} between 0 and 100000`),
  ],
);

/** Denúncias. Uma por pessoa por item; 3 escondem o item até alguém revisar. */
export const discussionReports = pgTable(
  "discussion_reports",
  {
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    targetKind: text("target_kind", { enum: ["thread", "post"] }).notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.reporterId, t.targetKind, t.targetId] }),
    index("discussion_reports_target_idx").on(t.targetKind, t.targetId),
    check("discussion_reports_kind", sql`${t.targetKind} in ('thread', 'post')`),
    check("discussion_reports_reason", sql`char_length(${t.reason}) <= 300`),
  ],
);

export type DiscussionThreadRow = typeof discussionThreads.$inferSelect;
export type DiscussionPostRow = typeof discussionPosts.$inferSelect;

export const SUBSCRIPTION_PLANS = ["capa-dura", "ex-libris"] as const;

/**
 * Assinatura paga (Stripe). Uma por perfil. Quem manda é o Stripe: esta tabela é uma cópia,
 * atualizada pelo webhook e na volta do checkout. Sem linha (ou status inativo) = plano Brochura.
 * Nunca guarda dados do cartão.
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    profileId: uuid("profile_id")
      .primaryKey()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull().unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    plan: text("plan", { enum: SUBSCRIPTION_PLANS }).notNull().default("capa-dura"),
    /** Status do Stripe: active, trialing, past_due, canceled, unpaid, incomplete... */
    status: text("status").notNull().default("incomplete"),
    interval: text("interval", { enum: ["month", "year"] }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    /** A pessoa cancelou: o plano vale até esta data e não renova. */
    cancelAt: timestamp("cancel_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("subscriptions_plan", sql`${t.plan} in ('capa-dura', 'ex-libris')`),
    check("subscriptions_customer", sql`${t.stripeCustomerId} ~ '^cus_'`),
  ],
);

export type SubscriptionRow = typeof subscriptions.$inferSelect;

/**
 * Leituras de foto de página (citação por foto). Só para contar o uso do mês por plano:
 * a foto em si não é guardada.
 */
export const pageScans = pgTable(
  "page_scans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("page_scans_user_idx").on(t.userId, t.createdAt.desc())],
);

/**
 * Clubes de leitura (Ex Libris para criar; entrar é grátis, pelo convite). Cada clube lê um livro
 * por vez: os membros veem o progresso uns dos outros nesse livro e discutem sem spoiler.
 */
export const clubs = pgTable(
  "clubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    /** Livro atual do clube (cópia, como nas outras tabelas). */
    bookId: text("book_id"),
    bookTitle: text("book_title"),
    bookAuthor: text("book_author"),
    bookCoverId: integer("book_cover_id"),
    bookColor: text("book_color"),
    /** Código do link de convite. Trocar o código invalida os links antigos. */
    inviteCode: text("invite_code").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("clubs_owner_idx").on(t.ownerId),
    check("clubs_name", sql`char_length(${t.name}) between 3 and 60`),
    check("clubs_description", sql`char_length(${t.description}) <= 500`),
    check("clubs_book_id", sql`${t.bookId} is null or ${t.bookId} ~ '^OL[0-9]+W$'`),
    check("clubs_invite_code", sql`${t.inviteCode} ~ '^[A-Za-z0-9]{10,32}$'`),
  ],
);

export const clubMembers = pgTable(
  "club_members",
  {
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.clubId, t.profileId] }),
    index("club_members_profile_idx").on(t.profileId),
    check("club_members_role", sql`${t.role} in ('owner', 'member')`),
  ],
);

/**
 * Convites diretos para um clube (o dono convida seguidores). Ninguém entra sem aceitar:
 * o convite some ao aceitar, recusar, ou quando o dono cancela.
 */
export const clubInvitations = pgTable(
  "club_invitations",
  {
    clubId: uuid("club_id")
      .notNull()
      .references(() => clubs.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    invitedBy: uuid("invited_by")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.clubId, t.profileId] }), index("club_invitations_profile_idx").on(t.profileId)],
);

export type ClubRow = typeof clubs.$inferSelect;

/**
 * Suporte: pedidos de ajuda (com ou sem conta) e a conversa de cada um.
 * Quem não tem conta acompanha pelo link privado (`access_hash` guarda só o hash do token).
 * O contexto (plano, plataforma, versão do app) é preenchido pelo servidor, nunca pelo formulário.
 */

export const supportTickets = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Número curto para mostrar ("#0042"). */
    number: integer("number").generatedAlwaysAsIdentity().notNull().unique(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "cascade" }),
    /** E-mail para resposta: obrigatório sem conta, opcional com conta. */
    email: text("email"),
    name: text("name"),
    topic: text("topic", { enum: SUPPORT_TOPICS }).notNull(),
    subject: text("subject").notNull(),
    status: text("status", { enum: SUPPORT_STATUSES }).notNull().default("aberto"),
    accessHash: text("access_hash").notNull().unique(),
    /** Hash do IP (com segredo) só para limitar envios de quem não tem conta. */
    ipHash: text("ip_hash"),
    context: jsonb("context").$type<SupportContext>().notNull().default(sql`'{}'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("support_tickets_profile_idx").on(t.profileId, t.updatedAt.desc()),
    index("support_tickets_status_idx").on(t.status, t.updatedAt.desc()),
    index("support_tickets_ip_idx").on(t.ipHash, t.createdAt),
    check("support_tickets_owner", sql`${t.profileId} is not null or ${t.email} is not null`),
    check("support_tickets_email", sql`${t.email} is null or (char_length(${t.email}) <= 254 and ${t.email} ~ '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')`),
    check("support_tickets_name", sql`${t.name} is null or char_length(${t.name}) <= 80`),
    check("support_tickets_subject", sql`char_length(${t.subject}) between 3 and 120`),
    check("support_tickets_topic", sql.raw(`topic in (${SUPPORT_TOPICS.map((n) => `'${n}'`).join(", ")})`)),
    check("support_tickets_status", sql.raw(`status in (${SUPPORT_STATUSES.map((n) => `'${n}'`).join(", ")})`)),
  ],
);

export const supportMessages = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTickets.id, { onDelete: "cascade" }),
    /** "pessoa" é quem pediu ajuda; "suporte" é a resposta da Estante. */
    author: text("author", { enum: ["pessoa", "suporte"] }).notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("support_messages_ticket_idx").on(t.ticketId, t.createdAt),
    check("support_messages_author", sql`${t.author} in ('pessoa', 'suporte')`),
    check("support_messages_body", sql`char_length(${t.body}) between 1 and 5000`),
  ],
);

export type SupportTicketRow = typeof supportTickets.$inferSelect;

export type ProfileRow = typeof profiles.$inferSelect;
export type EntryRow = typeof entries.$inferSelect;
export type EntryInsert = typeof entries.$inferInsert;
