CREATE TABLE "subscriptions" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"stripe_subscription_id" text,
	"plan" text DEFAULT 'capa-dura' NOT NULL,
	"status" text DEFAULT 'incomplete' NOT NULL,
	"interval" text,
	"current_period_end" timestamp with time zone,
	"cancel_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_customer_id_unique" UNIQUE("stripe_customer_id"),
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id"),
	CONSTRAINT "subscriptions_plan" CHECK ("subscriptions"."plan" in ('capa-dura', 'ex-libris')),
	CONSTRAINT "subscriptions_customer" CHECK ("subscriptions"."stripe_customer_id" ~ '^cus_')
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;