import type { NodeKind, NodeParamsByKind } from "@sdp/sim-engine";

export const DEFAULT_PARAMS: { [K in NodeKind]: NodeParamsByKind[K] } = {
  client: {
    dailyActiveUsers: 1_000_000,
    requestsPerUserPerDay: 20,
    peakFactor: 5,
    pattern: "constant",
    timeoutMs: 2000,
    writeRatio: 0.1,
    readAfterWriteMs: 100,
    botRps: 0,
  },
  loadBalancer: { algorithm: "leastOutstanding" },
  server: { workers: 32, serviceTimeMs: 20, queueCapacity: 500, retries: 0 },
  cache: { workers: 8, serviceTimeMs: 0.5, queueCapacity: 5000, hitRate: 0.9 },
  cdn: { workers: 64, serviceTimeMs: 2, queueCapacity: 10000, hitRate: 0.95 },
  database: { workers: 50, serviceTimeMs: 15, queueCapacity: 1000, readReplicas: 0, replicationDelayMs: 10, readYourWritesMs: 0 },
  queue: { capacity: 50_000, consumers: 4 },
  external: { workers: 10, serviceTimeMs: 300, queueCapacity: 100, errorRate: 0.01 },
  rateLimiter: { ratePerSec: 1000, burst: 200, scope: "perClient" },
};

type Params = Record<string, unknown>;
type Common = { key: string; label: string; help?: string; /** Só aparece quando a condição vale (ex.: campos do autoscaling). */ showIf?: (p: Params) => boolean };

export type Field =
  | (Common & { type: "number"; step?: number; min?: number; max?: number; /** Valor quando o parâmetro não existe (desenhos antigos). */ def?: number })
  | (Common & { type: "select"; options: { value: string; label: string }[] })
  | (Common & { type: "toggle" });

const autoscaling = (p: Params) => !!p.autoscale;

const processing: Field[] = [
  { key: "workers", label: "Workers em paralelo", type: "number", min: 1, help: "Threads, conexões ou instâncias × threads." },
  { key: "serviceTimeMs", label: "Tempo de serviço (ms)", type: "number", step: 0.1, min: 0.01, help: "Tempo médio de processamento de uma requisição." },
  { key: "queueCapacity", label: "Tamanho da fila", type: "number", min: 0, help: "Acima disso, rejeita." },
];

export const FIELDS: Record<NodeKind, Field[]> = {
  client: [
    { key: "dailyActiveUsers", label: "Usuários ativos por dia (DAU)", type: "number", min: 0 },
    { key: "requestsPerUserPerDay", label: "Requisições por usuário por dia", type: "number", min: 0 },
    { key: "peakFactor", label: "Fator de pico (× média)", type: "number", step: 0.5, min: 0.1 },
    {
      key: "pattern",
      label: "Padrão de tráfego",
      type: "select",
      options: [
        { value: "constant", label: "Constante no pico" },
        { value: "ramp", label: "Rampa até o pico" },
        { value: "spike", label: "Média com pico no meio" },
      ],
    },
    { key: "timeoutMs", label: "Timeout do usuário (ms)", type: "number", min: 1 },
    { key: "writeRatio", label: "Fração de escritas (0 a 1)", type: "number", step: 0.05, min: 0, max: 1, help: "O resto são leituras. Escritas passam direto pelo cache." },
    {
      key: "readAfterWriteMs",
      label: "Relê depois de escrever (ms)",
      type: "number",
      min: 0,
      help: "Ex.: postar e a página recarregar. Serve para ver se o usuário enxerga a própria escrita. 0 desliga.",
    },
    {
      key: "botRps",
      label: "Bot com defeito (req/s)",
      type: "number",
      min: 0,
      def: 0,
      help: "Um cliente só (bot, integração em loop) mandando este tanto de requisições, além dos usuários. 0 desliga.",
    },
  ],
  loadBalancer: [
    {
      key: "algorithm",
      label: "Algoritmo",
      type: "select",
      options: [
        { value: "roundRobin", label: "Round robin" },
        { value: "leastOutstanding", label: "Menos requisições em andamento" },
      ],
    },
  ],
  server: [
    ...processing,
    { key: "retries", label: "Retries em dependências", type: "number", min: 0, max: 5, help: "Com backoff exponencial e jitter." },
    {
      key: "callTimeoutMs",
      label: "Timeout das chamadas (ms)",
      type: "number",
      min: 0,
      def: 0,
      help: "Desiste da dependência depois deste tempo (conta como falha e pode ter retry). 0: espera para sempre.",
    },
    { key: "blocking", label: "Thread presa esperando dependências", type: "toggle", help: "Uma thread por requisição (Tomcat, Spring MVC): a thread fica ocupada enquanto espera o banco ou a API." },
    { key: "idempotencyKey", label: "Mandar chave de idempotência", type: "toggle", help: "Cada chamada leva um Idempotency-Key: a repetição não é processada de novo." },
    { key: "autoscale", label: "Autoscaling", type: "toggle", help: "Workers passa a ser por instância; o número de instâncias muda com a carga." },
    { key: "minInstances", label: "Instâncias mínimas", type: "number", min: 1, def: 1, showIf: autoscaling },
    { key: "maxInstances", label: "Instâncias máximas", type: "number", min: 1, def: 10, showIf: autoscaling },
    { key: "targetUtilization", label: "Utilização alvo (0 a 1)", type: "number", step: 0.05, min: 0.1, max: 0.95, def: 0.6, showIf: autoscaling },
    {
      key: "scaleDelaySec",
      label: "Atraso para subir instância (s)",
      type: "number",
      min: 0,
      def: 60,
      showIf: autoscaling,
      help: "VM nova ≈ 1–3 min; container numa máquina que já existe ≈ 5–30 s.",
    },
  ],
  cache: [{ key: "hitRate", label: "Hit rate (0 a 1)", type: "number", step: 0.01, min: 0, max: 1 }, ...processing],
  cdn: [{ key: "hitRate", label: "Hit rate (0 a 1)", type: "number", step: 0.01, min: 0, max: 1 }, ...processing],
  database: [
    ...processing,
    { key: "readReplicas", label: "Réplicas de leitura", type: "number", min: 0, max: 10, help: "Leituras vão para as réplicas; escritas, para o primário." },
    {
      key: "replicationDelayMs",
      label: "Atraso da replicação (ms)",
      type: "number",
      min: 0,
      help: "Rede até a réplica (mesma região ≈ 1–10 ms; outra região ≈ 50–200 ms). O lag ainda soma o tempo de aplicar a escrita.",
    },
    {
      key: "readYourWritesMs",
      label: "Ler do primário após escrever (ms)",
      type: "number",
      min: 0,
      help: "Read-your-writes: por este tempo após escrever, as leituras do usuário vão ao primário. 0 desliga.",
    },
    { key: "shards", label: "Shards", type: "number", min: 1, max: 16, def: 1, help: "Divide os dados entre N bancos iguais. 1: sem sharding." },
    {
      key: "shardKey",
      label: "Chave de sharding",
      type: "select",
      showIf: (p) => Number(p.shards ?? 1) > 1,
      options: [
        { value: "hash", label: "hash(user_id)" },
        { value: "range", label: "Intervalo por data de criação" },
      ],
    },
    {
      key: "hotKeyShare",
      label: "Tráfego numa chave só (0 a 1)",
      type: "number",
      step: 0.05,
      min: 0,
      max: 1,
      def: 0,
      showIf: (p) => Number(p.shards ?? 1) > 1,
      help: "Ex.: o perfil de uma celebridade. Essa chave sempre cai no mesmo shard.",
    },
  ],
  queue: [
    { key: "capacity", label: "Capacidade (mensagens)", type: "number", min: 1 },
    { key: "consumers", label: "Consumidores", type: "number", min: 1 },
  ],
  external: [...processing, { key: "errorRate", label: "Taxa de erro (0 a 1)", type: "number", step: 0.01, min: 0, max: 1 }],
  rateLimiter: [
    { key: "ratePerSec", label: "Requisições por segundo liberadas", type: "number", min: 0, help: "Reposição do balde (token bucket)." },
    { key: "burst", label: "Tamanho do balde (rajada)", type: "number", min: 1, help: "Quantas passam de uma vez quando o balde está cheio." },
    {
      key: "scope",
      label: "Limite",
      type: "select",
      options: [
        { value: "perClient", label: "Por cliente (chave de API, usuário)" },
        { value: "global", label: "Global (um balde para todos)" },
      ],
    },
  ],
};
