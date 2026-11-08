import { KIND_LABEL } from "./labels";
import type { Graph, NodeKind, NodeMetrics, NodeStatus, SimResult } from "./types";

const fmtPct = (x: number) => `${Math.round(x * 100)}%`;
const fmtInt = (x: number) => Math.round(x).toLocaleString("pt-BR");
const fmtMs = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s` : `${Math.round(ms)} ms`);

/** "utilização de 90%" ou, com réplicas, "primário em 40%, réplicas até 90%". */
function utilText(m: NodeMetrics): string {
  if (m.shardUtilization) return `shards em ${m.shardUtilization.map(fmtPct).join(" / ")}`;
  if (m.replicaUtilization === undefined) return `utilização de ${fmtPct(m.utilization)}`;
  return `primário em ${fmtPct(m.utilization)}, réplicas até ${fmtPct(m.replicaUtilization)}`;
}

function adviceFor(m: NodeMetrics): string {
  if (m.shardUtilization) {
    const sorted = [...m.shardUtilization].sort((a, b) => a - b);
    if (sorted[sorted.length - 1]! > 2 * Math.max(0.05, sorted[0]!)) {
      return "Um shard está muito mais quente que os outros: a chave concentra a carga (chave por data ou uma chave muito acessada). Troque para hash de uma chave com alta cardinalidade ou espalhe a chave quente (sufixo aleatório, cache na frente).";
    }
    return "Todos os shards estão cheios: adicione shards (com consistent hashing, para mover poucas chaves) ou tire carga com cache.";
  }
  if (m.kind === "server" && m.cpuUtilization !== undefined && m.cpuUtilization < m.utilization * 0.5) {
    return `Só ${fmtPct(m.cpuUtilization)} do tempo das threads é processamento: o resto é **thread presa esperando dependência**. Pela Lei de Little, threads ocupadas = vazão × tempo de espera. Ponha timeout curto nas chamadas, isole a dependência lenta num pool próprio (bulkhead) ou use um modelo assíncrono.`;
  }
  if (m.kind === "database" && m.replicaUtilization !== undefined) {
    return m.replicaUtilization > m.utilization
      ? "As réplicas de leitura estão saturadas: adicione réplicas ou coloque um cache na frente."
      : "O primário recebe todas as escritas (e as leituras de read-your-writes). Réplicas não aliviam escrita: use fila/lote, otimize a query ou, em último caso, sharding.";
  }
  return ADVICE[m.kind] ?? "";
}

export function nodeStatus(m: NodeMetrics, down: boolean): NodeStatus {
  if (down) return "down";
  const rejectRate = m.arrivals > 0 ? m.rejected / m.arrivals : 0;
  const util = Math.max(m.utilization, m.replicaUtilization ?? 0);
  if (util >= 0.85 || rejectRate > 0.01) return "bad";
  if (util >= 0.7 || rejectRate > 0) return "warn";
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
    const parts = [utilText(m)];
    if (m.rejected > 0) parts.push(`${fmtInt(m.rejected)} requisições rejeitadas`);
    if (m.maxQueue > 0) parts.push(`fila chegou a ${fmtInt(m.maxQueue)}`);
    out.push(
      `**${label(m.nodeId)}** é um gargalo (${parts.join(", ")}). Perto de 100% de utilização a fila cresce sem limite e a latência explode. ${adviceFor(m)}`.trim(),
    );
  }

  const warn = r.nodes.filter((m) => m.status === "warn");
  for (const m of warn) {
    out.push(`**${label(m.nodeId)}** opera com pouca folga (${utilText(m)}). Um pico pode derrubá-lo.`);
  }

  for (const m of r.nodes) {
    if (m.replicationLag && m.replicationLag.maxMs > 1000) {
      out.push(
        `O **replication lag** de **${label(m.nodeId)}** chegou a ${fmtMs(m.replicationLag.maxMs)}. A réplica aplica as escritas numa thread só; quando o primário escreve mais rápido do que ela consegue aplicar, o atraso cresce sem parar. Diminua o volume de escrita (lote, fila) ou use réplicas com mais capacidade.`,
      );
    }
  }

  const { dbReads, staleReads } = r.consistency;
  if (staleReads > 0) {
    const lagged = r.nodes.filter((m) => (m.staleReads ?? 0) > 0 && m.replicationLag);
    const cause = lagged.length
      ? `ela foi para uma réplica que ainda não tinha recebido a escrita (lag médio de ${fmtMs(lagged[0]!.replicationLag!.avgMs)})`
      : "a escrita foi confirmada antes de ser gravada no banco (ex.: ainda estava na fila)";
    const fix = lagged.length
      ? "Correções: ler do primário por alguns segundos depois de escrever (read-your-writes), fixar a sessão no primário, ou esperar a réplica alcançar a posição do WAL (LSN) da escrita."
      : "Correções: mostrar a escrita a partir do que o usuário enviou (otimista) ou avisar que está processando.";
    out.push(
      `**${fmtInt(staleReads)} leituras (${fmtPct(staleReads / Math.max(1, dbReads))} das leituras no banco) devolveram dado velho**: o usuário escreveu e, ao ler logo depois, não viu a própria escrita, porque ${cause}. ${fix}`,
    );
  }

  if (r.errors.limited > 0) {
    const legitLimited = r.errors.limited - (r.bot?.limited ?? 0);
    const who =
      r.bot && legitLimited > 0
        ? ` Delas, ${fmtInt(legitLimited)} eram de usuários legítimos: o balde é global e o bot gasta os tokens de todo mundo. Limite **por cliente** (chave de API, usuário ou IP).`
        : r.bot
          ? " Todas do bot: os usuários legítimos passaram."
          : "";
    out.push(`O **rate limiter** barrou ${fmtInt(r.errors.limited)} requisições com HTTP 429, na hora e sem gastar servidor.${who}`);
  }

  for (const m of r.nodes) {
    if (m.instances && m.instances.max > 0) {
      const n = graph.nodes.find((x) => x.id === m.nodeId);
      if (n?.kind !== "server" || !n.params.autoscale) continue;
      const delay = n.params.scaleDelaySec ?? 60;
      if (r.errorRate > 0.01) {
        out.push(
          `O **autoscaling** de **${label(m.nodeId)}** subiu até ${m.instances.max} instâncias, mas cada uma leva ${delay} s para começar a atender. Enquanto isso o pico bate nas instâncias que já existiam. Para pico repentino: mínimo maior antes do evento (escala agendada), instâncias pré-aquecidas, ou fila para absorver.`,
        );
      }
      if (n.params.maxInstances !== undefined && m.instances.max >= n.params.maxInstances && m.status === "bad") {
        out.push(`**${label(m.nodeId)}** bateu no máximo de ${n.params.maxInstances} instâncias do autoscaling.`);
      }
    }
    if (m.callTimeouts) {
      const n = graph.nodes.find((x) => x.id === m.nodeId);
      const t = n?.kind === "server" ? n.params.callTimeoutMs : undefined;
      out.push(`${fmtInt(m.callTimeouts)} chamadas de **${label(m.nodeId)}** estouraram o timeout de ${fmtMs(t ?? 0)} e foram tratadas como falha (a thread foi liberada).`);
    }
  }

  if (r.duplicateEffects > 0) {
    out.push(
      `**${fmtInt(r.duplicateEffects)} chamadas foram processadas em dobro** no serviço externo (ex.: cobrança dupla). O servidor desistiu por timeout e tentou de novo, mas a primeira chamada tinha chegado e foi processada. Mande uma **chave de idempotência** em cada chamada: o destino reconhece a repetição e devolve o resultado da primeira.`,
    );
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
