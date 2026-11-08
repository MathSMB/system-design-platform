import { EventQueue } from "./heap";
import { createRng, sampleExponential, sampleService } from "./rng";
import { diagnose, nodeStatus } from "./diagnosis";
import { percentile } from "./stats";
import { validateGraph } from "./validate";
import type {
  ClientParams,
  DatabaseParams,
  Graph,
  NodeMetrics,
  ProcessingParams,
  SimConfig,
  SimNode,
  ServerParams,
  SimResult,
  TimelinePoint,
} from "./types";

type ErrorCause = "rejected" | "unavailable" | "dependency" | "limited";
type Reply = (ok: boolean, cause?: ErrorCause) => void;

interface Req {
  id: number;
  start: number;
  write: boolean;
  /** Usuário que fez a requisição (só sorteado quando há escritas). */
  user: number;
  /** Escritas: instante do commit no primário. */
  commitAt?: number;
  /** Escritas: instante em que o usuário recebeu a confirmação. */
  ackAt?: number;
  /** Chave de roteamento (sharding): o usuário quando há escritas, senão a própria requisição. */
  key: number;
  /** Veio do bot (cliente com defeito)? */
  bot?: boolean;
  /** As chamadas levam chave de idempotência (o destino não processa a repetição de novo). */
  idem?: boolean;
}

/**
 * Custo de aplicar uma escrita na réplica, como fração do tempo de serviço da query
 * (aproximação: o replay aplica mudanças prontas, sem parse, plano ou locks).
 * A réplica aplica o WAL numa thread só (como o processo de replay do PostgreSQL),
 * então se o primário escreve mais rápido do que isso, o lag cresce sem limite.
 */
export const REPLAY_COST = 0.05;

/** Réplica de leitura: workers próprios para leituras e uma thread de replay em FIFO. */
class Replica {
  /** Commit mais recente já aplicado (as escritas chegam na ordem do commit). */
  appliedUpTo = -1;
  lags: number[] = [];
  private pending: number[] = [];
  private head = 0;
  private replaying = false;

  constructor(
    private sim: Simulation,
    readonly station: Station,
    private replayMs: number,
  ) {}

  /** Recebe uma escrita do primário (já descontado o atraso de rede). */
  receive(commitAt: number): void {
    this.pending.push(commitAt);
    this.replay();
  }

  /** Commit mais antigo ainda não aplicado, ou undefined. */
  oldestPending(): number | undefined {
    return this.head < this.pending.length ? this.pending[this.head] : undefined;
  }

  private replay(): void {
    if (this.replaying || this.head >= this.pending.length) return;
    this.replaying = true;
    this.sim.schedule(this.replayMs, () => {
      const commitAt = this.pending[this.head++]!;
      if (this.head > 1024 && this.head * 2 > this.pending.length) {
        this.pending = this.pending.slice(this.head);
        this.head = 0;
      }
      this.appliedUpTo = Math.max(this.appliedUpTo, commitAt);
      this.lags.push(this.sim.now - commitAt);
      this.replaying = false;
      this.replay();
    });
  }
}

/**
 * Simulação de eventos discretos (DES).
 *
 * Cada nó com capacidade é uma estação de fila: N workers, uma fila FIFO limitada
 * e um tempo de serviço aleatório. Requisições percorrem o grafo como chamadas
 * síncronas; a fila (queue) é o único ponto assíncrono. Tempo interno em ms.
 */
export function simulate(graph: Graph, config: SimConfig): SimResult {
  const problems = validateGraph(graph);
  if (problems.length > 0) {
    throw new Error(`Grafo inválido: ${problems.join(" ")}`);
  }
  return new Simulation(graph, config).run();
}

/** Ao terminar o próprio processamento. Com hold, recebe release() para soltar o worker depois. */
type OnServed = (release: () => void) => void;

class Station {
  busy = 0;
  busyTimeMs = 0;
  maxQueue = 0;
  served = 0;
  /** Workers agora (muda com autoscaling). */
  workers: number;
  private capArea = 0;
  private capSince = 0;
  /** Workers presos (hold) ainda não soltos: início de cada um, para somar no fim. */
  private holding = new Map<number, number>();
  private holdId = 0;
  private waiting: { onServed: OnServed; onReject: () => void; hold: boolean }[] = [];
  private head = 0;

  constructor(
    private sim: Simulation,
    private p: ProcessingParams,
    workers?: number,
  ) {
    this.workers = workers ?? p.workers;
  }

  get queueLength(): number {
    return this.waiting.length - this.head;
  }

  /**
   * Entra na estação. hold = true: o worker continua ocupado depois do processamento,
   * até alguém chamar release() (thread presa esperando dependências).
   */
  enter(onServed: OnServed, onReject: () => void, hold = false): void {
    if (this.busy < this.workers) {
      this.start(onServed, hold);
    } else if (this.queueLength < this.p.queueCapacity) {
      this.waiting.push({ onServed, onReject, hold });
      this.maxQueue = Math.max(this.maxQueue, this.queueLength);
    } else {
      onReject();
    }
  }

  /** Muda a quantidade de workers (autoscaling). Diminuir não interrompe quem já está sendo atendido. */
  setWorkers(n: number): void {
    this.capArea += this.workers * (this.sim.now - this.capSince);
    this.capSince = this.sim.now;
    this.workers = n;
    this.pump();
  }

  /** Workers × tempo disponíveis até o fim, em ms (denominador da utilização). */
  capacityMs(endMs: number): number {
    return this.capArea + this.workers * (endMs - this.capSince);
  }

  /** Tempo ocupado, somando quem ainda está preso no fim da simulação. */
  totalBusyMs(endMs: number): number {
    let open = 0;
    for (const t of this.holding.values()) open += Math.max(0, endMs - t);
    return this.busyTimeMs + open;
  }

  private pump(): void {
    while (this.queueLength > 0 && this.busy < this.workers) {
      const item = this.next()!;
      this.start(item.onServed, item.hold);
    }
  }

  /** Esvazia a fila rejeitando tudo (usado quando o nó cai). */
  flush(): void {
    while (this.queueLength > 0) this.next()!.onReject();
  }

  private next() {
    const item = this.waiting[this.head++];
    if (this.head > 1024 && this.head * 2 > this.waiting.length) {
      this.waiting = this.waiting.slice(this.head);
      this.head = 0;
    }
    return item;
  }

  private start(onServed: OnServed, hold: boolean): void {
    this.busy++;
    const s = sampleService(this.sim.rng, this.p.serviceTimeMs, this.p.distribution, this.p.cv ?? 1);
    if (!hold) {
      this.busyTimeMs += Math.max(0, Math.min(s, this.sim.endMs - this.sim.now));
      this.sim.schedule(s, () => {
        this.busy--;
        this.served++;
        onServed(noop);
        this.pump();
      });
      return;
    }
    const id = this.holdId++;
    const since = this.sim.now;
    this.holding.set(id, since);
    this.sim.schedule(s, () => {
      this.served++;
      let released = false;
      onServed(() => {
        if (released) return;
        released = true;
        this.holding.delete(id);
        this.busy--;
        this.busyTimeMs += Math.max(0, Math.min(this.sim.now, this.sim.endMs) - since);
        this.pump();
      });
    });
  }
}

const noop = () => {};

interface NodeRuntime {
  node: SimNode;
  down: boolean;
  arrivals: number;
  rejected: number;
  outstanding: number;
  station?: Station;
  hits: number;
  misses: number;
  /** Maior profundidade da fila (nó queue). */
  maxQueue: number;
  replicas?: Replica[];
  reads: number;
  staleReads: number;
  /** Banco com sharding: uma estação por shard. */
  shards?: Station[];
  /** Autoscaling: instâncias atuais, máximo atingido e o histórico de pedidos (para o diagnóstico). */
  scale?: { instances: number; max: number; per: number; firstAskAt?: number; firstAddAt?: number; hitMax: boolean };
  /** Chamadas a dependências que estouraram o timeout. */
  callTimeouts: number;
  /** Serviço externo: chamadas processadas, repetições processadas de novo e repetições reconhecidas pela chave. */
  processed: number;
  duplicates: number;
  deduped: number;
  limited: number;
  limitedBot: number;
  resume?: () => void;
  handle(req: Req, reply: Reply): void;
  onDown?(): void;
}

class Simulation {
  readonly rng: () => number;
  readonly endMs: number;
  now = 0;
  private events = new EventQueue();
  private runtimes = new Map<string, NodeRuntime>();
  private downstream = new Map<string, string[]>();
  private netMs: number;
  private warmupMs: number;
  private simulatedSec: number;
  private warnings: string[] = [];

  // métricas de ponta a ponta
  private nextId = 0;
  private inFlight = new Map<number, number>();
  private inFlightArea = 0;
  private lastChange = 0;
  private latencies: number[] = [];
  private errors = { timeout: 0, rejected: 0, unavailable: 0, dependency: 0, limited: 0 };
  private legit = { ok: 0, err: 0 };
  private botSent = 0;
  private hasBot = false;
  private succeeded = 0;
  private completedAfterWarmup = 0;
  /** Última escrita confirmada de cada usuário (para detectar leitura de dado velho). */
  private lastAckedWrite = new Map<number, Req>();
  private buckets: { offered: number; ok: number; err: number; lat: number[]; instances?: number }[] = [];

  constructor(
    private graph: Graph,
    private config: SimConfig,
  ) {
    this.rng = createRng(config.seed);
    this.netMs = config.networkLatencyMs ?? 0.5;
    this.warmupMs = (config.warmupSec ?? 0) * 1000;

    const maxReq = config.maxRequests ?? 400_000;
    const peakRps = graph.nodes
      .filter((n) => n.kind === "client")
      .reduce((s, n) => s + baseRps(n.params as ClientParams) * (n.params as ClientParams).peakFactor + ((n.params as ClientParams).botRps ?? 0), 0);
    this.simulatedSec = config.durationSec;
    if (peakRps * config.durationSec > maxReq) {
      this.simulatedSec = Math.max(1, Math.floor(maxReq / peakRps));
      this.warnings.push(
        `Carga alta (${Math.round(peakRps).toLocaleString("pt-BR")} req/s): simulando só ${this.simulatedSec}s para não travar o navegador.`,
      );
    }
    this.endMs = this.simulatedSec * 1000;
    for (let i = 0; i < this.simulatedSec; i++) this.buckets.push({ offered: 0, ok: 0, err: 0, lat: [] });

    for (const e of graph.edges) {
      const list = this.downstream.get(e.source) ?? [];
      list.push(e.target);
      this.downstream.set(e.source, list);
    }
    for (const n of graph.nodes) this.runtimes.set(n.id, this.buildRuntime(n));
  }

  schedule(delayMs: number, run: () => void): void {
    this.events.push(this.now + delayMs, run);
  }

  /** Chamada de rede de um nó para outro: metade da latência na ida, metade na volta. */
  private call(targetId: string, req: Req, reply: Reply): void {
    const half = this.netMs / 2;
    this.schedule(half, () => {
      const target = this.runtimes.get(targetId)!;
      target.arrivals++;
      target.outstanding++;
      if (target.down) {
        target.outstanding--;
        this.schedule(half, () => reply(false, "unavailable"));
        return;
      }
      target.handle(req, (ok, cause) => {
        target.outstanding--;
        this.schedule(half, () => reply(ok, cause));
      });
    });
  }

  private buildRuntime(node: SimNode): NodeRuntime {
    const rt: NodeRuntime = {
      node,
      down: false,
      arrivals: 0,
      rejected: 0,
      outstanding: 0,
      hits: 0,
      misses: 0,
      maxQueue: 0,
      reads: 0,
      staleReads: 0,
      callTimeouts: 0,
      processed: 0,
      duplicates: 0,
      deduped: 0,
      limited: 0,
      limitedBot: 0,
      handle: () => {},
    };
    const deps = () => this.downstream.get(node.id) ?? [];
    const reject = (reply: Reply) => () => {
      rt.rejected++;
      reply(false, "rejected");
    };

    switch (node.kind) {
      case "client":
        break;

      case "loadBalancer": {
        let rr = 0;
        rt.handle = (req, reply) => {
          const healthy = deps().filter((id) => !this.runtimes.get(id)!.down);
          if (healthy.length === 0) return reply(false, "unavailable");
          let pick: string;
          if (node.params.algorithm === "leastOutstanding") {
            pick = healthy.reduce((a, b) =>
              this.runtimes.get(b)!.outstanding < this.runtimes.get(a)!.outstanding ? b : a,
            );
          } else {
            pick = healthy[rr++ % healthy.length]!;
          }
          this.call(pick, req, reply);
        };
        break;
      }

      case "server": {
        const p = node.params;
        const scale = p.autoscale ? this.setupAutoscale(rt, p) : undefined;
        const st = new Station(this, p, scale ? p.workers * scale.instances : undefined);
        rt.station = st;
        const timeoutMs = p.callTimeoutMs ?? 0;
        // chamada a uma dependência, com timeout opcional (a resposta que chega depois é ignorada)
        const callDep = (depId: string, req: Req, cb: Reply) => {
          if (timeoutMs <= 0) return this.call(depId, req, cb);
          let settled = false;
          this.schedule(timeoutMs, () => {
            if (settled) return;
            settled = true;
            rt.callTimeouts++;
            cb(false, "dependency");
          });
          this.call(depId, req, (ok, cause) => {
            if (settled) return;
            settled = true;
            cb(ok, cause);
          });
        };
        rt.handle = (req, reply) => {
          if (p.idempotencyKey) req.idem = true;
          st.enter(
            (release) => {
              // modelo bloqueante: a thread só é solta quando a resposta sai
              const done: Reply = (ok, cause) => {
                release();
                reply(ok, cause);
              };
              // chama as dependências em sequência, na ordem das conexões
              const list = deps();
              const step = (i: number, attempt: number) => {
                if (i >= list.length) return done(true);
                const depId = list[i]!;
                callDep(depId, req, (ok, cause) => {
                  if (ok) return step(i + 1, 0);
                  // cache fora do ar: a aplicação cai direto na origem (é assim que nasce a avalanche)
                  const dep = this.runtimes.get(depId)!.node;
                  const origin = this.downstream.get(depId)?.[0];
                  if (cause === "unavailable" && (dep.kind === "cache" || dep.kind === "cdn") && origin) {
                    this.call(origin, req, (ok2) => (ok2 ? step(i + 1, 0) : done(false, "dependency")));
                    return;
                  }
                  if (attempt < p.retries) {
                    // backoff exponencial com full jitter: espera aleatória em [0, 10ms × 2^tentativa]
                    this.schedule(this.rng() * 10 * 2 ** attempt, () => step(i, attempt + 1));
                    return;
                  }
                  done(false, "dependency");
                });
              };
              step(0, 0);
            },
            reject(reply),
            !!p.blocking,
          );
        };
        if (scale) this.runAutoscale(rt, p, st);
        break;
      }

      case "database": {
        const p = node.params;
        const st = new Station(this, p);
        rt.station = st;
        const replicas = Array.from(
          { length: Math.max(0, Math.floor(p.readReplicas ?? 0)) },
          () => new Replica(this, new Station(this, p), p.serviceTimeMs * REPLAY_COST),
        );
        rt.replicas = replicas;
        const delay = p.replicationDelayMs ?? 0;
        const ryw = p.readYourWritesMs ?? 0;
        let rr = 0;

        // a leitura enxerga a última escrita confirmada do próprio usuário?
        const isStale = (req: Req, replica?: Replica): boolean => {
          const w = this.lastAckedWrite.get(req.user);
          // só vale escrita confirmada antes de a leitura começar
          if (!w || w.ackAt! > req.start) return false;
          if (w.commitAt === undefined) return true; // confirmada, mas ainda não gravada (ex.: está na fila)
          return replica ? w.commitAt > replica.appliedUpTo : false;
        };
        const read = (req: Req, reply: Reply, replica?: Replica) => {
          (replica?.station ?? st).enter(() => {
            rt.reads++;
            if (isStale(req, replica)) rt.staleReads++;
            reply(true);
          }, reject(reply));
        };

        const nShards = Math.max(1, Math.floor(p.shards ?? 1));
        if (nShards > 1) {
          this.setupShards(rt, p, nShards);
          break;
        }

        rt.handle = (req, reply) => {
          if (req.write) {
            st.enter(() => {
              req.commitAt = this.now;
              for (const r of replicas) this.schedule(delay, () => r.receive(req.commitAt!));
              reply(true);
            }, reject(reply));
            return;
          }
          if (replicas.length === 0) return read(req, reply);
          const w = this.lastAckedWrite.get(req.user);
          if (ryw > 0 && w && req.start - w.ackAt! < ryw) return read(req, reply); // lê do primário
          read(req, reply, replicas[rr++ % replicas.length]);
        };
        break;
      }

      case "external": {
        const st = new Station(this, node.params);
        rt.station = st;
        // requisições já processadas: uma repetição (retry depois de timeout) é processada de novo,
        // a não ser que venha com chave de idempotência (aí devolve o resultado guardado)
        const done = new Set<number>();
        rt.handle = (req, reply) =>
          st.enter(() => {
            if (this.rng() < node.params.errorRate) return reply(false, "dependency");
            if (done.has(req.id)) {
              if (req.idem) {
                rt.deduped++;
                return reply(true);
              }
              rt.duplicates++;
            } else done.add(req.id);
            rt.processed++;
            reply(true);
          }, reject(reply));
        break;
      }

      case "rateLimiter": {
        const p = node.params;
        // token bucket: o balde enche a ratePerSec até burst; cada requisição gasta um token
        const bucket = () => ({ tokens: p.burst, last: 0 });
        const global = bucket();
        const botBucket = bucket();
        const take = (b: { tokens: number; last: number }) => {
          b.tokens = Math.min(p.burst, b.tokens + ((this.now - b.last) * p.ratePerSec) / 1000);
          b.last = this.now;
          if (b.tokens < 1) return false;
          b.tokens -= 1;
          return true;
        };
        rt.handle = (req, reply) => {
          // por cliente: cada usuário legítimo manda poucas requisições por segundo e nunca esvazia
          // o próprio balde; só o bot (um cliente só, mandando muito) é barrado
          const ok = p.scope === "perClient" ? (req.bot ? take(botBucket) : true) : take(global);
          if (!ok) {
            rt.limited++;
            if (req.bot) rt.limitedBot++;
            return reply(false, "limited"); // HTTP 429, na hora
          }
          const target = deps()[0];
          if (!target) return reply(true);
          this.call(target, req, reply);
        };
        break;
      }

      case "cache":
      case "cdn": {
        const st = new Station(this, node.params);
        rt.station = st;
        rt.handle = (req, reply) =>
          st.enter(() => {
            // escrita não é servida pelo cache: segue para a origem (e invalida a chave)
            if (!req.write && this.rng() < node.params.hitRate) {
              rt.hits++;
              return reply(true);
            }
            rt.misses++;
            const origin = deps()[0];
            if (!origin) return reply(true);
            this.call(origin, req, (ok, cause) => reply(ok, ok ? undefined : "dependency"));
          }, reject(reply));
        break;
      }

      case "queue": {
        const p = node.params;
        let messages: Req[] = [];
        let head = 0;
        let active = 0;
        const dispatch = () => {
          const target = deps()[0];
          while (!rt.down && active < p.consumers && messages.length - head > 0) {
            const msg = messages[head++]!;
            if (head > 1024 && head * 2 > messages.length) {
              messages = messages.slice(head);
              head = 0;
            }
            if (!target) continue;
            active++;
            this.call(target, msg, () => {
              active--;
              dispatch();
            });
          }
        };
        rt.handle = (req, reply) => {
          if (messages.length - head >= p.capacity) {
            rt.rejected++;
            return reply(false, "rejected");
          }
          messages.push(req);
          rt.maxQueue = Math.max(rt.maxQueue, messages.length - head);
          reply(true); // confirma na hora: o trabalho segue em segundo plano
          dispatch();
        };
        rt.resume = dispatch;
        break;
      }
    }

    if (rt.station) {
      const st = rt.station;
      rt.onDown = () => {
        st.flush();
        for (const r of rt.replicas ?? []) r.station.flush();
        for (const sh of rt.shards ?? []) sh.flush();
      };
    }
    return rt;
  }

  /** Banco dividido em shards: cada shard é um banco com os mesmos workers; a chave decide para onde vai. */
  private setupShards(rt: NodeRuntime, p: DatabaseParams, n: number): void {
    const shards = Array.from({ length: n }, () => new Station(this, p));
    rt.shards = shards;
    const hot = Math.min(1, Math.max(0, p.hotKeyShare ?? 0));
    const key = p.shardKey ?? "hash";
    if ((p.readReplicas ?? 0) > 0) this.warnings.push("Com sharding, o simulador ignora as réplicas de leitura.");
    const pick = (req: Req): number => {
      // a chave quente (ex.: perfil de celebridade) sempre cai no mesmo shard
      if (hot > 0 && this.rng() < hot) return 0;
      if (key === "range") {
        // intervalo por data: tudo que é novo fica no último shard; leitura costuma ser do que é recente
        if (req.write || this.rng() < 0.7) return n - 1;
        return Math.floor(this.rng() * (n - 1));
      }
      return hashKey(req.key) % n;
    };
    rt.handle = (req, reply) => {
      shards[pick(req)]!.enter(() => {
        if (req.write) req.commitAt = this.now;
        else rt.reads++;
        reply(true);
      }, () => {
        rt.rejected++;
        reply(false, "rejected");
      });
    };
  }

  private setupAutoscale(rt: NodeRuntime, p: ServerParams) {
    const min = Math.max(1, Math.floor(p.minInstances ?? 1));
    rt.scale = { instances: min, max: min, per: p.workers, hitMax: false };
    return rt.scale;
  }

  /**
   * Autoscaling por utilização alvo (como o target tracking da AWS e o HPA do Kubernetes):
   * a cada 5 s mede a utilização e pede instâncias = atuais × utilização ÷ alvo.
   * As novas só atendem depois do atraso de provisionamento. Desce devagar, depois de 15 s com folga.
   */
  private runAutoscale(rt: NodeRuntime, p: ServerParams, st: Station): void {
    const sc = rt.scale!;
    const min = sc.instances;
    const max = Math.max(min, Math.floor(p.maxInstances ?? 10));
    const target = Math.min(0.95, Math.max(0.1, p.targetUtilization ?? 0.6));
    const delayMs = Math.max(0, p.scaleDelaySec ?? 60) * 1000;
    const windowMs = 5000;
    let pending = 0;
    let lastBusy = 0;
    let lastCap = 0;
    let calm = 0;
    const tick = () => {
      if (this.now >= this.endMs) return;
      const busy = st.totalBusyMs(this.now);
      const cap = st.capacityMs(this.now);
      const util = cap > lastCap ? Math.min(1, (busy - lastBusy) / (cap - lastCap)) : 0;
      lastBusy = busy;
      lastCap = cap;
      const desired = Math.min(max, Math.max(min, Math.ceil((sc.instances * util) / target)));
      if (desired > sc.instances + pending) {
        const add = desired - sc.instances - pending;
        pending += add;
        sc.firstAskAt ??= this.now;
        if (desired >= max) sc.hitMax = true;
        this.schedule(delayMs, () => {
          pending -= add;
          sc.instances += add;
          sc.max = Math.max(sc.max, sc.instances);
          sc.firstAddAt ??= this.now;
          st.setWorkers(sc.per * sc.instances);
        });
        calm = 0;
      } else if (desired < sc.instances && pending === 0 && util < target * 0.5) {
        if (++calm >= 3) {
          sc.instances = desired;
          st.setWorkers(sc.per * sc.instances);
          calm = 0;
        }
      } else calm = 0;
      this.schedule(windowMs, tick);
    };
    this.schedule(windowMs, tick);
  }

  private startClient(node: Extract<SimNode, { kind: "client" }>): void {
    const p = node.params;
    const target = (this.downstream.get(node.id) ?? [])[0];
    if (!target) return;
    const base = baseRps(p);
    const maxRps = base * p.peakFactor;
    if (maxRps <= 0) return;
    const third = this.endMs / 3;
    const writeRatio = p.writeRatio ?? 0;
    const users = Math.max(1, Math.floor(p.dailyActiveUsers));
    const rateAt = (t: number): number => {
      if (p.pattern === "ramp") return maxRps * (t / this.endMs);
      if (p.pattern === "spike") return t >= third && t < 2 * third ? maxRps : base;
      return maxRps;
    };
    // processo de Poisson não homogêneo por "thinning"
    const next = () => {
      this.schedule(sampleExponential(this.rng, 1000 / maxRps), () => {
        if (this.now >= this.endMs) return;
        if (this.rng() * maxRps < rateAt(this.now)) {
          // só sorteia escrita/usuário quando há escritas, para não mudar desenhos só de leitura
          if (writeRatio > 0) this.issue(target, p, this.rng() < writeRatio, Math.floor(this.rng() * users));
          else this.issue(target, p, false, 0);
        }
        next();
      });
    };
    next();
    // o bot: um cliente só, com defeito, mandando requisições num ritmo constante
    const botRps = p.botRps ?? 0;
    if (botRps > 0) {
      this.hasBot = true;
      const nextBot = () => {
        this.schedule(sampleExponential(this.rng, 1000 / botRps), () => {
          if (this.now >= this.endMs) return;
          this.issue(target, p, false, -1, true);
          nextBot();
        });
      };
      nextBot();
    }
  }

  private trackInFlight(): void {
    this.inFlightArea += this.inFlight.size * (this.now - this.lastChange);
    this.lastChange = this.now;
  }

  private bucket(t: number) {
    return this.buckets[Math.min(this.buckets.length - 1, Math.floor(t / 1000))]!;
  }

  private issue(target: string, p: ClientParams, write: boolean, user: number, bot = false): void {
    const id = this.nextId++;
    // sem escritas o usuário não é sorteado: cada requisição vira uma chave diferente
    const key = bot ? -1 : (p.writeRatio ?? 0) > 0 ? user : id;
    const req: Req = { id, start: this.now, write, user, key, bot };
    if (bot) this.botSent++;
    this.trackInFlight();
    this.inFlight.set(req.id, req.start);
    this.bucket(this.now).offered++;
    this.call(target, req, (ok, cause) => {
      if (!this.inFlight.has(req.id)) return;
      this.trackInFlight();
      this.inFlight.delete(req.id);
      const lat = this.now - req.start;
      const b = this.bucket(this.now);
      if (ok && lat <= p.timeoutMs) {
        this.succeeded++;
        if (!bot) this.legit.ok++;
        b.ok++;
        b.lat.push(lat);
        if (req.start >= this.warmupMs) {
          this.latencies.push(lat);
          this.completedAfterWarmup++;
        }
        if (req.write) {
          req.ackAt = this.now;
          this.lastAckedWrite.set(req.user, req);
          const after = p.readAfterWriteMs ?? 0;
          if (after > 0) {
            this.schedule(after, () => {
              if (this.now < this.endMs) this.issue(target, p, false, req.user);
            });
          }
        }
      } else {
        b.err++;
        if (!bot) this.legit.err++;
        this.errors[ok ? "timeout" : (cause ?? "dependency")]++;
      }
    });
    // o usuário desiste no timeout, mesmo que o sistema continue trabalhando
    this.schedule(p.timeoutMs, () => {
      if (!this.inFlight.has(req.id)) return;
      this.trackInFlight();
      this.inFlight.delete(req.id);
      this.errors.timeout++;
      if (!bot) this.legit.err++;
      this.bucket(this.now).err++;
    });
  }

  run(): SimResult {
    for (const n of this.graph.nodes) if (n.kind === "client") this.startClient(n);
    const scaled = [...this.runtimes.values()].filter((r) => r.scale);
    if (scaled.length > 0) {
      // instâncias de cada segundo, para o gráfico
      const sample = () => {
        if (this.now >= this.endMs) return;
        this.bucket(this.now).instances = scaled.reduce((a, r) => a + r.scale!.instances, 0);
        this.schedule(1000, sample);
      };
      sample();
    }
    for (const f of this.config.failures ?? []) {
      this.events.push(f.atSec * 1000, () => {
        const rt = this.runtimes.get(f.nodeId);
        if (!rt) return;
        rt.down = true;
        rt.onDown?.();
      });
      if (f.untilSec !== undefined) {
        this.events.push(f.untilSec * 1000, () => {
          const rt = this.runtimes.get(f.nodeId);
          if (!rt) return;
          rt.down = false;
          rt.resume?.();
        });
      }
    }

    for (let ev = this.events.pop(); ev && ev.t <= this.endMs; ev = this.events.pop()) {
      this.now = ev.t;
      ev.run();
    }
    this.now = this.endMs;
    this.trackInFlight();

    return this.collect();
  }

  private collect(): SimResult {
    const durSec = this.endMs / 1000;
    const lat = [...this.latencies].sort((a, b) => a - b);
    const total = this.succeeded + Object.values(this.errors).reduce((a, b) => a + b, 0);
    const errCount = total - this.succeeded;

    const nodes: NodeMetrics[] = this.graph.nodes
      .filter((n) => n.kind !== "client")
      .map((n) => {
        const rt = this.runtimes.get(n.id)!;
        let utilization = 0;
        let maxQueue = 0;
        let throughput = rt.arrivals / durSec;
        if (rt.shards) {
          const utils = rt.shards.map((sh) => sh.totalBusyMs(this.endMs) / sh.capacityMs(this.endMs));
          utilization = Math.max(...utils);
          maxQueue = Math.max(...rt.shards.map((sh) => sh.maxQueue));
          throughput = rt.shards.reduce((a, sh) => a + sh.served, 0) / durSec;
        } else if (rt.station && "workers" in n.params) {
          utilization = rt.station.totalBusyMs(this.endMs) / rt.station.capacityMs(this.endMs);
          maxQueue = rt.station.maxQueue;
          throughput = (rt.station.served + (rt.replicas ?? []).reduce((a, r) => a + r.station.served, 0)) / durSec;
        } else if (n.kind === "queue") {
          maxQueue = rt.maxQueue;
          utilization = n.params.capacity > 0 ? maxQueue / n.params.capacity : 0;
        }
        const m: NodeMetrics = {
          nodeId: n.id,
          kind: n.kind,
          arrivals: rt.arrivals,
          rejected: rt.rejected,
          utilization,
          maxQueue,
          throughput,
          status: "ok",
        };
        if (n.kind === "cache" || n.kind === "cdn") {
          m.hits = rt.hits;
          m.misses = rt.misses;
        }
        if (n.kind === "database") {
          m.reads = rt.reads;
          m.staleReads = rt.staleReads;
        }
        if (rt.shards) {
          m.shardUtilization = rt.shards.map((sh) => sh.totalBusyMs(this.endMs) / sh.capacityMs(this.endMs));
        }
        if (n.kind === "server") {
          if (rt.scale) m.instances = { end: rt.scale.instances, max: rt.scale.max };
          if (rt.callTimeouts > 0) m.callTimeouts = rt.callTimeouts;
          if (n.params.blocking && rt.station) {
            // quanto do tempo das threads foi processamento de verdade (o resto é espera)
            m.cpuUtilization = Math.min(1, (rt.station.served * n.params.serviceTimeMs) / rt.station.capacityMs(this.endMs));
          }
        }
        if (n.kind === "external") m.effects = { processed: rt.processed, duplicates: rt.duplicates };
        if (n.kind === "rateLimiter") m.limited = { total: rt.limited, bot: rt.limitedBot };
        if (rt.replicas?.length && n.kind === "database") {
          const workers = n.params.workers;
          m.replicaUtilization = Math.max(...rt.replicas.map((r) => r.station.busyTimeMs / (workers * this.endMs)));
          // escritas que ainda esperam replay no fim também contam como lag
          const lags = rt.replicas.flatMap((r) => {
            const oldest = r.oldestPending();
            return oldest === undefined ? r.lags : [...r.lags, this.endMs - oldest];
          });
          const sorted = lags.sort((a, b) => a - b);
          m.replicationLag = {
            avgMs: sorted.length ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0,
            p99Ms: percentile(sorted, 99),
            maxMs: sorted.length ? sorted[sorted.length - 1]! : 0,
          };
        }
        m.status = nodeStatus(m, this.isDownAtEnd(n.id));
        return m;
      });

    const timeline: TimelinePoint[] = this.buckets.map((b, i) => {
      const s = [...b.lat].sort((x, y) => x - y);
      return {
        t: i,
        offeredRps: b.offered,
        okRps: b.ok,
        errorRps: b.err,
        p50Ms: percentile(s, 50),
        p99Ms: percentile(s, 99),
        ...(b.instances !== undefined ? { instances: b.instances } : {}),
      };
    });

    // capacidade paga: workers × tempo de cada servidor (worker-horas)
    let coreMs = 0;
    for (const n of this.graph.nodes) {
      const rt = this.runtimes.get(n.id)!;
      if (n.kind === "server" && rt.station) coreMs += rt.station.capacityMs(this.endMs);
    }

    const result: SimResult = {
      durationSec: this.config.durationSec,
      simulatedSec: this.simulatedSec,
      totalRequests: total,
      succeeded: this.succeeded,
      errors: { ...this.errors },
      errorRate: total > 0 ? errCount / total : 0,
      latency: {
        meanMs: lat.length ? lat.reduce((a, b) => a + b, 0) / lat.length : 0,
        p50Ms: percentile(lat, 50),
        p95Ms: percentile(lat, 95),
        p99Ms: percentile(lat, 99),
        maxMs: lat.length ? lat[lat.length - 1]! : 0,
      },
      avgInFlight: this.inFlightArea / this.endMs,
      consistency: {
        dbReads: nodes.reduce((a, m) => a + (m.reads ?? 0), 0),
        staleReads: nodes.reduce((a, m) => a + (m.staleReads ?? 0), 0),
      },
      legit: {
        total: this.legit.ok + this.legit.err,
        succeeded: this.legit.ok,
        errorRate: this.legit.ok + this.legit.err > 0 ? this.legit.err / (this.legit.ok + this.legit.err) : 0,
      },
      ...(this.hasBot
        ? { bot: { sent: this.botSent, limited: nodes.reduce((a, m) => a + (m.limited?.bot ?? 0), 0) } }
        : {}),
      duplicateEffects: nodes.reduce((a, m) => a + (m.effects?.duplicates ?? 0), 0),
      workerHours: coreMs / 3_600_000,
      nodes,
      timeline,
      diagnosis: [],
      warnings: this.warnings,
    };
    result.diagnosis = diagnose(this.graph, result);
    return result;
  }

  private isDownAtEnd(id: string): boolean {
    return this.runtimes.get(id)?.down ?? false;
  }
}

/** Hash inteiro simples (Knuth): espalha chaves vizinhas entre os shards. */
function hashKey(k: number): number {
  return Math.imul(k | 0, 2654435761) >>> 0;
}

export function baseRps(p: ClientParams): number {
  return (p.dailyActiveUsers * p.requestsPerUserPerDay) / 86_400;
}
