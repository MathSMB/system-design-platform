import { defineConfig } from "drizzle-kit";

// o drizzle-kit não lê o .env.local sozinho (o Next.js lê só no dev); Node 22 carrega com loadEnvFile
try {
  process.loadEnvFile(".env.local");
} catch {}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://sdp:sdp@localhost:5432/sdp" },
});
