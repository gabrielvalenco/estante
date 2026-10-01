CREATE TABLE "support_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_messages_author" CHECK ("support_messages"."author" in ('pessoa', 'suporte')),
	CONSTRAINT "support_messages_body" CHECK (char_length("support_messages"."body") between 1 and 5000)
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" integer GENERATED ALWAYS AS IDENTITY (sequence name "support_tickets_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"profile_id" uuid,
	"email" text,
	"name" text,
	"topic" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'aberto' NOT NULL,
	"access_hash" text NOT NULL,
	"ip_hash" text,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "support_tickets_number_unique" UNIQUE("number"),
	CONSTRAINT "support_tickets_access_hash_unique" UNIQUE("access_hash"),
	CONSTRAINT "support_tickets_owner" CHECK ("support_tickets"."profile_id" is not null or "support_tickets"."email" is not null),
	CONSTRAINT "support_tickets_email" CHECK ("support_tickets"."email" is null or (char_length("support_tickets"."email") <= 254 and "support_tickets"."email" ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
	CONSTRAINT "support_tickets_name" CHECK ("support_tickets"."name" is null or char_length("support_tickets"."name") <= 80),
	CONSTRAINT "support_tickets_subject" CHECK (char_length("support_tickets"."subject") between 3 and 120),
	CONSTRAINT "support_tickets_topic" CHECK (topic in ('conta', 'cobranca', 'reembolso', 'erro', 'denuncia', 'privacidade', 'sugestao')),
	CONSTRAINT "support_tickets_status" CHECK (status in ('aberto', 'respondido', 'resolvido'))
);
--> statement-breakpoint
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_type";--> statement-breakpoint
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "support_messages_ticket_idx" ON "support_messages" USING btree ("ticket_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_profile_idx" ON "support_tickets" USING btree ("profile_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_tickets_status_idx" ON "support_tickets" USING btree ("status","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "support_tickets_ip_idx" ON "support_tickets" USING btree ("ip_hash","created_at");--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_type" CHECK (type in ('follow', 'follow_request', 'follow_accepted', 'review_like', 'friend_finished', 'discussion_reply', 'support_reply'));