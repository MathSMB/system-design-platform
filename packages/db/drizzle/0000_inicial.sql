CREATE TABLE IF NOT EXISTS "activities" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"day" text NOT NULL,
	"ref" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checkins" (
	"profile_id" uuid NOT NULL,
	"day" text NOT NULL,
	"item_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checkins_profile_id_day_item_id_pk" PRIMARY KEY("profile_id","day","item_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"problem" text,
	"document" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "interview_runs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"user_id" uuid,
	"profile_id" uuid,
	"stack" text NOT NULL,
	"level" text NOT NULL,
	"company" text,
	"title" text NOT NULL,
	"outcome" text,
	"level_shown" text,
	"score" real,
	"state" jsonb NOT NULL,
	"feedback" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "market_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"stack" text NOT NULL,
	"level" text NOT NULL,
	"data" jsonb NOT NULL,
	"researched_at" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"stack" text NOT NULL,
	"level" text NOT NULL,
	"goal" text NOT NULL,
	"plan" jsonb,
	"plan_history" jsonb,
	"start_day" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "role_research" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"level" text NOT NULL,
	"status" text NOT NULL,
	"data" jsonb,
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"researched_at" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "study_centers" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"target_role" text,
	"availability" jsonb,
	"trails" jsonb,
	"project_options" jsonb,
	"skill_status" jsonb,
	"schedule" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "activities_once" ON "activities" USING btree ("profile_id","kind","ref");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "activities_day" ON "activities" USING btree ("profile_id","day");
--> statement-breakpoint
-- quem já tinha o banco da main (criado com db:push) não tinha estas colunas
ALTER TABLE "interview_runs" ADD COLUMN IF NOT EXISTS "user_id" uuid;
--> statement-breakpoint
ALTER TABLE "interview_runs" ADD COLUMN IF NOT EXISTS "profile_id" uuid;