import { baseRps, type ClientParams, type Graph } from "@sdp/sim-engine";
import { useCanvas } from "@/components/canvas/store";
import type { Challenge } from "@/lib/training/types";
import { readBoard } from "./useBoard";

const fmt = (x: number, d = 0) => x.toLocaleString("pt-BR", { maximumFractionDigits: d });

/** Desenho inicial da entrevista: só os usuários do enunciado (e o que ele exigir). */
export function challengeGraph(c: Challenge): Graph {
  return {
    nodes: [
      { id: "users", kind: "client", label: "Usuários", params: { ...c.load, pattern: "constant", timeoutMs: 2000, readAfterWriteMs: 0 } },
      ...(c.mustHave ?? []).map((m, k) => ({ id: `req-${k}`, kind: m.kind, label: m.label, params: { ...m.params } })),
    ],
    edges: [],
  } as unknown as Graph;
}

/** Monta o desenho inicial do desafio e trava o que o enunciado exige. */
export function startChallenge(c: Challenge) {
  const g = challengeGraph(c);
  const s = useCanvas.getState();
  s.loadGraph(g);
  s.setLocked(g.nodes.map((n) => n.id));
}

export function peakOf(c: Challenge) {
  return baseRps({ ...c.load, pattern: "constant", timeoutMs: 0 } as ClientParams) * c.load.peakFactor;
}

export interface Verdict {
  items: { label: string; ok: boolean; detail: string }[];
  stars: number;
  passed: boolean;
}

export function judge(c: Challenge): Verdict | string {
  const b = readBoard(null);
  if (!b.result) return "Rode a simulação (▶ Simular) no desenho atual antes de entregar.";
  const client = b.nodes.find((n) => n.data.kind === "client");
  if (!client) return "Cadê os Usuários? Eles definem a carga do desafio.";
  const p = client.data.params as unknown as ClientParams;
  const rps = baseRps(p) * p.peakFactor;
  const target = peakOf(c);
  if (rps < target * 0.95) return `Os Usuários foram alterados: estão gerando ${fmt(rps)} req/s no pico, e o enunciado pede ${fmt(target)}.`;
  for (const m of c.mustHave ?? []) {
    const n = b.nodes.find((x) => x.data.kind === m.kind && x.data.label === m.label);
    if (!n) return `O enunciado exige o componente "${m.label}".`;
    if (JSON.stringify(n.data.params) !== JSON.stringify(m.params)) return `Os parâmetros do "${m.label}" são fixos no enunciado. Volte aos valores originais.`;
  }
  const r = b.result;
  const err = r.errorRate <= c.slo.errorRate;
  const lat = r.latency.p99Ms <= c.slo.p99Ms;
  const hot = r.nodes.filter((n) => n.status !== "ok" && n.kind !== "client");
  const room = hot.length === 0;
  return {
    items: [
      { label: "Erros", ok: err, detail: `${fmt(r.errorRate * 100, 2)}% (meta ≤ ${fmt(c.slo.errorRate * 100, 1)}%)` },
      { label: "Latência p99", ok: lat, detail: `${fmt(r.latency.p99Ms)} ms (meta ≤ ${fmt(c.slo.p99Ms)} ms)` },
      {
        label: "Folga para pico",
        ok: room,
        detail: room ? "nenhum componente acima de 70%" : `perto do limite: ${hot.map((n) => b.nodes.find((x) => x.id === n.nodeId)?.data.label ?? n.nodeId).join(", ")}`,
      },
    ],
    stars: [err, lat, room].filter(Boolean).length,
    passed: err && lat,
  };
}
