/** Tipos do grafo de arquitetura e da simulação macro (carga). */

export type NodeKind =
  | "client"
  | "loadBalancer"
  | "server"
  | "cache"
  | "cdn"
  | "database"
  | "queue"
  | "external";

export type ServiceDistribution = "exponential" | "lognormal" | "constant";

/** Parâmetros de um nó que processa requisições (tem workers e fila). */
export interface ProcessingParams {
  /** Requisições atendidas em paralelo (threads, conexões, instâncias × threads). */
  workers: number;
  /** Tempo médio de serviço de uma requisição, em ms. */
  serviceTimeMs: number;
  /** Distribuição do tempo de serviço. lognormal tem cauda mais realista. */
  distribution?: ServiceDistribution;
  /** Coeficiente de variação (desvio/média) para lognormal. Padrão 1. */
  cv?: number;
  /** Máximo de requisições esperando na fila. Acima disso, rejeita. */
  queueCapacity: number;
}

export interface ClientParams {
  dailyActiveUsers: number;
  requestsPerUserPerDay: number;
  /** Multiplicador sobre a média (ex. 3 = horário de pico com 3× a média). */
  peakFactor: number;
  /** constant: sempre no pico. ramp: sobe de 0 ao pico. spike: média, com pico no terço do meio. */
  pattern: "constant" | "ramp" | "spike";
  /** Tempo máximo que o usuário espera. Acima disso conta como timeout. */
  timeoutMs: number;
}

export interface LoadBalancerParams {
  algorithm: "roundRobin" | "leastOutstanding";
}

export interface ServerParams extends ProcessingParams {
  /** Tentativas extras quando uma dependência falha. */
  retries: number;
}

export interface CacheParams extends ProcessingParams {
  /** Fração das leituras servidas pelo cache (0 a 1). */
  hitRate: number;
}

export interface QueueParams {
  /** Mensagens máximas na fila. */
  capacity: number;
  /** Consumidores processando em paralelo. */
  consumers: number;
}

export interface ExternalParams extends ProcessingParams {
  /** Fração de chamadas que falham (0 a 1). */
  errorRate: number;
}

export type NodeParamsByKind = {
  client: ClientParams;
  loadBalancer: LoadBalancerParams;
  server: ServerParams;
  cache: CacheParams;
  cdn: CacheParams;
  database: ProcessingParams;
  queue: QueueParams;
  external: ExternalParams;
};

export type SimNode = {
  [K in NodeKind]: { id: string; kind: K; label?: string; params: NodeParamsByKind[K] };
}[NodeKind];

export interface SimEdge {
  id: string;
  source: string;
  target: string;
}

export interface Graph {
  nodes: SimNode[];
  edges: SimEdge[];
}

export interface FailureInjection {
  nodeId: string;
  /** Segundo em que o nó cai. */
  atSec: number;
  /** Segundo em que volta. Se omitido, fica fora até o fim. */
  untilSec?: number;
}

export interface SimConfig {
  durationSec: number;
  seed: number;
  /** Segundos iniciais ignorados nas estatísticas de latência. */
  warmupSec?: number;
  /** Latência de rede por chamada (ida e volta), em ms. Padrão 0,5 (mesmo datacenter). */
  networkLatencyMs?: number;
  failures?: FailureInjection[];
  /** Limite de requisições geradas, para não travar o navegador. Padrão 400.000. */
  maxRequests?: number;
}

export type NodeStatus = "ok" | "warn" | "bad" | "down";

export interface NodeMetrics {
  nodeId: string;
  kind: NodeKind;
  arrivals: number;
  rejected: number;
  /** Fração do tempo em que os workers estiveram ocupados (0 a 1). */
  utilization: number;
  maxQueue: number;
  /** Throughput médio processado, em req/s. */
  throughput: number;
  status: NodeStatus;
  hits?: number;
  misses?: number;
}

export interface TimelinePoint {
  t: number;
  offeredRps: number;
  okRps: number;
  errorRps: number;
  p50Ms: number;
  p99Ms: number;
}

export interface SimResult {
  durationSec: number;
  /** Duração efetivamente simulada (pode ser menor se maxRequests foi atingido). */
  simulatedSec: number;
  totalRequests: number;
  succeeded: number;
  errors: { timeout: number; rejected: number; unavailable: number; dependency: number };
  errorRate: number;
  latency: { meanMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number };
  /** Requisições simultâneas em voo, em média (para checar a Lei de Little). */
  avgInFlight: number;
  nodes: NodeMetrics[];
  timeline: TimelinePoint[];
  diagnosis: string[];
  warnings: string[];
}
