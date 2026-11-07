CREATE TABLE "study_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"chat_id" uuid,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" bigint NOT NULL,
	"path" text NOT NULL,
	"extracted" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_chat_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"chat_id" uuid NOT NULL,
	"role" text NOT NULL,
	"text" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_chats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"pending_since" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" text NOT NULL,
	"level" text NOT NULL,
	"role_spec" jsonb,
	"status" text NOT NULL,
	"data" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"researched_at" text
);
--> statement-breakpoint
CREATE TABLE "study_schedules" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"research_id" uuid,
	"availability" jsonb NOT NULL,
	"schedule" jsonb NOT NULL,
	"pace" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "study_centers" ADD COLUMN "role_spec" jsonb;--> statement-breakpoint
ALTER TABLE "study_centers" ADD COLUMN "research_id" uuid;--> statement-breakpoint
CREATE INDEX "study_attachments_chat" ON "study_attachments" USING btree ("chat_id");--> statement-breakpoint
CREATE INDEX "study_chat_messages_chat" ON "study_chat_messages" USING btree ("chat_id","id");--> statement-breakpoint
CREATE INDEX "study_chats_profile" ON "study_chats" USING btree ("profile_id","updated_at");--> statement-breakpoint
CREATE INDEX "study_research_profile" ON "study_research" USING btree ("profile_id","started_at");--> statement-breakpoint
CREATE INDEX "study_schedules_profile" ON "study_schedules" USING btree ("profile_id","created_at");