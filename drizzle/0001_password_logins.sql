CREATE TABLE "password_logins" (
	"email" text PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"password_hash" text NOT NULL,
	"failed_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_logins_profile_id_unique" UNIQUE("profile_id"),
	CONSTRAINT "password_logins_email" CHECK ("password_logins"."email" = lower("password_logins"."email") and char_length("password_logins"."email") <= 254 and "password_logins"."email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
--> statement-breakpoint
ALTER TABLE "password_logins" ADD CONSTRAINT "password_logins_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;