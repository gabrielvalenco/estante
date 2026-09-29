CREATE TABLE "discussion_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"page" integer DEFAULT 0 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_posts_body" CHECK (char_length("discussion_posts"."body") between 1 and 4000),
	CONSTRAINT "discussion_posts_page" CHECK ("discussion_posts"."page" between 0 and 100000)
);
--> statement-breakpoint
CREATE TABLE "discussion_reports" (
	"reporter_id" uuid NOT NULL,
	"target_kind" text NOT NULL,
	"target_id" uuid NOT NULL,
	"reason" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_reports_reporter_id_target_kind_target_id_pk" PRIMARY KEY("reporter_id","target_kind","target_id"),
	CONSTRAINT "discussion_reports_kind" CHECK ("discussion_reports"."target_kind" in ('thread', 'post')),
	CONSTRAINT "discussion_reports_reason" CHECK (char_length("discussion_reports"."reason") <= 300)
);
--> statement-breakpoint
CREATE TABLE "discussion_threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" text NOT NULL,
	"book_title" text NOT NULL,
	"author_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"page" integer DEFAULT 0 NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_activity_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discussion_threads_book_id" CHECK ("discussion_threads"."book_id" ~ '^OL[0-9]+W$'),
	CONSTRAINT "discussion_threads_book_title" CHECK (char_length("discussion_threads"."book_title") between 1 and 300),
	CONSTRAINT "discussion_threads_title" CHECK (char_length("discussion_threads"."title") between 3 and 120),
	CONSTRAINT "discussion_threads_body" CHECK (char_length("discussion_threads"."body") between 1 and 4000),
	CONSTRAINT "discussion_threads_page" CHECK ("discussion_threads"."page" between 0 and 100000)
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_type";--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_thread_id_discussion_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."discussion_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_posts" ADD CONSTRAINT "discussion_posts_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_reports" ADD CONSTRAINT "discussion_reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_posts_thread_idx" ON "discussion_posts" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "discussion_posts_author_idx" ON "discussion_posts" USING btree ("author_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "discussion_reports_target_idx" ON "discussion_reports" USING btree ("target_kind","target_id");--> statement-breakpoint
CREATE INDEX "discussion_threads_book_idx" ON "discussion_threads" USING btree ("book_id","last_activity_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "discussion_threads_author_idx" ON "discussion_threads" USING btree ("author_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type" CHECK (type in ('follow', 'follow_request', 'follow_accepted', 'review_like', 'friend_finished', 'discussion_reply'));