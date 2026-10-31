import { KIND_LABEL, type Graph, type SimResult } from "@sdp/sim-engine";
import type { Evaluation, EvaluationInput } from "./types";

/** Rubrica da seção 9.2 da base técnica. */
export const DIMENSIONS = [
  "Escopo e requisitos",
  "Estimativas",
  "Desenho",
  "Profundidade",
  "Trade-offs",
  "Falhas",
  "Comunicação",
] as const;

export const SYSTEM_PROMPT = `Você avalia respostas de entrevista de system design, em português do Brasil.

Simule DOIS avaliadores independentes e depois um consenso:
1. "Entrevistadora de big tech": rigorosa, cobra requisitos não funcionais com números, consistência, falhas e escala.
2. "Staff pragmático de startup": valoriza simplicidade, custo e entregar; penaliza superdimensionamento.

Regras:
- Notas de 0 a 10 (inteiros).
- Avalie cada dimensão da rubrica: ${DIMENSIONS.join(", ")}.
- Use os resultados da simulação como evidência objetiva (gargalos, p99, taxa de erro). Não invente métricas que não foram dadas.
- Seja tecnicamente preciso. Erros comuns a apontar quando aparecerem: confundir usuários por dia com requisições por segundo; dizer que um sistema distribuído é "CA"; tratar exactly-once como garantia de rede; supor ordem global no Kafka; lock distribuído com TTL sem fencing token; usar média em vez de percentis; ignorar replication lag; retry sem backoff e jitter; sharding sem números que justifiquem.
- Sugira de 2 a 4 perguntas de follow-up que um entrevistador faria a seguir.
- Próximos passos: ações concretas para o candidato estudar ou mudar no desenho.`;

export const EVALUATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["overallScore", "judges", "dimensions", "consensus", "followUpQuestions", "nextSteps"],
  properties: {
    overallScore: { type: "integer", description: "Nota final de 0 a 10" },
    judges: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "perspective", "score", "strengths", "weaknesses"],
        properties: {
          name: { type: "string" },
          perspective: { type: "string" },
          score: { type: "integer", description: "0 a 10" },
          strengths: { type: "array", items: { type: "string" } },
          weaknesses: { type: "array", items: { type: "string" } },
        },
      },
    },
    dimensions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dimension", "score", "comment"],
        properties: {
          dimension: { type: "string" },
          score: { type: "integer", description: "0 a 10" },
          comment: { type: "string" },
        },
      },
    },
    consensus: { type: "string" },
    followUpQuestions: { type: "array", items: { type: "string" } },
    nextSteps: { type: "array", items: { type: "string" } },
  },
} as const;

function describeGraph(g: Graph): string {
  const nodes = g.nodes.map((n) => `- ${n.id} (${KIND_LABEL[n.kind]}${n.label ? `: ${n.label}` : ""}) ${JSON.stringify(n.params)}`);
  const edges = g.edges.map((e) => `- ${e.source} → ${e.target}`);
  return `Componentes:\n${nodes.join("\n")}\n\nConexões (chamadas síncronas; a fila é assíncrona):\n${edges.join("\n")}`;
}

function describeSimulation(r: SimResult): string {
  const nodes = r.nodes
    .map((n) => `- ${n.nodeId}: ${n.status}, utilização ${Math.round(n.utilization * 100)}%, rejeitadas ${n.rejected}, fila máx ${n.maxQueue}`)
    .join("\n");
  return [
    `Duração simulada: ${r.simulatedSec}s, ${r.totalRequests} requisições`,
    `Taxa de erro: ${(r.errorRate * 100).toFixed(2)}% (timeout ${r.errors.timeout}, rejeitadas ${r.errors.rejected}, indisponível ${r.errors.unavailable}, dependência ${r.errors.dependency})`,
    `Latência: p50 ${r.latency.p50Ms.toFixed(1)} ms, p95 ${r.latency.p95Ms.toFixed(1)} ms, p99 ${r.latency.p99Ms.toFixed(1)} ms`,
    `Por componente:\n${nodes}`,
    `Diagnóstico automático:\n${r.diagnosis.map((d) => `- ${d}`).join("\n")}`,
  ].join("\n");
}

export function buildPrompt(input: EvaluationInput): string {
  const parts = [`## Problema\n${input.problem}`];
  if (input.requirements?.length) parts.push(`## Requisitos\n${input.requirements.map((r) => `- ${r}`).join("\n")}`);
  parts.push(`## Desenho do candidato\n${describeGraph(input.graph)}`);
  parts.push(
    input.simulation
      ? `## Resultado da simulação de carga\n${describeSimulation(input.simulation)}`
      : "## Simulação\nO candidato não rodou a simulação.",
  );
  if (input.notes) parts.push(`## Explicação do candidato\n${input.notes}`);
  parts.push("Avalie seguindo a rubrica e responda no formato JSON pedido.");
  return parts.join("\n\n");
}

const clamp = (x: unknown) => Math.max(0, Math.min(10, Math.round(Number(x) || 0)));
const strings = (x: unknown) => (Array.isArray(x) ? x.map(String) : []);

/** Confere e normaliza a resposta do modelo (notas entre 0 e 10, listas sempre presentes). */
export function normalizeEvaluation(raw: unknown): Evaluation {
  if (!raw || typeof raw !== "object") throw new Error("Resposta da IA não é um objeto JSON.");
  const r = raw as Record<string, unknown>;
  return {
    overallScore: clamp(r.overallScore),
    judges: (Array.isArray(r.judges) ? r.judges : []).map((j: Record<string, unknown>) => ({
      name: String(j.name ?? ""),
      perspective: String(j.perspective ?? ""),
      score: clamp(j.score),
      strengths: strings(j.strengths),
      weaknesses: strings(j.weaknesses),
    })),
    dimensions: (Array.isArray(r.dimensions) ? r.dimensions : []).map((d: Record<string, unknown>) => ({
      dimension: String(d.dimension ?? ""),
      score: clamp(d.score),
      comment: String(d.comment ?? ""),
    })),
    consensus: String(r.consensus ?? ""),
    followUpQuestions: strings(r.followUpQuestions),
    nextSteps: strings(r.nextSteps),
  };
}

/** Extrai JSON de um texto (aceita bloco ```json ou o primeiro objeto { ... }). */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1]! : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  return JSON.parse(candidate);
}
