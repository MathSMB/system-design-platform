CREATE TABLE "event_cursors" (
	"consumer" text PRIMARY KEY NOT NULL,
	"last_id" bigint DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"user_id" uuid,
	"profile_id" uuid,
	"ref" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "events_once" ON "events" USING btree ("type","profile_id","ref");--> statement-breakpoint
CREATE INDEX "events_profile" ON "events" USING btree ("profile_id","id");