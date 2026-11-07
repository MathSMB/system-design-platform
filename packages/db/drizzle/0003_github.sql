CREATE TABLE "github_tokens" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"token_enc" text NOT NULL,
	"hint" text NOT NULL,
	"login" text,
	"expires_at" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
