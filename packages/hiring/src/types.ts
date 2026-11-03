/** Nível de uma resposta: a de pleno (mecanismo + caso), a de livro (certa mas rasa) ou a errada comum. */
export type AnswerLevel = "pleno" | "livro" | "errada";

export interface Option {
  text: string;
  level: AnswerLevel;
  /** Por que essa resposta vale (ou não) numa entrevista de pleno. */
  why: string;
}

export interface AskStep {
  q: string;
  options: Option[];
}

export type BlockId = "java" | "spring" | "rest" | "dados" | "distribuidos" | "qualidade" | "operacao";

export interface Block {
  id: BlockId;
  title: string;
  /** Quantas das 12 vagas do guia citam o tema (base do peso no sorteio). */
  vagas: string;
  /** Peso no sorteio da entrevista completa. */
  weight: number;
  /** Seção do guia "O que as vagas pedem de cada tecnologia" para revisar. */
  guide: string;
  summary: string;
}

export interface JavaQuestion {
  id: string;
  block: BlockId;
  /** A pergunta como o entrevistador faz, com contexto de trabalho. */
  prompt: string;
  /** Trecho de código mostrado junto da pergunta (opcional). */
  code?: string;
  options: Option[];
  followUp: AskStep;
  /** O que o entrevistador queria ouvir. */
  checklist: string[];
}

/** Pontos de uma resposta: pleno 2, livro 1, errada 0. */
export const POINTS: Record<AnswerLevel, number> = { pleno: 2, livro: 1, errada: 0 };
