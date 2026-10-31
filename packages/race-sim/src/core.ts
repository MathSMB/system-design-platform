/**
 * Motor "micro" de concorrência.
 *
 * Cada transação é uma lista de passos atômicos sobre um mini-banco. Um scheduler
 * escolhe qual transação anda a cada passo. Com isso dá para:
 *  - andar passo a passo (modo manual, para aprender);
 *  - enumerar TODAS as intercalações possíveis e contar em quantas a regra de negócio quebra.
 *
 * Modelo de isolamento: Read Committed (padrão do PostgreSQL).
 *  - Fora de BEGIN/COMMIT, cada comando faz autocommit.
 *  - Dentro de uma transação, escritas ficam pendentes e só os outros enxergam no COMMIT.
 *  - SELECT ... FOR UPDATE e UPDATE travam a linha até o fim da transação.
 */

export interface Row {
  value: number | null;
  version: number;
}

export interface DbState {
  rows: Record<string, Row>;
  /** Linha → transação que segura o lock. */
  locks: Record<string, number>;
  /** Log append-only de eventos de negócio (ex. "venda"). */
  log: { tx: number; event: string }[];
}

export interface TxState {
  pc: number;
  vars: Record<string, number | null>;
  inTx: boolean;
  pending: Record<string, Row>;
  restarts: number;
  done: boolean;
}

export interface TraceEntry {
  tx: number;
  label: string;
  note: string;
}

export interface RunState {
  db: DbState;
  txs: TxState[];
  trace: TraceEntry[];
}

export type Outcome =
  | { kind: "ok"; note: string }
  | { kind: "blocked" }
  | { kind: "restart"; note: string };

export interface Ctx {
  tx: number;
  state: TxState;
  db: DbState;
}

export interface Step {
  /** Texto mostrado na linha do tempo (parecido com SQL ou pseudocódigo). */
  label: string;
  exec(ctx: Ctx): Outcome;
}

export interface TxProgram {
  name: string;
  steps: Step[];
  /** Quantas vezes pode recomeçar (lock otimista). */
  maxRestarts?: number;
}

export interface Verdict {
  ok: boolean;
  message: string;
}

export interface Scenario {
  id: string;
  title: string;
  description: string;
  /** Explicação curta do problema ou da correção. */
  lesson: string;
  initial: Record<string, number | null>;
  txs: TxProgram[];
  invariant(db: DbState): Verdict;
}

// ---------- leitura/escrita respeitando o isolamento ----------

export function readCommitted(db: DbState, key: string): Row {
  return db.rows[key] ?? { value: null, version: 0 };
}

/** O que a transação enxerga: as próprias escritas pendentes, senão o último valor confirmado. */
export function readOwn(ctx: Ctx, key: string): Row {
  return ctx.state.pending[key] ?? readCommitted(ctx.db, key);
}

export function writeRow(ctx: Ctx, key: string, row: Row): void {
  if (ctx.state.inTx) ctx.state.pending[key] = row;
  else ctx.db.rows[key] = row;
}

export function tryLock(ctx: Ctx, key: string): boolean {
  const holder = ctx.db.locks[key];
  if (holder !== undefined && holder !== ctx.tx) return false;
  ctx.db.locks[key] = ctx.tx;
  return true;
}

export function releaseLocks(db: DbState, tx: number): void {
  for (const k of Object.keys(db.locks)) if (db.locks[k] === tx) delete db.locks[k];
}

export function commitTx(ctx: Ctx): void {
  Object.assign(ctx.db.rows, ctx.state.pending);
  ctx.state.pending = {};
  ctx.state.inTx = false;
  releaseLocks(ctx.db, ctx.tx);
}

// ---------- execução ----------

export function createRun(s: Scenario): RunState {
  const rows: Record<string, Row> = {};
  for (const [k, v] of Object.entries(s.initial)) rows[k] = { value: v, version: 1 };
  return {
    db: { rows, locks: {}, log: [] },
    txs: s.txs.map(() => ({ pc: 0, vars: {}, inTx: false, pending: {}, restarts: 0, done: false })),
    trace: [],
  };
}

function clone(r: RunState): RunState {
  return structuredClone(r);
}

/** Tenta executar o próximo passo da transação `tx`. Retorna null se ela estiver bloqueada ou terminada. */
export function stepTx(s: Scenario, run: RunState, tx: number): RunState | null {
  const st = run.txs[tx]!;
  if (st.done) return null;
  const next = clone(run);
  const ts = next.txs[tx]!;
  const prog = s.txs[tx]!;
  const step = prog.steps[ts.pc]!;
  const out = step.exec({ tx, state: ts, db: next.db });
  if (out.kind === "blocked") return null;

  if (out.kind === "restart" && ts.restarts < (prog.maxRestarts ?? 3)) {
    next.trace.push({ tx, label: step.label, note: out.note });
    releaseLocks(next.db, tx);
    next.txs[tx] = { pc: 0, vars: {}, inTx: false, pending: {}, restarts: ts.restarts + 1, done: false };
    return next;
  }
  next.trace.push({ tx, label: step.label, note: out.kind === "restart" ? `${out.note} (desistiu)` : out.note });
  ts.pc = out.kind === "restart" ? prog.steps.length : ts.pc + 1;
  if (ts.pc >= prog.steps.length) {
    ts.done = true;
    // terminar sem COMMIT explícito: o que estiver pendente é descartado (rollback)
    ts.pending = {};
    ts.inTx = false;
    releaseLocks(next.db, tx);
  }
  return next;
}

/** Transações que podem andar agora (não terminaram e não estão bloqueadas). */
export function enabledTxs(s: Scenario, run: RunState): number[] {
  return run.txs.map((_, i) => i).filter((i) => stepTx(s, run, i) !== null);
}

export function isFinished(run: RunState): boolean {
  return run.txs.every((t) => t.done);
}

export interface ScheduleResult {
  /** Ordem em que as transações andaram, ex. [0, 1, 1, 0]. */
  schedule: number[];
  final: RunState;
  verdict: Verdict;
  deadlock: boolean;
}

export interface ExploreSummary {
  total: number;
  violations: number;
  deadlocks: number;
  truncated: boolean;
  /** Primeira intercalação que quebrou a regra (se houver). */
  example?: ScheduleResult;
  /** Primeira intercalação correta (para comparar). */
  goodExample?: ScheduleResult;
}

/** Enumera todas as intercalações (busca em profundidade). */
export function exploreAll(s: Scenario, limit = 20_000): ExploreSummary {
  const sum: ExploreSummary = { total: 0, violations: 0, deadlocks: 0, truncated: false };
  const dfs = (run: RunState, schedule: number[]) => {
    if (sum.total >= limit) {
      sum.truncated = true;
      return;
    }
    const options = run.txs
      .map((_, i) => [i, stepTx(s, run, i)] as const)
      .filter((x): x is readonly [number, RunState] => x[1] !== null);
    if (options.length === 0) {
      const deadlock = !isFinished(run);
      const verdict = deadlock
        ? { ok: false, message: "Deadlock: cada transação espera um lock que a outra segura." }
        : s.invariant(run.db);
      sum.total++;
      const result = { schedule, final: run, verdict, deadlock };
      if (deadlock) sum.deadlocks++;
      if (!verdict.ok) {
        sum.violations++;
        sum.example ??= result;
      } else {
        sum.goodExample ??= result;
      }
      return;
    }
    for (const [i, nextRun] of options) dfs(nextRun, [...schedule, i]);
  };
  dfs(createRun(s), []);
  return sum;
}

/** Executa uma ordem específica de transações (útil para reproduzir um bug). */
export function runSchedule(s: Scenario, schedule: number[]): RunState {
  let run = createRun(s);
  for (const tx of schedule) {
    const next = stepTx(s, run, tx);
    if (!next) throw new Error(`A transação ${tx} não pode andar neste ponto.`);
    run = next;
  }
  return run;
}
