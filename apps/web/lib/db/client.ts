import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

/** Retorna o banco, ou null se DATABASE_URL não estiver configurada. */
export function getDb() {
  if (!process.env.DATABASE_URL) return null;
  db ??= drizzle(postgres(process.env.DATABASE_URL, { max: 5 }), { schema });
  return db;
}
