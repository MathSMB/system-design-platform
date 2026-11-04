import { defineConfig } from "drizzle-kit";

// o drizzle-kit não lê o .env.local sozinho (o Next.js lê só no dev); Node 22 carrega com loadEnvFile
try {
  process.loadEnvFile(".env.local");
} catch {}

// Com DATABASE_URL: Postgres de rede (Neon). Sem: o banco local embutido em .data/pglite.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(process.env.DATABASE_URL ? { dbCredentials: { url: process.env.DATABASE_URL } } : { driver: "pglite", dbCredentials: { url: "./.data/pglite" } }),
});
