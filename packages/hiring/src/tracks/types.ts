import type { CompanyId, CodeReview } from "../process";
import type { Level, MarketProfile } from "../tracks";

/** Pergunta aberta: a IA conversa e avalia com o que o entrevistador quer ouvir. */
export interface OpenQuestion {
  id: string;
  block: string;
  prompt: string;
  code?: string;
  /** O que o entrevistador queria ouvir. */
  checklist: string[];
  /** Resposta de um bom candidato do nível, e o aprofundamento esperado. */
  reference: string;
  /** Respostas que soam mal (sinais de alerta), com o porquê. */
  avoid: string[];
}

export interface TrackBlock {
  id: string;
  title: string;
  /** 3 = pedido em quase todas as vagas; 1 = diferencial. */
  weight: number;
}

/** Como a vaga aparece em cada uma das 3 empresas. */
export interface JobPosting {
  title: string;
  about: string;
  must: string[];
  nice: string[];
  offer: string[];
  /** Faixa mensal CLT (R$). */
  band: [number, number];
  /** Quem conduz a entrevista técnica, quando muda com a stack. */
  tecnica?: string;
  gestor?: string;
}

/** Tudo o que uma vaga (stack + senioridade) precisa para o processo seletivo. */
export interface TrackContent {
  id: string;
  stack: string;
  level: Level;
  /** Ex. "Dev Full Stack Python Pleno". */
  role: string;
  /** Como o candidato descreve a experiência na triagem e no RH, ex. "Python e React". */
  experience: string;
  blocks: TrackBlock[];
  questions: OpenQuestion[];
  /** Filtro da triagem: cada item precisa aparecer nas tecnologias que o candidato digitou. */
  required: { pattern: string; label: string }[];
  jobs: Record<CompanyId, JobPosting>;
  /** Revisão de código: [0] para o banco digital, [1] para a consultoria. */
  reviews: [CodeReview, CodeReview];
  takehome: { title: string; brief: string[]; defense: { q: string; reference: string; avoid: string[] }[] };
  /** Inclui o bug de concorrência na técnica (vagas de back-end). */
  race: boolean;
  market: MarketProfile;
}
