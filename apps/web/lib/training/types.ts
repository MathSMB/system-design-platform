import type { Graph, NodeKind, SimResult } from "@sdp/sim-engine";
import type { Edge } from "@xyflow/react";
import type { FailureInjection } from "@sdp/sim-engine";
import type { SysNode } from "@/components/canvas/store";

/** O que uma checagem enxerga do canvas. */
export interface Board {
  nodes: SysNode[];
  edges: Edge[];
  failures: FailureInjection[];
  /** Resultado da última simulação, só se ela rodou no desenho atual (senão null). */
  result: SimResult | null;
  /** Resultado da simulação anterior a esta etapa (para comparar antes e depois). */
  before: SimResult | null;
}

export interface CheckOutcome {
  ok: boolean;
  /** O que ainda falta, em uma frase. */
  hint?: string;
}

export interface Choice {
  text: string;
  correct?: boolean;
  /** Por que essa opção está certa ou errada. */
  why: string;
}

export type Step =
  /** Texto do mentor, sem tarefa. */
  | { type: "info"; title: string; body: string }
  /** Pergunta de múltipla escolha; a explicação aparece depois da resposta. */
  | { type: "choice"; title: string; body: string; choices: Choice[]; lesson: string }
  /** Conta de estimativa com tolerância. */
  | { type: "number"; title: string; body: string; answer: number; tolerance: number; unit: string; lesson: string }
  /** Tarefa no canvas; o botão "Verificar" roda a checagem. */
  | { type: "build"; title: string; body: string; tasks: string[]; check(b: Board): CheckOutcome; lesson: string }
  /** Resposta livre; depois mostra a resposta de referência. */
  | { type: "open"; title: string; body: string; reference: string };

export interface GuidedCase {
  id: string;
  title: string;
  summary: string;
  level: "básico" | "intermediário" | "avançado";
  /** Vídeo do Renato Augusto que inspira o caso. */
  video?: { id: string; title: string };
  /** Desenho inicial do canvas. */
  start: Graph;
  steps: Step[];
}

export interface Challenge {
  id: string;
  title: string;
  brief: string;
  /** Requisitos funcionais e não funcionais, como o entrevistador falaria. */
  requirements: string[];
  /** Carga que o desenho precisa aguentar (nó Usuários). */
  load: { dailyActiveUsers: number; requestsPerUserPerDay: number; peakFactor: number; writeRatio: number };
  slo: { p99Ms: number; errorRate: number };
  /** Componentes que o enunciado exige (ex.: provedor externo). */
  mustHave?: { kind: NodeKind; label: string; params: Record<string, unknown> }[];
}
