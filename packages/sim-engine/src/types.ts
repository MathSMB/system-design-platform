/** Tipos do grafo de arquitetura e da simulação macro (carga). */

export type NodeKind =
  | "client"
  | "loadBalancer"
  | "server"
  | "cache"
  | "cdn"
  | "database"
  | "queue"
  | "external"
  | "rateLimiter";

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
  /** Fração das requisições que são escritas (0 a 1). Padrão 0: tudo leitura. */
  writeRatio?: number;
  /**
   * Depois de uma escrita confirmada, o mesmo usuário lê de novo após este tempo, em ms
   * (ex.: postar um comentário e a página recarregar). 0 ou ausente: não lê de volta.
   */
  readAfterWriteMs?: number;
  /**
   * Tráfego extra de UM cliente com defeito (bot, integração em loop), em req/s, constante.
   * Soma-se ao tráfego dos usuários legítimos. 0 ou ausente: não há bot.
   */
  botRps?: number;
}

export interface LoadBalancerParams {
  algorithm: "roundRobin" | "leastOutstanding";
}

export interface ServerParams extends ProcessingParams {
  /** Tentativas extras quando uma dependência falha. */
  retries: number;
  /**
   * Thread presa (modelo bloqueante, uma thread por requisição): o worker fica ocupado
   * enquanto espera as dependências, não só durante o próprio processamento.
   * Ausente/false: o worker é liberado e a espera não ocupa thread (modelo assíncrono).
   */
  blocking?: boolean;
  /** Timeout de cada chamada a uma dependência, em ms. Estourou: conta como falha (e pode ter retry). 0 ou ausente: espera para sempre. */
  callTimeoutMs?: number;
  /** Envia chave de idempotência nas chamadas: o destino reconhece a repetição e não processa de novo. */
  idempotencyKey?: boolean;
  /** Autoscaling: workers passa a ser por instância e o número de instâncias muda com a carga. */
  autoscale?: boolean;
  /** Autoscaling: instâncias mínimas (e iniciais). Padrão 1. */
  minInstances?: number;
  /** Autoscaling: instâncias máximas. Padrão 10. */
  maxInstances?: number;
  /** Autoscaling: utilização alvo (0 a 1). Acima dela, pede mais instâncias. Padrão 0,6. */
  targetUtilization?: number;
  /** Autoscaling: segundos entre pedir uma instância e ela começar a atender (subir VM, imagem, aquecer). Padrão 60. */
  scaleDelaySec?: number;
}

export interface RateLimiterParams {
  /** Requisições por segundo liberadas (reposição do token bucket). */
  ratePerSec: number;
  /** Tamanho do balde: rajada máxima aceita de uma vez. */
  burst: number;
  /** global: um balde para todo mundo. perClient: um balde por cliente (o bot não gasta o balde dos outros). */
  scope: "global" | "perClient";
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

export interface DatabaseParams extends ProcessingParams {
  /** Réplicas de leitura, cada uma com os mesmos workers do primário. Padrão 0. */
  readReplicas?: number;
  /** Atraso de rede da replicação (envio do WAL), em ms. O lag real soma o tempo de aplicar a escrita. */
  replicationDelayMs?: number;
  /**
   * Read-your-writes: por quanto tempo depois de escrever o usuário lê do primário, em ms.
   * 0 ou ausente: toda leitura vai para as réplicas.
   */
  readYourWritesMs?: number;
  /** Sharding: quantos bancos dividem os dados (cada um com os workers acima). 1 ou ausente: sem sharding. */
  shards?: number;
  /**
   * Sharding: chave de particionamento.
   * hash: hash(user_id) mod N, espalha por igual.
   * range: intervalos por data de criação; tudo que é novo (todas as escritas e a maior parte das leituras) cai no último shard.
   */
  shardKey?: "hash" | "range";
  /** Sharding: fração do tráfego numa chave só (ex.: perfil de celebridade), que sempre cai no mesmo shard (0 a 1). */
  hotKeyShare?: number;
}

export type NodeParamsByKind = {
  client: ClientParams;
  loadBalancer: LoadBalancerParams;
  server: ServerParams;
  cache: CacheParams;
  cdn: CacheParams;
  database: DatabaseParams;
  queue: QueueParams;
  external: ExternalParams;
  rateLimiter: RateLimiterParams;
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
  /** Banco com réplicas: utilização da réplica mais carregada (0 a 1). */
  replicaUtilization?: number;
  /** Banco com réplicas: atraso entre o commit no primário e a escrita aparecer na réplica. */
  replicationLag?: { avgMs: number; p99Ms: number; maxMs: number };
  /** Leituras que chegaram a este banco e devolveram dado sem a última escrita do próprio usuário. */
  staleReads?: number;
  /** Leituras que chegaram a este banco. */
  reads?: number;
  /** Banco com sharding: utilização de cada shard (0 a 1). A utilização do nó é a do shard mais carregado. */
  shardUtilization?: number[];
  /** Servidor com thread presa: fração do tempo das threads gasta processando (o resto é espera por dependências). */
  cpuUtilization?: number;
  /** Servidor: chamadas a dependências que estouraram o timeout. */
  callTimeouts?: number;
  /** Autoscaling: instâncias no fim e o máximo atingido. */
  instances?: { end: number; max: number };
  /** Serviço externo: chamadas processadas e quantas foram repetições processadas de novo (ex.: cobrança em dobro). */
  effects?: { processed: number; duplicates: number };
  /** Rate limiter: requisições barradas (HTTP 429) e quantas delas eram do bot. */
  limited?: { total: number; bot: number };
}

export interface TimelinePoint {
  t: number;
  offeredRps: number;
  okRps: number;
  errorRps: number;
  p50Ms: number;
  p99Ms: number;
  /** Soma das instâncias dos servidores com autoscaling naquele segundo (só quando há autoscaling). */
  instances?: number;
}

export interface SimResult {
  durationSec: number;
  /** Duração efetivamente simulada (pode ser menor se maxRequests foi atingido). */
  simulatedSec: number;
  totalRequests: number;
  succeeded: number;
  errors: { timeout: number; rejected: number; unavailable: number; dependency: number; limited: number };
  errorRate: number;
  latency: { meanMs: number; p50Ms: number; p95Ms: number; p99Ms: number; maxMs: number };
  /** Requisições simultâneas em voo, em média (para checar a Lei de Little). */
  avgInFlight: number;
  /** Consistência das leituras nos bancos: quantas viram dado velho (não incluíam a escrita do próprio usuário). */
  consistency: { dbReads: number; staleReads: number };
  /** Só os usuários legítimos (sem o bot): é o que importa para o SLO quando há bot. */
  legit: { total: number; succeeded: number; errorRate: number };
  /** Bot (cliente com defeito): quanto mandou e quanto foi barrado pelo rate limiter. */
  bot?: { sent: number; limited: number };
  /** Chamadas processadas em dobro nos serviços externos (ex.: cobrança dupla por retry sem idempotência). */
  duplicateEffects: number;
  /** Capacidade paga nos servidores: workers × segundos, em worker-horas (com autoscaling, conta as instâncias de cada momento). */
  workerHours: number;
  nodes: NodeMetrics[];
  timeline: TimelinePoint[];
  diagnosis: string[];
  warnings: string[];
}
