import type { Graph, SimResult } from "@sdp/sim-engine";
import type { AnswerEvaluation, AnswerInput } from "./answer";
import type { SessionFeedback, SessionInput } from "./session";
import type { ProjectAnalysisInput, ResearchInput, ScheduleDraft, ScheduleInput, StudyChatInput, StudyChatReply, StudyContext } from "./study";

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
  /** Pesquisa as vagas do cargo na web (demora minutos). Devolve o JSON bruto, limpo depois com cleanResearch. */
  researchRole(input: ResearchInput): Promise<unknown>;
  /** Conversa para montar trilhas (pós, livro, certificação…) e mudar o plano. */
  studyChat(input: StudyChatInput): Promise<StudyChatReply>;
  /** 3 projetos de portfólio (JSON bruto, limpo depois com cleanProjects). */
  proposeProjects(input: StudyContext): Promise<unknown>;
  /** Lê os commits novos de um projeto e diz o quanto andou (JSON bruto, limpo depois com fromAi). */
  analyzeProject(input: ProjectAnalysisInput): Promise<unknown>;
  /** Cronograma dia a dia em blocos curtos. */
  planSchedule(input: ScheduleInput): Promise<ScheduleDraft>;
}
