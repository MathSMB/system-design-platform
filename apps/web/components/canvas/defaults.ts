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
  },
  loadBalancer: { algorithm: "leastOutstanding" },
  server: { workers: 32, serviceTimeMs: 20, queueCapacity: 500, retries: 0 },
  cache: { workers: 8, serviceTimeMs: 0.5, queueCapacity: 5000, hitRate: 0.9 },
  cdn: { workers: 64, serviceTimeMs: 2, queueCapacity: 10000, hitRate: 0.95 },
  database: { workers: 50, serviceTimeMs: 15, queueCapacity: 1000, readReplicas: 0, replicationDelayMs: 10, readYourWritesMs: 0 },
  queue: { capacity: 50_000, consumers: 4 },
  external: { workers: 10, serviceTimeMs: 300, queueCapacity: 100, errorRate: 0.01 },
};

export const KIND_ICON: Record<NodeKind, string> = {
  client: "👥",
  loadBalancer: "⚖️",
  server: "🖥️",
  cache: "⚡",
  cdn: "🌍",
  database: "🗄️",
  queue: "📬",
  external: "🔌",
};

export type Field =
  | { key: string; label: string; help?: string; type: "number"; step?: number; min?: number; max?: number }
  | { key: string; label: string; help?: string; type: "select"; options: { value: string; label: string }[] };

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
  server: [...processing, { key: "retries", label: "Retries em dependências", type: "number", min: 0, max: 5, help: "Com backoff exponencial e jitter." }],
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
  ],
  queue: [
    { key: "capacity", label: "Capacidade (mensagens)", type: "number", min: 1 },
    { key: "consumers", label: "Consumidores", type: "number", min: 1 },
  ],
  external: [...processing, { key: "errorRate", label: "Taxa de erro (0 a 1)", type: "number", step: 0.01, min: 0, max: 1 }],
};
