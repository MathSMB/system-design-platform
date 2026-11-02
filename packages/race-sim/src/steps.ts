import { commitTx, readCommitted, readOwn, tryLock, writeRow, type Ctx, type Outcome, type Step } from "./core";

type Vars = Record<string, number | null>;
type Cond = (v: Vars) => boolean;

const fmt = (x: number | null | undefined) => (x === null || x === undefined ? "vazio" : String(x));
const skipped: Outcome = { kind: "ok", note: "pulou (condição falsa)" };

function guard(when: Cond | undefined, ctx: Ctx): boolean {
  return when ? when(ctx.state.vars) : true;
}

/** Fim de comando fora de transação: o lock dura só o comando (autocommit). */
function autocommit(ctx: Ctx): void {
  if (!ctx.state.inTx) commitTx(ctx);
}

export const begin = (): Step => ({
  label: "BEGIN",
  exec: (ctx) => {
    ctx.state.inTx = true;
    return { kind: "ok", note: "abriu transação" };
  },
});

export const commit = (): Step => ({
  label: "COMMIT",
  exec: (ctx) => {
    const pend = Object.keys(ctx.state.pending);
    commitTx(ctx);
    return { kind: "ok", note: pend.length ? `confirmou ${pend.join(", ")} e soltou os locks` : "confirmou" };
  },
});

export const select = (key: string, into: string): Step => ({
  label: `SELECT ${key}`,
  exec: (ctx) => {
    const row = readOwn(ctx, key);
    ctx.state.vars[into] = row.value;
    ctx.state.vars[`${into}_ver`] = row.version;
    return { kind: "ok", note: `leu ${key} = ${fmt(row.value)} (versão ${row.version})` };
  },
});

export const selectForUpdate = (key: string, into: string): Step => ({
  label: `SELECT ${key} FOR UPDATE`,
  exec: (ctx) => {
    if (!tryLock(ctx, key)) return { kind: "blocked" };
    const row = readOwn(ctx, key);
    ctx.state.vars[into] = row.value;
    return { kind: "ok", note: `travou ${key} e leu ${fmt(row.value)}` };
  },
});

/** UPDATE gravando um valor calculado na aplicação (o padrão "ler, calcular, gravar"). */
export const update = (key: string, exprLabel: string, expr: (v: Vars) => number, when?: Cond): Step => ({
  label: `UPDATE ${key} = ${exprLabel}`,
  exec: (ctx) => {
    if (!guard(when, ctx)) return skipped;
    if (!tryLock(ctx, key)) return { kind: "blocked" };
    const value = expr(ctx.state.vars);
    const row = readOwn(ctx, key);
    writeRow(ctx, key, { value, version: row.version + 1 });
    autocommit(ctx);
    return { kind: "ok", note: `gravou ${key} = ${value}${ctx.state.inTx ? " (pendente até o COMMIT)" : ""}` };
  },
});

/**
 * UPDATE atômico: UPDATE t SET v = v + delta [WHERE v + delta >= min]. Guarda 1/0 (linhas afetadas).
 * min = null: sem condição (ex.: creditar).
 */
export const atomicAdd = (key: string, delta: number, min: number | null, into: string, when?: Cond): Step => {
  const op = `${key} ${delta < 0 ? "-" : "+"} ${Math.abs(delta)}`;
  return {
    label: `UPDATE ${key} = ${op}${min === null ? "" : ` WHERE ${op} >= ${min}`}`,
    exec: (ctx) => {
      if (!guard(when, ctx)) return skipped;
      if (!tryLock(ctx, key)) return { kind: "blocked" };
      const row = readOwn(ctx, key);
      const cur = row.value ?? 0;
      if (min === null || cur + delta >= min) {
        writeRow(ctx, key, { value: cur + delta, version: row.version + 1 });
        ctx.state.vars[into] = 1;
        autocommit(ctx);
        return { kind: "ok", note: `${key}: ${cur} → ${cur + delta} (1 linha afetada)${ctx.state.inTx ? ", pendente até o COMMIT" : ""}` };
      }
      ctx.state.vars[into] = 0;
      autocommit(ctx);
      return { kind: "ok", note: `${key} = ${cur}, condição falsa (0 linhas afetadas)` };
    },
  };
};

/** INSERT com chave única: a segunda tentativa com a mesma chave falha. Guarda 1 (inseriu) ou 0 (já existia). */
export const insertUnique = (table: string, id: string, into: string): Step => {
  const key = `${table}:${id}`;
  return {
    label: `INSERT INTO ${table} (id) VALUES ('${id}')`,
    exec: (ctx) => {
      if (!tryLock(ctx, key)) return { kind: "blocked" };
      const row = readOwn(ctx, key);
      if (row.value !== null) {
        ctx.state.vars[into] = 0;
        autocommit(ctx);
        return { kind: "ok", note: `chave '${id}' já existe: violou UNIQUE, não processa de novo` };
      }
      writeRow(ctx, key, { value: 1, version: row.version + 1 });
      ctx.state.vars[into] = 1;
      autocommit(ctx);
      return { kind: "ok", note: `inseriu '${id}'${ctx.state.inTx ? " (pendente até o COMMIT; a chave fica travada)" : ""}` };
    },
  };
};

/** Lock otimista: UPDATE ... SET v = ?, version = version + 1 WHERE version = ?. Recomeça se a versão mudou. */
export const updateIfVersion = (
  key: string,
  exprLabel: string,
  expr: (v: Vars) => number,
  versionVar: string,
  when?: Cond,
): Step => ({
  label: `UPDATE ${key} = ${exprLabel} WHERE version = <lida>`,
  exec: (ctx) => {
    if (!guard(when, ctx)) return skipped;
    if (!tryLock(ctx, key)) return { kind: "blocked" };
    const row = readOwn(ctx, key);
    const expected = ctx.state.vars[versionVar];
    if (row.version !== expected) {
      autocommit(ctx);
      return { kind: "restart", note: `versão mudou (${expected} → ${row.version}): 0 linhas afetadas, recomeça` };
    }
    const value = expr(ctx.state.vars);
    writeRow(ctx, key, { value, version: row.version + 1 });
    autocommit(ctx);
    return { kind: "ok", note: `gravou ${key} = ${value} (versão ${row.version + 1})` };
  },
});

/** Registra um evento de negócio (ex. "venda") num log que nunca perde dados. */
export const emit = (event: string, when?: Cond): Step => ({
  label: `registrar "${event}"`,
  exec: (ctx) => {
    if (!guard(when, ctx)) return skipped;
    ctx.db.log.push({ tx: ctx.tx, event });
    return { kind: "ok", note: `registrou ${event}` };
  },
});

// ---------- cache (chave-valor sem transação) ----------

export const cacheGet = (key: string, into: string): Step => ({
  label: `cache GET ${key}`,
  exec: (ctx) => {
    const v = readCommitted(ctx.db, `cache:${key}`).value;
    ctx.state.vars[into] = v;
    return { kind: "ok", note: v === null ? "miss" : `hit: ${v}` };
  },
});

export const cacheSet = (key: string, fromVar: string, when?: Cond): Step => ({
  label: `cache SET ${key}`,
  exec: (ctx) => {
    if (!guard(when, ctx)) return skipped;
    const v = ctx.state.vars[fromVar] ?? null;
    ctx.db.rows[`cache:${key}`] = { value: v, version: 0 };
    return { kind: "ok", note: `gravou no cache ${key} = ${fmt(v)}` };
  },
});

export const cacheDelete = (key: string): Step => ({
  label: `cache DEL ${key}`,
  exec: (ctx) => {
    ctx.db.rows[`cache:${key}`] = { value: null, version: 0 };
    return { kind: "ok", note: "apagou a chave do cache" };
  },
});

// ---------- Redis (comandos atômicos um a um, sem transação) ----------

const rkey = (key: string) => `redis:${key}`;

export const redisGet = (key: string, into: string): Step => ({
  label: `GET ${key}`,
  exec: (ctx) => {
    const v = readCommitted(ctx.db, rkey(key)).value;
    ctx.state.vars[into] = v;
    return { kind: "ok", note: v === null ? "vazio: parece livre" : `já tem dono: ${v}` };
  },
});

export const redisSet = (key: string, value: number, when?: Cond): Step => ({
  label: `SET ${key} ${value}`,
  exec: (ctx) => {
    if (!guard(when, ctx)) return skipped;
    const old = readCommitted(ctx.db, rkey(key)).value;
    ctx.db.rows[rkey(key)] = { value, version: 0 };
    return { kind: "ok", note: old === null ? `gravou ${value}` : `sobrescreveu ${old} com ${value}` };
  },
});

/** SET ... NX: só grava se a chave não existir. Guarda 1 (gravou) ou 0. */
export const redisSetNx = (key: string, value: number, into: string): Step => ({
  label: `SET ${key} ${value} NX PX 420000`,
  exec: (ctx) => {
    const old = readCommitted(ctx.db, rkey(key)).value;
    if (old !== null) {
      ctx.state.vars[into] = 0;
      return { kind: "ok", note: `chave já existe (dono ${old}): não gravou` };
    }
    ctx.db.rows[rkey(key)] = { value, version: 0 };
    ctx.state.vars[into] = 1;
    return { kind: "ok", note: `gravou ${value} (expira em 7 min)` };
  },
});

// ---------- event store ----------

/** Reidrata o agregado: lê o saldo (a soma dos eventos) e a versão do stream. */
export const loadStream = (stream: string, into: string): Step => ({
  label: `ler ${stream} (reidratar eventos)`,
  exec: (ctx) => {
    const row = readCommitted(ctx.db, stream);
    ctx.state.vars[into] = row.value;
    ctx.state.vars[`${into}_ver`] = row.version;
    return { kind: "ok", note: `saldo ${fmt(row.value)}, versão ${row.version}` };
  },
});

/**
 * Acrescenta um evento ao stream. Com versionVar, é o append com versão esperada
 * (expectedRevision): se alguém gravou antes, falha e a transação recomeça.
 */
export const appendEvent = (stream: string, event: string, delta: number, versionVar: string | null, when?: Cond): Step => ({
  label: versionVar ? `append ${event} (versão esperada = lida)` : `append ${event}`,
  exec: (ctx) => {
    if (!guard(when, ctx)) return skipped;
    const row = readCommitted(ctx.db, stream);
    if (versionVar && row.version !== ctx.state.vars[versionVar]) {
      return { kind: "restart", note: `versão do stream mudou (${ctx.state.vars[versionVar]} → ${row.version}): append recusado, recomeça` };
    }
    const value = (row.value ?? 0) + delta;
    ctx.db.rows[stream] = { value, version: row.version + 1 };
    ctx.db.log.push({ tx: ctx.tx, event });
    return { kind: "ok", note: `gravou ${event}: saldo ${fmt(row.value)} → ${value} (versão ${row.version + 1})` };
  },
});
