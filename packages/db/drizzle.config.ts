import { defineConfig } from "drizzle-kit";

// o .env fica na raiz do monorepo (opcional)
try {
  process.loadEnvFile("../../.env");
} catch {}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL || "postgres://sdp:sdp@localhost:5434/sdp" },
});
