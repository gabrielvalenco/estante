CREATE TABLE "entries" (
	"user_id" uuid NOT NULL,
	"book_id" text NOT NULL,
	"book_title" text NOT NULL,
	"book_author" text NOT NULL,
	"book_cover_id" integer,
	"book_color" text NOT NULL,
	"book_year" integer,
	"book_pages" integer,
	"status" text,
	"rating" numeric(2, 1),
	"liked" boolean DEFAULT false NOT NULL,
	"review" text DEFAULT '' NOT NULL,
	"finished_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entries_user_id_book_id_pk" PRIMARY KEY("user_id","book_id"),
	CONSTRAINT "entries_book_id" CHECK ("entries"."book_id" ~ '^OL[0-9]+W$'),
	CONSTRAINT "entries_book_title" CHECK (char_length("entries"."book_title") between 1 and 300),
	CONSTRAINT "entries_book_author" CHECK (char_length("entries"."book_author") <= 200),
	CONSTRAINT "entries_book_color" CHECK ("entries"."book_color" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "entries_book_pages" CHECK ("entries"."book_pages" is null or "entries"."book_pages" > 0),
	CONSTRAINT "entries_status" CHECK ("entries"."status" is null or "entries"."status" in ('quero-ler', 'lendo', 'lido')),
	CONSTRAINT "entries_rating" CHECK ("entries"."rating" is null or ("entries"."rating" between 0.5 and 5 and "entries"."rating" * 2 = floor("entries"."rating" * 2))),
	CONSTRAINT "entries_review" CHECK (char_length("entries"."review") <= 600)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider_id" text NOT NULL,
	"handle" text NOT NULL,
	"name" text NOT NULL,
	"bio" text DEFAULT '' NOT NULL,
	"tone" text DEFAULT 'anil' NOT NULL,
	"goal" integer DEFAULT 24 NOT NULL,
	"favorites" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_provider_id_unique" UNIQUE("provider_id"),
	CONSTRAINT "profiles_handle_unique" UNIQUE("handle"),
	CONSTRAINT "profiles_handle_format" CHECK ("profiles"."handle" ~ '^[a-z0-9_]{3,20}$'),
	CONSTRAINT "profiles_handle_reserved" CHECK (handle not in ('marina', 'theo', 'bia', 'caio', 'luiza', 'rafa')),
	CONSTRAINT "profiles_name_length" CHECK (char_length("profiles"."name") between 1 and 60),
	CONSTRAINT "profiles_bio_length" CHECK (char_length("profiles"."bio") <= 200),
	CONSTRAINT "profiles_tone" CHECK ("profiles"."tone" in ('anil', 'ameixa', 'musgo', 'ambar')),
	CONSTRAINT "profiles_goal" CHECK ("profiles"."goal" between 1 and 365),
	CONSTRAINT "profiles_favorites" CHECK (cardinality("profiles"."favorites") <= 4)
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entries_user_updated_idx" ON "entries" USING btree ("user_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "entries_book_reviews_idx" ON "entries" USING btree ("book_id","updated_at" DESC NULLS LAST) WHERE "entries"."review" <> '';