// Roda antes do `pnpm dev`: sobe o Postgres do Docker (se precisar) e atualiza as tabelas.
import { spawnSync } from "node:child_process";
import { connect } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
try {
  process.loadEnvFile(join(root, ".env"));
} catch {}

const portOpen = (host, port) =>
  new Promise((ok) => {
    const s = connect({ host, port, timeout: 800 }, () => (s.destroy(), ok(true)));
    s.on("error", () => ok(false));
    s.on("timeout", () => (s.destroy(), ok(false)));
  });

// com DATABASE_URL própria, o banco é por sua conta; sem ela, usa o Postgres do docker-compose
if (!process.env.DATABASE_URL && !(await portOpen("127.0.0.1", 5432))) {
  console.log("[banco] subindo o Postgres no Docker (docker compose up -d)…");
  const r = spawnSync("docker", ["compose", "up", "-d", "--wait", "db"], { cwd: root, stdio: "inherit" });
  if (r.error || r.status !== 0) {
    console.error("\n[banco] Não consegui subir o Postgres. Abra o Docker Desktop e rode de novo (ou rode `pnpm db:up`).\n");
    process.exit(1);
  }
}

const m = spawnSync(process.execPath, [join(root, "packages/db/scripts/migrate.mjs")], { stdio: "inherit" });
process.exit(m.status ?? 1);
