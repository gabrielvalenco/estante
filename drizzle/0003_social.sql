CREATE TABLE "blocks" (
	"blocker_id" uuid NOT NULL,
	"blocked_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocks_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "blocks_not_self" CHECK ("blocks"."blocker_id" <> "blocks"."blocked_id")
);
--> statement-breakpoint
CREATE TABLE "follow_requests" (
	"requester_id" uuid NOT NULL,
	"target_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "follow_requests_requester_id_target_id_pk" PRIMARY KEY("requester_id","target_id"),
	CONSTRAINT "follow_requests_not_self" CHECK ("follow_requests"."requester_id" <> "follow_requests"."target_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"type" text NOT NULL,
	"book_id" text,
	"book_title" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone,
	CONSTRAINT "notifications_dedupe" UNIQUE NULLS NOT DISTINCT("recipient_id","actor_id","type","book_id"),
	CONSTRAINT "notifications_type" CHECK (type in ('follow', 'follow_request', 'follow_accepted', 'review_like', 'friend_finished')),
	CONSTRAINT "notifications_not_self" CHECK ("notifications"."recipient_id" <> "notifications"."actor_id")
);
--> statement-breakpoint
CREATE TABLE "review_reactions" (
	"user_id" uuid NOT NULL,
	"review_user_id" uuid NOT NULL,
	"book_id" text NOT NULL,
	"value" smallint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_reactions_user_id_review_user_id_book_id_pk" PRIMARY KEY("user_id","review_user_id","book_id"),
	CONSTRAINT "review_reactions_value" CHECK ("review_reactions"."value" in (-1, 1)),
	CONSTRAINT "review_reactions_not_self" CHECK ("review_reactions"."user_id" <> "review_reactions"."review_user_id")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_private" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "founder" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "socials" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_profiles_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_profiles_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_requests" ADD CONSTRAINT "follow_requests_requester_id_profiles_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follow_requests" ADD CONSTRAINT "follow_requests_target_id_profiles_id_fk" FOREIGN KEY ("target_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reactions" ADD CONSTRAINT "review_reactions_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_reactions" ADD CONSTRAINT "review_reactions_review_user_id_book_id_entries_user_id_book_id_fk" FOREIGN KEY ("review_user_id","book_id") REFERENCES "public"."entries"("user_id","book_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");--> statement-breakpoint
CREATE INDEX "follow_requests_target_idx" ON "follow_requests" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "review_reactions_review_idx" ON "review_reactions" USING btree ("review_user_id","book_id");--> statement-breakpoint
-- Antes do índice de nome único: nomes repetidos (sem diferenciar maiúsculas) ganham um número no fim.
-- O mais antigo mantém o nome. left(..., 55) respeita o limite de 60 caracteres.
UPDATE "profiles" AS p SET "name" = left(p."name", 55) || ' ' || d.rn
FROM (
  SELECT "id", row_number() OVER (PARTITION BY lower("name") ORDER BY "created_at", "id") AS rn FROM "profiles"
) AS d
WHERE p."id" = d."id" AND d.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_name_unique" ON "profiles" USING btree (lower("name"));--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_socials" CHECK (jsonb_typeof("profiles"."socials") = 'array' and jsonb_array_length("profiles"."socials") <= 3);--> statement-breakpoint
-- Selo de fundador: só este perfil, só por migração.
UPDATE "profiles" SET "founder" = true WHERE "handle" = 'gabrielvalenco';