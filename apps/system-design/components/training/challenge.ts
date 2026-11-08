import { baseRps, type ClientParams, type Graph } from "@sdp/sim-engine";
import { useCanvas } from "@/components/canvas/store";
import type { Challenge } from "@/lib/training/types";
import { readBoard } from "./useBoard";

const fmt = (x: number, d = 0) => x.toLocaleString("pt-BR", { maximumFractionDigits: d });

/** Desenho inicial da entrevista: só os usuários do enunciado (e o que ele exigir). */
export function challengeGraph(c: Challenge): Graph {
  return {
    nodes: [
      { id: "users", kind: "client", label: "Usuários", params: { pattern: "constant", ...c.load, timeoutMs: 2000, readAfterWriteMs: 0 } },
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
  s.set({ durationSec: c.durationSec ?? 60 });
}

export function peakOf(c: Challenge) {
  return baseRps({ ...c.load, pattern: "constant", timeoutMs: 0 } as ClientParams) * c.load.peakFactor;
}

export interface Verdict {
  items: { label: string; ok: boolean; detail: string }[];
  stars: number;
  /** Estrelas possíveis (3, ou 4 quando o enunciado tem orçamento). */
  max: number;
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
  if ((p.botRps ?? 0) < (c.load.botRps ?? 0)) return `O bot faz parte do enunciado: volte para ${fmt(c.load.botRps ?? 0)} req/s no nó Usuários.`;
  if ((c.load.pattern ?? "constant") !== (p.pattern ?? "constant")) return "O padrão de tráfego dos Usuários faz parte do enunciado. Volte ao original.";
  for (const m of c.mustHave ?? []) {
    const n = b.nodes.find((x) => x.data.kind === m.kind && x.data.label === m.label);
    if (!n) return `O enunciado exige o componente "${m.label}".`;
    if (JSON.stringify(n.data.params) !== JSON.stringify(m.params)) return `Os parâmetros do "${m.label}" são fixos no enunciado. Volte aos valores originais.`;
    if (!b.edges.some((e) => e.target === n.id)) return `O "${m.label}" precisa continuar recebendo as chamadas: ligue-o ao desenho.`;
  }
  if (c.rules?.blockingServers) {
    const free = b.nodes.filter((n) => n.data.kind === "server" && !n.data.params.blocking);
    if (free.length) return `Os servidores do enunciado são de thread por requisição: ligue "Thread presa" em ${free.map((n) => n.data.label).join(", ")}.`;
  }
  const r = b.result;
  // com bot, o SLO vale para os usuários legítimos (o 429 do bot é esperado)
  const errRate = r.bot ? r.legit.errorRate : r.errorRate;
  const err = errRate <= c.slo.errorRate;
  const lat = r.latency.p99Ms <= c.slo.p99Ms;
  const hot = r.nodes.filter((n) => n.status !== "ok" && n.kind !== "client");
  const room = hot.length === 0;
  const budget = c.rules?.maxAvgWorkers;
  const avgWorkers = (r.workerHours * 3600) / r.simulatedSec;
  const cheap = budget === undefined || avgWorkers <= budget;
  return {
    items: [
      { label: r.bot ? "Erros (legítimos)" : "Erros", ok: err, detail: `${fmt(errRate * 100, 2)}% (meta ≤ ${fmt(c.slo.errorRate * 100, 1)}%)` },
      { label: "Latência p99", ok: lat, detail: `${fmt(r.latency.p99Ms)} ms (meta ≤ ${fmt(c.slo.p99Ms)} ms)` },
      {
        label: "Folga para pico",
        ok: room,
        detail: room ? "nenhum componente acima de 70%" : `perto do limite: ${hot.map((n) => b.nodes.find((x) => x.id === n.nodeId)?.data.label ?? n.nodeId).join(", ")}`,
      },
      ...(budget !== undefined
        ? [{ label: "Orçamento", ok: cheap, detail: `${fmt(avgWorkers)} workers em média (meta ≤ ${fmt(budget)})` }]
        : []),
    ],
    stars: [err, lat, room, ...(budget !== undefined ? [cheap] : [])].filter(Boolean).length,
    max: budget !== undefined ? 4 : 3,
    passed: err && lat,
  };
}
