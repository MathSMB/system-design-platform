import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { openLocalDb } from "./local";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/** Guardado no globalThis para sobreviver ao recarregamento do `pnpm dev`. */
const g = globalThis as { __sdpDb?: Db };

/**
 * O banco da plataforma.
 * - Com DATABASE_URL (Neon ou outro Postgres): conecta nele.
 * - Sem DATABASE_URL: o banco local embutido (PGlite), salvo em apps/web/.data.
 *   Nada para instalar, e tudo fica salvo entre um `pnpm dev` e outro.
 */
export function getDb(): Db {
  if (process.env.DATABASE_URL) return (g.__sdpDb ??= drizzle(postgres(process.env.DATABASE_URL, { max: 5 }), { schema }));
  // a API das consultas é a mesma do postgres-js; o tipo é o do driver de rede
  return (g.__sdpDb ??= openLocalDb() as unknown as Db);
}
