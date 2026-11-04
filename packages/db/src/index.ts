import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseUrl } from "./url";

export * from "./schema";
export { schema };
export { DEFAULT_DATABASE_URL, databaseUrl } from "./url";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

/** Guardado no globalThis para sobreviver ao recarregamento do `pnpm dev`. */
const g = globalThis as { __sdpDb?: Db };

/**
 * O banco compartilhado por todos os apps: o Postgres do Docker
 * (`pnpm db:up`) ou o da DATABASE_URL. As tabelas são criadas pelo
 * `pnpm db:migrate`, que o `pnpm dev` já roda antes de abrir os apps.
 */
export function getDb(): Db {
  return (g.__sdpDb ??= drizzle(postgres(databaseUrl(), { max: 5, onnotice: () => {} }), { schema }));
}
