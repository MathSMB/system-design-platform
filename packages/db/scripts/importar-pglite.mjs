// Copia os dados do banco embutido antigo (PGlite, em apps/web/.data/pglite)
// para o Postgres compartilhado. Pode rodar mais de uma vez: o que já existe fica.
// Uso: pnpm db:importar-pglite [pasta]
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";

const here = dirname(fileURLToPath(import.meta.url));
try {
  process.loadEnvFile(join(here, "../../../.env"));
} catch {}
const dir = resolve(process.argv[2] ?? join(here, "../../../apps/web/.data/pglite"));
if (!existsSync(dir)) {
  console.log(`[importar] Não achei o banco antigo em ${dir}. Nada para copiar.`);
  process.exit(0);
}
const url = process.env.DATABASE_URL || "postgres://sdp:sdp@localhost:5434/sdp";
const TABLES = ["users", "profiles", "activities", "checkins", "designs", "interview_runs", "market_profiles", "study_centers", "role_research"];

const old = new PGlite(dir);
const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  for (const t of TABLES) {
    const has = await old.query(`select to_regclass('public.${t}') as r`);
    if (!has.rows[0]?.r) continue;
    const { rows } = await old.query(`select coalesce(json_agg(x), '[]') as j from "${t}" x`);
    const list = rows[0].j;
    if (!list.length) continue;
    // atividades ganham um id novo (o antigo pode já existir no Postgres); a mesma linha não entra duas vezes
    const query =
      t === "activities"
        ? `insert into activities (profile_id, kind, day, ref, created_at)
           select r.profile_id, r.kind, r.day, r.ref, r.created_at from json_populate_recordset(null::activities, $1::text::json) r
           where not exists (select 1 from activities a where a.profile_id = r.profile_id and a.kind = r.kind and a.day = r.day
                             and a.ref is not distinct from r.ref and a.created_at = r.created_at)
           on conflict do nothing`
        : `insert into "${t}" select * from json_populate_recordset(null::"${t}", $1::text::json) on conflict do nothing`;
    const res = await sql.unsafe(query, [JSON.stringify(list)]);
    console.log(`[importar] ${t}: ${res.count} de ${list.length} linhas copiadas`);
  }
  console.log("[importar] pronto.");
} finally {
  await old.close();
  await sql.end();
}
