ALTER TABLE "profiles" ADD COLUMN "avatar_url" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "avatar_opt_out" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_avatar_url" CHECK ("profiles"."avatar_url" is null or "profiles"."avatar_url" ~ '^(https://|/uploads/avatars/)');