import { KIND_LABEL } from "./labels";
import type { Graph, NodeKind, NodeMetrics, NodeStatus, SimResult } from "./types";

const fmtPct = (x: number) => `${Math.round(x * 100)}%`;
const fmtInt = (x: number) => Math.round(x).toLocaleString("pt-BR");

export function nodeStatus(m: NodeMetrics, down: boolean): NodeStatus {
  if (down) return "down";
  const rejectRate = m.arrivals > 0 ? m.rejected / m.arrivals : 0;
  if (m.utilization >= 0.85 || rejectRate > 0.01) return "bad";
  if (m.utilization >= 0.7 || rejectRate > 0) return "warn";
  return "ok";
}

const ADVICE: Partial<Record<NodeKind, string>> = {
  server:
    "Coloque mais instâncias atrás de um load balancer, aumente os workers, ou tire carga dele com cache.",
  database:
    "Para leitura: cache ou réplicas de leitura. Para escrita: lote/fila, otimizar a query ou, em último caso, sharding.",
  cache: "Aumente a capacidade do cache (mais nós ou mais workers).",
  cdn: "Aumente a capacidade da CDN ou o hit rate.",
  queue:
    "A fila está enchendo: os consumidores não dão conta. Adicione consumidores ou aumente a capacidade de quem eles chamam.",
  external:
    "Dependência externa limitando o sistema: use timeout curto, circuit breaker, cache da resposta ou processamento assíncrono.",
};

/** Explica em PT-BR onde o sistema quebrou e o que tentar. */
export function diagnose(graph: Graph, r: SimResult): string[] {
  const out: string[] = [];
  const label = (id: string) => {
    const n = graph.nodes.find((x) => x.id === id)!;
    return n.label ?? KIND_LABEL[n.kind];
  };

  const down = r.nodes.filter((m) => m.status === "down");
  for (const m of down) out.push(`**${label(m.nodeId)}** está fora do ar.`);

  const caches = r.nodes.filter((m) => (m.kind === "cache" || m.kind === "cdn") && m.status === "down");
  if (caches.length > 0 && r.nodes.some((m) => m.kind === "database" && m.status === "bad")) {
    out.push(
      "Isso é uma **avalanche de cache**: sem o cache, 100% das leituras foram para o banco, que foi dimensionado para receber só os misses.",
    );
  }

  const bad = r.nodes
    .filter((m) => m.status === "bad")
    .sort((a, b) => b.utilization - a.utilization);
  for (const m of bad) {
    const parts = [`utilização de ${fmtPct(m.utilization)}`];
    if (m.rejected > 0) parts.push(`${fmtInt(m.rejected)} requisições rejeitadas`);
    if (m.maxQueue > 0) parts.push(`fila chegou a ${fmtInt(m.maxQueue)}`);
    out.push(
      `**${label(m.nodeId)}** é um gargalo (${parts.join(", ")}). Perto de 100% de utilização a fila cresce sem limite e a latência explode. ${ADVICE[m.kind] ?? ""}`.trim(),
    );
  }

  const warn = r.nodes.filter((m) => m.status === "warn");
  for (const m of warn) {
    out.push(`**${label(m.nodeId)}** opera com pouca folga (${fmtPct(m.utilization)}). Um pico pode derrubá-lo.`);
  }

  if (r.errors.timeout > 0) {
    out.push(
      `${fmtInt(r.errors.timeout)} requisições estouraram o timeout do usuário. O sistema continuou trabalhando nelas, desperdiçando capacidade.`,
    );
  }

  if (out.length === 0) {
    const top = [...r.nodes].sort((a, b) => b.utilization - a.utilization)[0];
    out.push(
      top
        ? `Nenhum gargalo. O componente mais carregado é **${label(top.nodeId)}**, com ${fmtPct(top.utilization)} de utilização.`
        : "Nenhum gargalo encontrado.",
    );
  }
  return out;
}
