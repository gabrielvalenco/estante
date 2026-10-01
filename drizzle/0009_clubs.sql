CREATE TABLE "club_members" (
	"club_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "club_members_club_id_profile_id_pk" PRIMARY KEY("club_id","profile_id"),
	CONSTRAINT "club_members_role" CHECK ("club_members"."role" in ('owner', 'member'))
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"owner_id" uuid NOT NULL,
	"book_id" text,
	"book_title" text,
	"book_author" text,
	"book_cover_id" integer,
	"book_color" text,
	"invite_code" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clubs_invite_code_unique" UNIQUE("invite_code"),
	CONSTRAINT "clubs_name" CHECK (char_length("clubs"."name") between 3 and 60),
	CONSTRAINT "clubs_description" CHECK (char_length("clubs"."description") <= 500),
	CONSTRAINT "clubs_book_id" CHECK ("clubs"."book_id" is null or "clubs"."book_id" ~ '^OL[0-9]+W$'),
	CONSTRAINT "clubs_invite_code" CHECK ("clubs"."invite_code" ~ '^[A-Za-z0-9]{10,32}$')
);
--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD COLUMN "club_id" uuid;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_members" ADD CONSTRAINT "club_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_owner_id_profiles_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "club_members_profile_idx" ON "club_members" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "clubs_owner_idx" ON "clubs" USING btree ("owner_id");--> statement-breakpoint
ALTER TABLE "discussion_threads" ADD CONSTRAINT "discussion_threads_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "discussion_threads_club_idx" ON "discussion_threads" USING btree ("club_id","last_activity_at" DESC NULLS LAST);