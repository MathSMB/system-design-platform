import { describe, expect, it } from "vitest";
import { PRESETS, simulate, validateGraph, type Graph } from "./index";

/** Usuários que geram exatamente `rps` requisições por segundo (sem pico). */
function clientAt(rps: number, timeoutMs = 60_000) {
  return {
    id: "users",
    kind: "client" as const,
    params: {
      dailyActiveUsers: (rps * 86_400) / 20,
      requestsPerUserPerDay: 20,
      peakFactor: 1,
      pattern: "constant" as const,
      timeoutMs,
    },
  };
}

function mm1(lambda: number, serviceMs: number): Graph {
  return {
    nodes: [
      clientAt(lambda),
      {
        id: "s",
        kind: "server",
        params: { workers: 1, serviceTimeMs: serviceMs, distribution: "exponential", queueCapacity: 1e9, retries: 0 },
      },
    ],
    edges: [{ id: "e", source: "users", target: "s" }],
  };
}

describe("validação contra a teoria de filas", () => {
  it("M/M/1 com ρ = 0,5: latência média ≈ 1/(μ − λ)", () => {
    // λ = 50/s, μ = 100/s ⇒ W = 20 ms (+0,5 ms de rede)
    const r = simulate(mm1(50, 10), { durationSec: 600, seed: 1, warmupSec: 30 });
    expect(r.latency.meanMs).toBeGreaterThan(20.5 * 0.9);
    expect(r.latency.meanMs).toBeLessThan(20.5 * 1.1);
    const util = r.nodes.find((n) => n.nodeId === "s")!.utilization;
    expect(util).toBeGreaterThan(0.47);
    expect(util).toBeLessThan(0.53);
  });

  it("M/M/1 com ρ = 0,9: latência ≈ 10× o tempo de serviço", () => {
    // λ = 90/s, μ = 100/s ⇒ W = 100 ms
    const r = simulate(mm1(90, 10), { durationSec: 1500, seed: 7, warmupSec: 60 });
    expect(r.latency.meanMs).toBeGreaterThan(100 * 0.85);
    expect(r.latency.meanMs).toBeLessThan(100 * 1.15);
  });

  it("Lei de Little: em voo ≈ throughput × latência", () => {
    const r = simulate(mm1(80, 10), { durationSec: 600, seed: 3 });
    const throughput = r.succeeded / r.simulatedSec;
    const expected = throughput * (r.latency.meanMs / 1000);
    expect(r.avgInFlight).toBeGreaterThan(expected * 0.9);
    expect(r.avgInFlight).toBeLessThan(expected * 1.1);
  });
});

describe("comportamento", () => {
  it("é determinístico com a mesma seed", () => {
    const a = simulate(PRESETS.loadBalanced!.graph, { durationSec: 20, seed: 42 });
    const b = simulate(PRESETS.loadBalanced!.graph, { durationSec: 20, seed: 42 });
    expect(a).toEqual(b);
  });

  it("sobrecarga (λ > μ) gera erros e aponta o gargalo", () => {
    const g = mm1(150, 10);
    (g.nodes[1]!.params as { queueCapacity: number }).queueCapacity = 100;
    const r = simulate(g, { durationSec: 60, seed: 1 });
    expect(r.errorRate).toBeGreaterThan(0.2);
    expect(r.nodes[0]!.status).toBe("bad");
    expect(r.diagnosis.join(" ")).toContain("gargalo");
  });

  it("1M de usuários/dia num servidor só não é muito tráfego", () => {
    const r = simulate(PRESETS.singleServer!.graph, { durationSec: 60, seed: 1 });
    // 1M × 20 / 86.400 × 5 ≈ 1.157 req/s no pico
    expect(r.totalRequests / r.simulatedSec).toBeGreaterThan(1000);
    expect(r.errorRate).toBeLessThan(0.01);
  });

  it("derrubar o cache causa avalanche no banco", () => {
    const g = PRESETS.withCache!.graph;
    const ok = simulate(g, { durationSec: 30, seed: 1 });
    expect(ok.errorRate).toBeLessThan(0.01);
    const broken = simulate(g, { durationSec: 30, seed: 1, failures: [{ nodeId: "cache", atSec: 10 }] });
    expect(broken.errorRate).toBeGreaterThan(0.1);
    expect(broken.nodes.find((n) => n.nodeId === "db")!.status).toBe("bad");
    expect(broken.diagnosis.join(" ")).toContain("avalanche");
  });

  it("fila tira o serviço lento do caminho do usuário", () => {
    const r = simulate(PRESETS.asyncQueue!.graph, { durationSec: 30, seed: 1 });
    expect(r.latency.p99Ms).toBeLessThan(200); // o e-mail leva 300 ms, mas o usuário não espera
    expect(r.errorRate).toBe(0);
  });

  it("retries multiplicam a carga na dependência", () => {
    const g: Graph = {
      nodes: [
        clientAt(100),
        { id: "app", kind: "server", params: { workers: 50, serviceTimeMs: 1, queueCapacity: 1000, retries: 2 } },
        {
          id: "ext",
          kind: "external",
          params: { workers: 100, serviceTimeMs: 5, queueCapacity: 1000, errorRate: 0.5 },
        },
      ],
      edges: [
        { id: "e1", source: "users", target: "app" },
        { id: "e2", source: "app", target: "ext" },
      ],
    };
    const r = simulate(g, { durationSec: 120, seed: 5 });
    const app = r.nodes.find((n) => n.nodeId === "app")!.arrivals;
    const ext = r.nodes.find((n) => n.nodeId === "ext")!.arrivals;
    // 1 + 0,5 + 0,25 = 1,75 chamadas por requisição
    expect(ext / app).toBeGreaterThan(1.65);
    expect(ext / app).toBeLessThan(1.85);
    // falha final: 0,5³ = 12,5%
    expect(r.errorRate).toBeGreaterThan(0.1);
    expect(r.errorRate).toBeLessThan(0.15);
  });

  it("rejeita grafos com ciclo", () => {
    const g = mm1(10, 1);
    g.edges.push({ id: "loop", source: "s", target: "s" });
    expect(validateGraph(g).join(" ")).toContain("ciclo");
  });
});
