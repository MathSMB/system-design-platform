import { describe, expect, it } from "vitest";
import { simulate, type Graph } from "./index";

/** Monta um grafo a partir de nós soltos e pares de arestas (os tipos são conferidos pelo simulador). */
function g(nodes: object[], edges: [string, string][]): Graph {
  return { nodes, edges: edges.map(([source, target], i) => ({ id: `e${i}`, source, target })) } as unknown as Graph;
}
/** Usuários gerando `rps` requisições por segundo, sem pico. */
const users = (rps: number, extra: object = {}) => ({
  id: "users",
  kind: "client",
  params: { dailyActiveUsers: (rps * 86_400) / 20, requestsPerUserPerDay: 20, peakFactor: 1, pattern: "constant", timeoutMs: 2000, ...extra },
});
const server = (id: string, extra: object = {}) => ({ id, kind: "server", params: { workers: 32, serviceTimeMs: 20, queueCapacity: 500, retries: 0, ...extra } });
const db = (extra: object = {}) => ({ id: "db", kind: "database", params: { workers: 50, serviceTimeMs: 15, queueCapacity: 1000, ...extra } });
const run = (graph: Graph, durationSec = 20) => simulate(graph, { durationSec, seed: 42, warmupSec: 2 });

describe("rate limiter (token bucket)", () => {
  const withLimiter = (params?: object) =>
    g(
      [users(700, { botRps: 3000 }), ...(params ? [{ id: "rl", kind: "rateLimiter", params }] : []), server("api"), db()],
      params ? [["users", "rl"], ["rl", "api"], ["api", "db"]] : [["users", "api"], ["api", "db"]],
    );

  it("sem limite, o bot derruba a API para todo mundo", () => {
    const r = run(withLimiter());
    expect(r.nodes.find((n) => n.nodeId === "api")!.status).toBe("bad");
    expect(r.legit.errorRate).toBeGreaterThan(0.3);
    expect(r.bot!.sent).toBeGreaterThan(3000 * 20 * 0.95);
  });

  it("libera ratePerSec por segundo: o resto volta como 429", () => {
    const r = run(withLimiter({ ratePerSec: 1000, burst: 100, scope: "global" }));
    const passed = r.totalRequests - r.errors.limited;
    // 20 s × 1.000/s + o balde inicial
    expect(passed / r.simulatedSec).toBeGreaterThan(1000 * 0.97);
    expect(passed / r.simulatedSec).toBeLessThan(1000 * 1.03);
    expect(r.nodes.find((n) => n.nodeId === "api")!.status).not.toBe("bad");
    // global: o legítimo divide o balde com o bot e também leva 429
    expect(r.legit.errorRate).toBeGreaterThan(0.5);
    expect(r.diagnosis.some((d) => d.includes("por cliente"))).toBe(true);
  });

  it("por cliente: só o bot é barrado", () => {
    const r = run(withLimiter({ ratePerSec: 10, burst: 20, scope: "perClient" }));
    expect(r.legit.errorRate).toBeLessThan(0.01);
    expect(r.bot!.limited).toBeGreaterThan(r.bot!.sent * 0.99);
    expect(r.errors.limited).toBe(r.bot!.limited);
  });

  it("o balde aceita uma rajada do tamanho de burst", () => {
    // 1 req/s de reposição, balde de 50: em 1 s com 500 req/s passam ~51
    const r = simulate(g([users(500), { id: "rl", kind: "rateLimiter", params: { ratePerSec: 1, burst: 50, scope: "global" } }, server("api")], [["users", "rl"], ["rl", "api"]]), {
      durationSec: 1,
      seed: 1,
    });
    expect(r.totalRequests - r.errors.limited).toBeGreaterThanOrEqual(50);
    expect(r.totalRequests - r.errors.limited).toBeLessThanOrEqual(52);
  });

  it("rate limiter sem saída é desenho inválido", () => {
    expect(() => run(g([users(10), { id: "rl", kind: "rateLimiter", params: { ratePerSec: 1, burst: 1, scope: "global" } }], [["users", "rl"]]))).toThrow(/rate limiter/);
  });
});

describe("thread presa (pool bloqueante) e timeout de chamada", () => {
  const checkout = (af: object, ck: object = {}) =>
    g(
      [
        users(500, { timeoutMs: 3000 }),
        server("ck", { workers: 200, serviceTimeMs: 10, queueCapacity: 100, blocking: true, ...ck }),
        { id: "af", kind: "external", params: { workers: 2000, serviceTimeMs: 80, queueCapacity: 100, errorRate: 0, ...af } },
      ],
      [["users", "ck"], ["ck", "af"]],
    );

  it("Lei de Little: threads ocupadas ≈ vazão × tempo total, mesmo com CPU quase parada", () => {
    // 500/s × (10 ms + 80 ms + rede) ≈ 45 das 200 threads
    const r = run(checkout({ distribution: "constant" }, {}), 30);
    const ck = r.nodes.find((n) => n.nodeId === "ck")!;
    expect(ck.utilization).toBeGreaterThan(0.2);
    expect(ck.utilization).toBeLessThan(0.25);
    // CPU: 500/s × 10 ms = 5 threads ⇒ 2,5%
    expect(ck.cpuUtilization!).toBeGreaterThan(0.02);
    expect(ck.cpuUtilization!).toBeLessThan(0.03);
  });

  it("no modelo assíncrono a mesma espera não ocupa thread", () => {
    const r = run(checkout({ distribution: "constant" }, { blocking: false }), 30);
    expect(r.nodes.find((n) => n.nodeId === "ck")!.utilization).toBeLessThan(0.03);
  });

  it("dependência lenta esgota as threads e derruba o checkout", () => {
    const r = run(checkout({ serviceTimeMs: 1000 }));
    const ck = r.nodes.find((n) => n.nodeId === "ck")!;
    expect(ck.status).toBe("bad");
    expect(ck.cpuUtilization!).toBeLessThan(0.05);
    expect(r.errorRate).toBeGreaterThan(0.3);
    expect(r.diagnosis.some((d) => d.includes("thread presa"))).toBe(true);
  });

  it("timeout de chamada solta a thread: falha rápido em vez de travar", () => {
    const r = run(checkout({ serviceTimeMs: 1000, distribution: "constant" }, { callTimeoutMs: 300 }));
    const ck = r.nodes.find((n) => n.nodeId === "ck")!;
    // 500/s × ~0,31 s ≈ 155 threads
    expect(ck.utilization).toBeLessThan(0.85);
    expect(ck.callTimeouts).toBeGreaterThan(0);
    expect(r.latency.p99Ms).toBeLessThan(400);
  });
});

describe("autoscaling", () => {
  // média de 400/s com pico de 2.000/s no terço do meio (60–120 s); cada instância aguenta 400/s
  const spiky = (sv: object) =>
    g(
      [
        { id: "users", kind: "client", params: { dailyActiveUsers: 1_728_000, requestsPerUserPerDay: 20, peakFactor: 5, pattern: "spike", timeoutMs: 2000 } },
        server("api", { workers: 8, serviceTimeMs: 20, queueCapacity: 200, ...sv }),
      ],
      [["users", "api"]],
    );
  const auto = { autoscale: true, minInstances: 2, maxInstances: 10, targetUtilization: 0.6 };

  it("instâncias só chegam depois do atraso de provisionamento", () => {
    const r = run(spiky({ ...auto, scaleDelaySec: 20 }), 180);
    const at = (t: number) => r.timeline[t]!.instances!;
    expect(at(30)).toBe(2);
    // pico começa em 60 s, pede em ~65 s, chega em ~85 s
    expect(at(80)).toBe(2);
    expect(at(110)).toBeGreaterThan(2);
    expect(r.nodes[0]!.instances!.max).toBeGreaterThan(2);
  });

  it("com atraso de 60 s, o autoscaling chega depois do pico", () => {
    const r = run(spiky({ ...auto, scaleDelaySec: 60 }), 180);
    expect(r.errorRate).toBeGreaterThan(0.3);
    expect(r.timeline[100]!.instances).toBe(2);
    expect(r.diagnosis.some((d) => d.includes("autoscaling"))).toBe(true);
  });

  it("atraso menor salva parte do pico; mínimo maior salva tudo", () => {
    const slow = run(spiky({ ...auto, scaleDelaySec: 60 }), 180);
    const fast = run(spiky({ ...auto, scaleDelaySec: 5 }), 180);
    const warm = run(spiky({ ...auto, minInstances: 7, scaleDelaySec: 60 }), 180);
    expect(fast.errorRate).toBeLessThan(slow.errorRate / 3);
    expect(warm.errorRate).toBeLessThan(0.005);
    // mínimo maior custa mais
    expect(warm.workerHours).toBeGreaterThan(slow.workerHours * 2);
  });

  it("custo: workers × tempo, contando as instâncias de cada momento", () => {
    const fixed = run(spiky({ workers: 16 }), 60);
    // 16 workers × 60 s = 960 worker-segundos
    expect(fixed.workerHours).toBeCloseTo(960 / 3600, 5);
  });
});

describe("sharding", () => {
  // ~4.630 req/s com 60% de escrita: um banco só (3.333/s) não aguenta
  const orders = (d: object) =>
    g(
      [
        { id: "users", kind: "client", params: { dailyActiveUsers: 4_000_000, requestsPerUserPerDay: 50, peakFactor: 2, pattern: "constant", timeoutMs: 2000, writeRatio: 0.6 } },
        server("api", { workers: 400, serviceTimeMs: 10 }),
        db(d),
      ],
      [["users", "api"], ["api", "db"]],
    );

  it("hash da chave espalha por igual entre os shards", () => {
    const r = run(orders({ shards: 4, shardKey: "hash" }), 10);
    const u = r.nodes.find((n) => n.nodeId === "db")!.shardUtilization!;
    expect(u).toHaveLength(4);
    for (const x of u) expect(Math.abs(x - 0.35)).toBeLessThan(0.04);
    expect(r.errorRate).toBe(0);
  });

  it("chave por data cria shard quente no último intervalo", () => {
    const r = run(orders({ shards: 4, shardKey: "range" }), 10);
    const m = r.nodes.find((n) => n.nodeId === "db")!;
    expect(m.shardUtilization![3]).toBeGreaterThan(0.95);
    expect(m.shardUtilization![0]).toBeLessThan(0.15);
    expect(m.status).toBe("bad");
    expect(r.diagnosis.some((d) => d.includes("mais quente"))).toBe(true);
  });

  it("chave quente (celebridade) esquenta um shard mesmo com hash", () => {
    const r = run(orders({ shards: 4, shardKey: "hash", hotKeyShare: 0.5 }), 10);
    const u = r.nodes.find((n) => n.nodeId === "db")!.shardUtilization!;
    // shard 0: 50% + 50%/4 = 62,5% do tráfego
    expect(u[0]).toBeGreaterThan(0.8);
    expect(u[1]).toBeLessThan(0.25);
  });

  it("réplica de leitura não divide escrita", () => {
    const r = run(orders({ readReplicas: 2 }), 10);
    expect(r.nodes.find((n) => n.nodeId === "db")!.utilization).toBeGreaterThan(0.8);
  });
});

describe("pagamentos: retry sem cobrar duas vezes", () => {
  // o gateway às vezes demora mais que o timeout de 1 s do servidor
  const payments = (sv: object) =>
    g(
      [
        users(200, { timeoutMs: 5000, writeRatio: 1 }),
        server("pay", { workers: 64, serviceTimeMs: 10, callTimeoutMs: 1000, ...sv }),
        { id: "gw", kind: "external", params: { workers: 500, serviceTimeMs: 300, queueCapacity: 100, errorRate: 0, distribution: "lognormal", cv: 1.5 } },
      ],
      [["users", "pay"], ["pay", "gw"]],
    );

  it("sem retry: quem estoura o timeout vira erro, mas ninguém é cobrado duas vezes", () => {
    const r = run(payments({}), 30);
    expect(r.errors.dependency).toBeGreaterThan(0);
    expect(r.duplicateEffects).toBe(0);
  });

  it("retry depois de timeout cobra em dobro", () => {
    const r = run(payments({ retries: 2 }), 30);
    expect(r.duplicateEffects).toBeGreaterThan(0);
    const gw = r.nodes.find((n) => n.nodeId === "gw")!;
    expect(gw.effects!.duplicates).toBe(r.duplicateEffects);
    expect(r.diagnosis.some((d) => d.includes("chave de idempotência"))).toBe(true);
  });

  it("com chave de idempotência, o retry não cobra de novo", () => {
    const r = run(payments({ retries: 2, idempotencyKey: true }), 30);
    expect(r.duplicateEffects).toBe(0);
    expect(r.errorRate).toBeLessThan(0.01);
  });

  it("retry por erro do provedor (antes de processar) não duplica", () => {
    const r = run(
      g([users(200), server("pay", { retries: 2 }), { id: "gw", kind: "external", params: { workers: 50, serviceTimeMs: 20, queueCapacity: 100, errorRate: 0.1 } }], [["users", "pay"], ["pay", "gw"]]),
    );
    expect(r.duplicateEffects).toBe(0);
  });
});
