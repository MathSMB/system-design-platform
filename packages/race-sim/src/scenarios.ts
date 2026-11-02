import { readOwn, type DbState, type Scenario, type Step, type Verdict } from "./core";
import {
  atomicAdd,
  begin,
  cacheDelete,
  cacheGet,
  cacheSet,
  commit,
  emit,
  appendEvent,
  insertUnique,
  loadStream,
  redisGet,
  redisSet,
  redisSetNx,
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

const novo = (x: Record<string, number | null>) => x.p === 0;

function creditInvariant(db: DbState): Verdict {
  const saldo = v(db, "saldo") ?? 0;
  return saldo === 100
    ? { ok: true, message: "Correto: R$ 100 creditados uma vez." }
    : { ok: false, message: `Crédito em dobro: saldo R$ ${saldo} para um pagamento de R$ 100.` };
}

function pixInvariant(db: DbState): Verdict {
  const saldo = v(db, "conta") ?? 0;
  const pix = db.log.filter((l) => l.event.startsWith("PixEnviado")).length;
  if (saldo < 0) return { ok: false, message: `Saldo negativo: ${pix} Pix de R$ 600 saíram de uma conta com R$ 1.000 (saldo final R$ ${saldo}).` };
  return { ok: true, message: `Correto: ${pix} Pix enviado(s), saldo final R$ ${saldo}.` };
}

function seatInvariant(db: DbState): Verdict {
  const confirmadas = db.log.filter((l) => l.event === "reserva confirmada").length;
  return confirmadas <= 1
    ? { ok: true, message: `Correto: ${confirmadas} reserva confirmada para o assento 12.` }
    : { ok: false, message: `Assento 12 confirmado para ${confirmadas} pessoas.` };
}

/** Therac-25: dispara o feixe com a configuração que a tarefa enxerga agora. */
const fire: Step = {
  label: "disparar o feixe",
  exec: (ctx) => {
    const feixe = readOwn(ctx, "feixe").value;
    const prato = readOwn(ctx, "prato").value;
    const ok = (feixe === 100 && prato === 1) || (feixe === 1 && prato === 2);
    const kind = ok ? "dose correta" : feixe === 100 ? "overdose" : "subdose";
    ctx.db.log.push({ tx: ctx.tx, event: kind });
    return { kind: "ok", note: `feixe ${feixe === 100 ? "ALTA corrente" : "baixa corrente"}, prato na posição ${prato === 1 ? "raio X (com alvo)" : "elétron (sem alvo)"}: ${kind}` };
  },
};

function theracInvariant(db: DbState): Verdict {
  const e = db.log.find((l) => l.event !== "dose correta")?.event;
  if (e === "overdose") return { ok: false, message: "Overdose: feixe de alta corrente (configurado para raio X) com o prato na posição de elétron, sem o alvo." };
  if (e === "subdose") return { ok: false, message: "Dose errada: o feixe foi configurado para um modo e o prato está em outro." };
  return { ok: true, message: "Correto: o feixe disparou com a configuração física do modo escolhido." };
}

const MODO = { initial: { modo: 1, feixe: 0, prato: 1 } };

SCENARIOS.push(
  {
    id: "mensagem-duplicada",
    title: "Mensagem duplicada: crédito em dobro",
    description:
      "A fila entregou duas vezes a mensagem \"pagamento 42 aprovado\" (entrega at-least-once), e dois consumidores processam ao mesmo tempo. Cada um confere se o pagamento já foi processado, credita R$ 100 e marca como processado.",
    lesson:
      "Os dois conferem antes de alguém marcar, e os dois creditam. Conferir e depois marcar são dois passos; entre eles cabe o outro consumidor. A correção é tornar o \"já processei?\" atômico: uma chave de idempotência com UNIQUE, na mesma transação do crédito.",
    initial: { processado: 0, saldo: 0 },
    txs: ["Consumidor 1", "Consumidor 2"].map((name) => ({
      name,
      steps: [select("processado", "p"), atomicAdd("saldo", 100, null, "ok", novo), update("processado", "1", () => 1, novo)],
    })),
    invariant: creditInvariant,
  },
  {
    id: "mensagem-idempotente",
    title: "Correção: chave de idempotência (UNIQUE)",
    description:
      "Cada consumidor abre uma transação, insere o id da mensagem numa tabela com chave única e só credita se o INSERT funcionou. Tudo no mesmo COMMIT.",
    lesson:
      "O segundo INSERT espera o lock da chave e, quando passa, encontra a chave já gravada: não credita. Se o primeiro der rollback, a chave some junto e a mensagem pode ser processada de novo. É assim que se faz consumidor idempotente.",
    initial: { saldo: 0 },
    txs: ["Consumidor 1", "Consumidor 2"].map((name) => ({
      name,
      steps: [begin(), insertUnique("processadas", "msg-42", "novo"), atomicAdd("saldo", 100, null, "ok", (x) => x.novo === 1), commit()],
    })),
    invariant: creditInvariant,
  },
  {
    id: "reserva-assento",
    title: "Reserva de assento: GET e depois SET",
    description:
      "Dois fãs clicam no assento 12 ao mesmo tempo. O serviço consulta o Redis (GET); se estiver vazio, grava o dono (SET) e confirma a reserva. (1 = fã A, 2 = fã B.)",
    lesson:
      "Os dois fazem GET antes de alguém fazer SET, os dois veem vazio e os dois recebem \"reservado\". Cada comando do Redis é atômico, mas a sequência GET + SET não é.",
    initial: {},
    txs: [1, 2].map((n) => ({
      name: `Fã ${n === 1 ? "A" : "B"}`,
      steps: [redisGet("assento:12", "dono"), redisSet("assento:12", n, (x) => x.dono === null), emit("reserva confirmada", (x) => x.dono === null)],
    })),
    invariant: seatInvariant,
  },
  {
    id: "reserva-set-nx",
    title: "Correção: SET NX (um comando só)",
    description: "Cada fã tenta SET assento:12 <id> NX PX 420000: grava só se a chave não existir, com validade de 7 minutos.",
    lesson:
      "Conferir e gravar viram um comando só: o segundo recebe \"não gravou\". Na compra, a garantia final ainda fica no banco (UPDATE condicional ou UNIQUE), porque a chave pode expirar ou se perder num failover do Redis.",
    initial: {},
    txs: [1, 2].map((n) => ({
      name: `Fã ${n === 1 ? "A" : "B"}`,
      steps: [redisSetNx("assento:12", n, "ok"), emit("reserva confirmada", (x) => x.ok === 1)],
    })),
    invariant: seatInvariant,
  },
  {
    id: "pix-duplo",
    title: "Pix duplo no event sourcing",
    description:
      "A conta tem R$ 1.000 e é um stream de eventos. Dois Pix de R$ 600 chegam juntos. Cada um reidrata a conta, confere se há saldo e acrescenta o evento PixEnviado.",
    lesson:
      "Os dois leem R$ 1.000 antes de qualquer append, os dois acham que há saldo e os dois gravam: saldo negativo. Ler do event store (a fonte da verdade) não basta; o append precisa conferir que ninguém gravou no meio.",
    initial: { conta: 1000 },
    txs: ["Pix 1", "Pix 2"].map((name) => ({
      name,
      steps: [loadStream("conta", "s"), appendEvent("conta", "PixEnviado R$ 600", -600, null, (x) => (x.s ?? 0) >= 600)],
    })),
    invariant: pixInvariant,
  },
  {
    id: "pix-versao",
    title: "Correção: append com versão esperada",
    description: "O append leva a versão lida (expectedRevision). Se o stream mudou desde a leitura, o event store recusa e o Pix recomeça.",
    lesson:
      "Quem perde a corrida recomeça, reidrata R$ 400, vê que não há saldo e não envia. É o lock otimista aplicado ao event store (EventStoreDB/KurrentDB chamam de expected revision).",
    initial: { conta: 1000 },
    txs: ["Pix 1", "Pix 2"].map((name) => ({
      name,
      maxRestarts: 3,
      steps: [loadStream("conta", "s"), appendEvent("conta", "PixEnviado R$ 600", -600, "s_ver", (x) => (x.s ?? 0) >= 600)],
    })),
    invariant: pixInvariant,
  },
  {
    id: "therac-25",
    title: "Therac-25: a corrida que matou",
    description:
      "Máquina de radioterapia. O operador digitou raio X (modo 1) por engano e corrigiu para elétron (modo 2) em poucos segundos. Enquanto isso, a tarefa de configuração já tinha lido o modo antigo. (Simplificação do caso real.)",
    lesson:
      "A configuração leu \"raio X\" e ajustou o feixe para alta corrente; o operador trocou para elétron e o prato girou para a posição sem alvo; o disparo saiu com alta corrente direto no paciente. Entre 1985 e 1987 houve overdoses maciças em 6 pacientes, com pelo menos 3 mortes. O modelo anterior tinha travas de hardware; este confiava só no software.",
    ...MODO,
    txs: [
      { name: "Configuração", steps: [select("modo", "m"), update("feixe", "corrente do modo lido", (x) => (x.m === 1 ? 100 : 1)), fire] },
      { name: "Operador", steps: [update("modo", "2 (elétron)", () => 2), update("prato", "2 (elétron)", () => 2)] },
    ],
    invariant: theracInvariant,
  },
  {
    id: "therac-25-trava",
    title: "Correção: trava e edição atômica",
    description:
      "A configuração trava o modo (SELECT FOR UPDATE) até disparar; a edição do operador muda modo e prato numa transação só.",
    lesson:
      "Com a trava, a edição espera o disparo terminar (ou o disparo espera a edição inteira) e o feixe sempre bate com o prato. Na engenharia de verdade, a lição do Therac-25 vai além: travas de hardware independentes, checar de novo antes de agir e não reaproveitar software sem reanalisar (Leveson e Turner, 1993).",
    ...MODO,
    txs: [
      { name: "Configuração", steps: [begin(), selectForUpdate("modo", "m"), update("feixe", "corrente do modo lido", (x) => (x.m === 1 ? 100 : 1)), fire, commit()] },
      { name: "Operador", steps: [begin(), update("modo", "2 (elétron)", () => 2), update("prato", "2 (elétron)", () => 2), commit()] },
    ],
    invariant: theracInvariant,
  },
);

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}
