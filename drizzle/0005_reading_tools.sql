CREATE TABLE "annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"book_id" text NOT NULL,
	"book_title" text NOT NULL,
	"book_author" text NOT NULL,
	"book_cover_id" integer,
	"book_color" text NOT NULL,
	"kind" text NOT NULL,
	"text" text NOT NULL,
	"comment" text DEFAULT '' NOT NULL,
	"page" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "annotations_book_id" CHECK ("annotations"."book_id" ~ '^OL[0-9]+W$'),
	CONSTRAINT "annotations_book_title" CHECK (char_length("annotations"."book_title") between 1 and 300),
	CONSTRAINT "annotations_book_author" CHECK (char_length("annotations"."book_author") <= 200),
	CONSTRAINT "annotations_book_color" CHECK ("annotations"."book_color" ~ '^#[0-9a-f]{6}$'),
	CONSTRAINT "annotations_kind" CHECK ("annotations"."kind" in ('quote', 'note')),
	CONSTRAINT "annotations_text" CHECK (char_length("annotations"."text") between 1 and 4000 and ("annotations"."kind" = 'note' or char_length("annotations"."text") <= 1000)),
	CONSTRAINT "annotations_comment" CHECK (char_length("annotations"."comment") <= 1000),
	CONSTRAINT "annotations_page" CHECK ("annotations"."page" is null or "annotations"."page" between 1 and 100000)
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"user_id" uuid NOT NULL,
	"book_id" text NOT NULL,
	"page" integer NOT NULL,
	"total_pages" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_progress_user_id_book_id_pk" PRIMARY KEY("user_id","book_id"),
	CONSTRAINT "reading_progress_book_id" CHECK ("reading_progress"."book_id" ~ '^OL[0-9]+W$'),
	CONSTRAINT "reading_progress_page" CHECK ("reading_progress"."page" between 0 and 100000),
	CONSTRAINT "reading_progress_total" CHECK ("reading_progress"."total_pages" is null or ("reading_progress"."total_pages" between 1 and 100000 and "reading_progress"."page" <= "reading_progress"."total_pages"))
);
--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "annotations_user_book_idx" ON "annotations" USING btree ("user_id","book_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "annotations_user_kind_idx" ON "annotations" USING btree ("user_id","kind","created_at" DESC NULLS LAST);