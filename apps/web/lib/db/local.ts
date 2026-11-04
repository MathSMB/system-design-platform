import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";

/** Pasta do banco local: tudo o que a plataforma guarda fica aqui (copie para fazer backup). */
export const LOCAL_DB_DIR = process.env.LOCAL_DB_DIR ?? join(process.cwd(), ".data", "pglite");

const GATED = new Set(["query", "exec", "transaction", "sql"]);

/**
 * Abre o Postgres embutido (PGlite) e aplica as migrações da pasta drizzle/.
 * Volta na hora: as consultas esperam as migrações terminarem.
 * Só um processo pode usar a pasta por vez: feche o `pnpm dev` antes de abrir o db:studio.
 */
export function openLocalDb(dir = LOCAL_DB_DIR) {
  mkdirSync(dir, { recursive: true });
  const raw = new PGlite(dir);
  const ready = migrate(drizzle(raw, { schema }), { migrationsFolder: join(process.cwd(), "drizzle") }).then(
    () => console.log(`[banco] local salvo em ${dir}`),
    (e) => {
      console.error("[banco] não deu para preparar o banco local:", e);
      throw e;
    },
  );
  // até as migrações terminarem, toda consulta espera
  const gated = new Proxy(raw, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r);
      if (typeof v !== "function") return v;
      if (typeof k === "string" && GATED.has(k)) return async (...a: unknown[]) => (await ready, v.apply(t, a));
      return v.bind(t);
    },
  });
  return drizzle(gated, { schema });
}
