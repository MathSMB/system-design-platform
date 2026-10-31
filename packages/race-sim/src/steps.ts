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

/** UPDATE atômico: UPDATE t SET v = v + delta WHERE v + delta >= min. Guarda 1/0 (linhas afetadas). */
export const atomicAdd = (key: string, delta: number, min: number, into: string): Step => ({
  label: `UPDATE ${key} = ${key} ${delta < 0 ? "-" : "+"} ${Math.abs(delta)} WHERE ${key} ${delta < 0 ? "-" : "+"} ${Math.abs(delta)} >= ${min}`,
  exec: (ctx) => {
    if (!tryLock(ctx, key)) return { kind: "blocked" };
    const row = readOwn(ctx, key);
    const cur = row.value ?? 0;
    if (cur + delta >= min) {
      writeRow(ctx, key, { value: cur + delta, version: row.version + 1 });
      ctx.state.vars[into] = 1;
      autocommit(ctx);
      return { kind: "ok", note: `${key}: ${cur} → ${cur + delta} (1 linha afetada)` };
    }
    ctx.state.vars[into] = 0;
    autocommit(ctx);
    return { kind: "ok", note: `${key} = ${cur}, condição falsa (0 linhas afetadas)` };
  },
});

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
