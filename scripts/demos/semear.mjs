// Cria uma conta de exemplo com histórico para gravar os vídeos de demonstração.
// Uso (num banco de teste!): node scripts/demos/semear.mjs  → imprime o cookie de sessão.
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../packages/db/package.json"));
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL || "postgres://sdp:sdp@localhost:5434/sdp", { onnotice: () => {} });

const day = (offset) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + offset * 864e5));
const START = -70;
// dias (contados do início) em que a meta foi cumprida
const done = new Set();
for (let d = 0; d <= 26; d++) done.add(d); // monta a placa inteira e faz overclock
// 27 a 41: some por duas semanas → desgaste até queimar
for (let d = 42; d <= 58; d++) done.add(d); // recomeça
// 59 a 62: perde alguns dias → desgaste
for (let d = 63; d <= 69; d++) done.add(d); // conserta e volta a instalar

await sql`delete from users where name = 'Matheus (demo)'`;
const [u] = await sql`insert into users (name) values ('Matheus (demo)') returning id`;
const [p] = await sql`insert into profiles (user_id, stack, level, goal, start_day) values (${u.id}, 'java', 'pleno', 'sugerida', ${day(START)}) returning id`;
for (const d of done) {
  const dd = day(START + d);
  await sql`insert into checkins (profile_id, day, item_id) values (${p.id}, ${dd}, 'estudo') on conflict do nothing`;
  await sql`insert into activities (profile_id, kind, day, ref) values (${p.id}, 'answer', ${dd}, ${"demo:" + dd})`;
}
console.log(JSON.stringify({ userId: u.id, profileId: p.id }));
await sql.end();
