import type { DbState, Scenario, Verdict } from "./core";
import {
  atomicAdd,
  begin,
  cacheDelete,
  cacheGet,
  cacheSet,
  commit,
  emit,
  select,
  selectForUpdate,
  update,
  updateIfVersion,
} from "./steps";

const v = (db: DbState, key: string) => db.rows[key]?.value ?? null;
const temEstoque = (vars: Record<string, number | null>) => (vars.e ?? 0) > 0;

function inventoryInvariant(initial: number) {
  return (db: DbState): Verdict => {
    const vendas = db.log.filter((l) => l.event === "venda").length;
    const estoque = v(db, "estoque") ?? 0;
    if (estoque < 0) return { ok: false, message: `Estoque negativo (${estoque}).` };
    if (vendas !== initial - estoque) {
      return {
        ok: false,
        message: `Overselling: ${vendas} vendas registradas, mas o estoque só baixou ${initial - estoque}.`,
      };
    }
    return { ok: true, message: `Correto: ${vendas} venda(s), estoque final ${estoque}.` };
  };
}

const buyers = ["Comprador A", "Comprador B"];

export const SCENARIOS: Scenario[] = [
  {
    id: "lost-update",
    title: "Último ingresso: ler, calcular, gravar",
    description: "Dois compradores tentam levar o último ingresso ao mesmo tempo. A aplicação lê o estoque, confere se é maior que zero e grava o valor menos um.",
    lesson:
      "Lost update: os dois leem 1 antes de alguém gravar, os dois gravam 0 e os dois registram a venda. Read Committed não impede isso.",
    initial: { estoque: 1 },
    txs: buyers.map((name) => ({
      name,
      steps: [select("estoque", "e"), update("estoque", "e - 1", (x) => (x.e ?? 0) - 1, temEstoque), emit("venda", temEstoque)],
    })),
    invariant: inventoryInvariant(1),
  },
  {
    id: "atomic-update",
    title: "Correção 1: UPDATE atômico",
    description: "O banco faz a conta e a verificação no mesmo comando: UPDATE ... SET estoque = estoque - 1 WHERE estoque - 1 >= 0.",
    lesson: "Quem chegar depois recebe 0 linhas afetadas e não vende. É a correção mais simples e resolve a maioria dos casos.",
    initial: { estoque: 1 },
    txs: buyers.map((name) => ({
      name,
      steps: [atomicAdd("estoque", -1, 0, "ok"), emit("venda", (x) => x.ok === 1)],
    })),
    invariant: inventoryInvariant(1),
  },
  {
    id: "select-for-update",
    title: "Correção 2: lock pessimista (SELECT FOR UPDATE)",
    description: "Cada comprador abre uma transação e trava a linha antes de ler. O segundo espera o primeiro dar COMMIT.",
    lesson: "O segundo comprador fica bloqueado no SELECT FOR UPDATE e, quando passa, já lê 0. Custo: espera e risco de deadlock.",
    initial: { estoque: 1 },
    txs: buyers.map((name) => ({
      name,
      steps: [
        begin(),
        selectForUpdate("estoque", "e"),
        update("estoque", "e - 1", (x) => (x.e ?? 0) - 1, temEstoque),
        commit(),
        emit("venda", temEstoque),
      ],
    })),
    invariant: inventoryInvariant(1),
  },
  {
    id: "optimistic",
    title: "Correção 3: lock otimista (coluna version)",
    description: "Lê o valor e a versão; grava só se a versão ainda for a mesma. Se mudou, recomeça.",
    lesson: "Ninguém espera lock longo. Quem perde a corrida recomeça, relê 0 e não vende. Bom quando conflito é raro.",
    initial: { estoque: 1 },
    txs: buyers.map((name) => ({
      name,
      maxRestarts: 3,
      steps: [
        select("estoque", "e"),
        updateIfVersion("estoque", "e - 1", (x) => (x.e ?? 0) - 1, "e_ver", temEstoque),
        emit("venda", temEstoque),
      ],
    })),
    invariant: inventoryInvariant(1),
  },
  {
    id: "write-skew",
    title: "Write skew: plantão médico",
    description: "Regra: pelo menos um médico de plantão. Alice e Bob estão de plantão e pedem para sair ao mesmo tempo. Cada um confere que há 2 e sai.",
    lesson:
      "Cada transação grava uma linha diferente, então lock de linha não conflita. Os dois saem e ninguém fica. Snapshot Isolation (Repeatable Read do Postgres) também permite isso; só Serializable ou travar as linhas lidas resolve.",
    initial: { alice: 1, bob: 1 },
    txs: [
      { name: "Alice", steps: [begin(), select("alice", "a"), select("bob", "b"), update("alice", "0", () => 0, (x) => (x.a ?? 0) + (x.b ?? 0) >= 2), commit()] },
      { name: "Bob", steps: [begin(), select("alice", "a"), select("bob", "b"), update("bob", "0", () => 0, (x) => (x.a ?? 0) + (x.b ?? 0) >= 2), commit()] },
    ],
    invariant: (db) => {
      const n = (v(db, "alice") ?? 0) + (v(db, "bob") ?? 0);
      return n >= 1 ? { ok: true, message: `${n} médico(s) de plantão.` } : { ok: false, message: "Ninguém de plantão." };
    },
  },
  {
    id: "write-skew-locked",
    title: "Correção: travar as linhas lidas (mesma ordem)",
    description: "As duas transações fazem SELECT FOR UPDATE em alice e depois em bob, sempre nessa ordem.",
    lesson: "Quem chega depois espera; quando passa, vê só 1 de plantão e não sai. A ordem fixa de locks evita deadlock.",
    initial: { alice: 1, bob: 1 },
    txs: [
      { name: "Alice", steps: [begin(), selectForUpdate("alice", "a"), selectForUpdate("bob", "b"), update("alice", "0", () => 0, (x) => (x.a ?? 0) + (x.b ?? 0) >= 2), commit()] },
      { name: "Bob", steps: [begin(), selectForUpdate("alice", "a"), selectForUpdate("bob", "b"), update("bob", "0", () => 0, (x) => (x.a ?? 0) + (x.b ?? 0) >= 2), commit()] },
    ],
    invariant: (db) => {
      const n = (v(db, "alice") ?? 0) + (v(db, "bob") ?? 0);
      return n >= 1 ? { ok: true, message: `${n} médico(s) de plantão.` } : { ok: false, message: "Ninguém de plantão." };
    },
  },
  {
    id: "deadlock",
    title: "Deadlock: locks em ordem diferente",
    description: "Alice trava alice e depois bob; Bob trava bob e depois alice.",
    lesson: "Se cada um pegar o primeiro lock, os dois esperam o outro para sempre. Bancos detectam e abortam uma das transações; a correção é travar sempre na mesma ordem.",
    initial: { alice: 1, bob: 1 },
    txs: [
      { name: "Alice", steps: [begin(), selectForUpdate("alice", "a"), selectForUpdate("bob", "b"), update("alice", "0", () => 0, (x) => (x.a ?? 0) + (x.b ?? 0) >= 2), commit()] },
      { name: "Bob", steps: [begin(), selectForUpdate("bob", "b"), selectForUpdate("alice", "a"), update("bob", "0", () => 0, (x) => (x.a ?? 0) + (x.b ?? 0) >= 2), commit()] },
    ],
    invariant: (db) => {
      const n = (v(db, "alice") ?? 0) + (v(db, "bob") ?? 0);
      return n >= 1 ? { ok: true, message: `${n} médico(s) de plantão.` } : { ok: false, message: "Ninguém de plantão." };
    },
  },
  {
    id: "cache-aside-stale",
    title: "Cache-aside: cache com valor velho",
    description: "Um leitor tem cache miss e busca o preço no banco. Ao mesmo tempo, um escritor atualiza o preço e apaga a chave do cache.",
    lesson:
      "Se o leitor buscar o valor antigo, o escritor apagar o cache e só então o leitor gravar no cache, o valor velho fica lá até o TTL. Mitigações: TTL curto, leases (Memcache do Facebook), versionar o valor.",
    initial: { preco: 100, "cache:preco": null },
    txs: [
      {
        name: "Leitor",
        steps: [cacheGet("preco", "c"), select("preco", "p"), cacheSet("preco", "p", (x) => x.c === null)],
      },
      { name: "Escritor", steps: [update("preco", "120", () => 120), cacheDelete("preco")] },
    ],
    invariant: (db) => {
      const cache = v(db, "cache:preco");
      const real = v(db, "preco");
      return cache === null || cache === real
        ? { ok: true, message: `Cache consistente (${cache ?? "vazio"}, banco ${real}).` }
        : { ok: false, message: `Cache com valor velho: ${cache}, mas o banco tem ${real}.` };
    },
  },
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
