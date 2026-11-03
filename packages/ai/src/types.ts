import type { Graph, SimResult } from "@sdp/sim-engine";
import type { AnswerEvaluation, AnswerInput } from "./answer";
import type { SessionFeedback, SessionInput } from "./session";

export interface EvaluationInput {
  /** Enunciado do problema (ex. "Projete um encurtador de URL"). */
  problem: string;
  /** Requisitos funcionais e não funcionais combinados com o candidato. */
  requirements?: string[];
  graph: Graph;
  /** Resultado da simulação de carga, se o candidato rodou. */
  simulation?: SimResult;
  /** Explicação escrita pelo candidato (trade-offs, decisões). */
  notes?: string;
}

export interface JudgeVerdict {
  name: string;
  perspective: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
}

export interface DimensionScore {
  dimension: string;
  score: number;
  comment: string;
}

export interface Evaluation {
  overallScore: number;
  judges: JudgeVerdict[];
  dimensions: DimensionScore[];
  consensus: string;
  followUpQuestions: string[];
  nextSteps: string[];
}

export interface AiProvider {
  readonly name: string;
  evaluate(input: EvaluationInput): Promise<Evaluation>;
  /** Avalia uma resposta de entrevista (falada ou escrita) e diz o nível demonstrado. */
  evaluateAnswer(input: AnswerInput): Promise<AnswerEvaluation>;
  /** Feedback geral de uma sessão inteira de entrevista. */
  evaluateSession(input: SessionInput): Promise<SessionFeedback>;
}
