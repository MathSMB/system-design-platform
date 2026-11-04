import { baseRps, type NodeKind } from "@sdp/sim-engine";
import type { Board, CheckOutcome } from "./types";

export const ofKind = (b: Board, k: NodeKind) => b.nodes.filter((n) => n.data.kind === k);
export const count = (b: Board, k: NodeKind) => ofKind(b, k).length;

/** Existe caminho do nó Usuários até algum nó do tipo k? */
export function reaches(b: Board, k: NodeKind, from: NodeKind = "client"): boolean {
  const kindOf = new Map(b.nodes.map((n) => [n.id, n.data.kind]));
  const seen = new Set<string>();
  const stack = ofKind(b, from).map((n) => n.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    if (kindOf.get(id) === k && !(from === k && ofKind(b, from).some((n) => n.id === id))) return true;
    for (const e of b.edges) if (e.source === id) stack.push(e.target);
  }
  return false;
}

/** Há aresta de algum nó tipo a para algum nó tipo c? */
export function linked(b: Board, a: NodeKind, c: NodeKind): boolean {
  const kindOf = new Map(b.nodes.map((n) => [n.id, n.data.kind]));
  return b.edges.some((e) => kindOf.get(e.source) === a && kindOf.get(e.target) === c);
}

export const metricsOf = (b: Board, k: NodeKind) => (b.result ? b.result.nodes.filter((n) => n.kind === k) : []);

export function clientPeakRps(b: Board): number {
  const c = ofKind(b, "client")[0];
  if (!c) return 0;
  const p = c.data.params as unknown as Parameters<typeof baseRps>[0];
  return baseRps(p) * p.peakFactor;
}

/** Junta várias condições; devolve a primeira que falhar. */
export function all(...conds: [boolean, string][]): CheckOutcome {
  const miss = conds.find(([ok]) => !ok);
  return miss ? { ok: false, hint: miss[1] } : { ok: true };
}

export const SIMULATE = "Rode a simulação (▶ Simular) depois da última mudança.";
