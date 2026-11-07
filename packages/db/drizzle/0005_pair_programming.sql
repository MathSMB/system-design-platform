CREATE TABLE "pair_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"day" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"setup" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"plan" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"step" bigint DEFAULT 0 NOT NULL,
	"pending_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pair_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "pair_chats_profile" ON "pair_chats" USING btree ("profile_id","updated_at");--> statement-breakpoint
CREATE INDEX "pair_messages_chat" ON "pair_messages" USING btree ("chat_id","id");