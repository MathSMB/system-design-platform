// Cria e atualiza as tabelas do banco compartilhado (roda sozinho antes do `pnpm dev`).
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(join(here, "../../../.env"));
} catch {}
const url = process.env.DATABASE_URL || "postgres://sdp:sdp@localhost:5434/sdp";
const shown = url.replace(/\/\/[^@]*@/, "//***@");

const sql = postgres(url, { max: 1, onnotice: () => {}, connect_timeout: 5 });
let tries = 0;
for (;;) {
  try {
    await sql`select 1`;
    break;
  } catch (e) {
    // o Postgres do Docker leva alguns segundos para aceitar conexão
    if (++tries >= 15) {
      console.error(`\n[banco] Não consegui conectar em ${shown}.`);
      console.error("[banco] Abra o Docker Desktop e rode `pnpm db:up` (ou ajuste DATABASE_URL no .env da raiz).\n");
      console.error(String(e?.message ?? e));
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}
// trava para dois apps não migrarem ao mesmo tempo
await sql`select pg_advisory_lock(727001)`;
try {
  await migrate(drizzle(sql), { migrationsFolder: join(here, "../drizzle") });
  console.log(`[banco] tabelas em dia (${shown})`);
} finally {
  await sql`select pg_advisory_unlock(727001)`;
  await sql.end();
}
