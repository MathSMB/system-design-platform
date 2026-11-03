/** Feedback geral de uma sessão inteira de entrevista (treino de Java ou processo seletivo completo). */
import { SENIORITY, type Seniority } from "./answer";

export interface SessionItem {
  question: string;
  answer: string;
  level: string;
  score: number;
  gaps: string[];
}

export interface SessionInput {
  /** Ex. "Processo seletivo · Tucano Bank · Java Pleno" ou "Treino · Java Pleno · entrevista completa". */
  title: string;
  target: Seniority;
  job?: string;
  stages: { stage: string; result?: string; items: SessionItem[] }[];
  /** Etapa em que ele teria sido eliminado num processo real, se houve. */
  eliminatedAt?: string;
  outcome?: string;
}

export interface SessionFeedback {
  level: Seniority;
  /** Nota geral de 0 a 10 para a vaga. */
  score: number;
  verdict: string;
  /** Decisão que a empresa tomaria e por quê. */
  decision: string;
  byStage: { stage: string; level: Seniority; comment: string }[];
  /** Padrões que se repetem nas respostas (bons e ruins). */
  patterns: string[];
  strengths: string[];
  gaps: string[];
  /** Como falar melhor nas próximas entrevistas, de forma geral. */
  howToSpeak: string[];
  /** O que estudar, em ordem de prioridade, com o porquê. */
  studyPlan: string[];
}

export const SESSION_SYSTEM_PROMPT = `Você é um tech lead e recrutador experiente de vagas Java no Brasil. Recebe TODAS as respostas que um candidato deu numa sessão de entrevista, já avaliadas uma a uma, e escreve o feedback geral que uma empresa nunca dá, em português do Brasil.

Regras:
- "level": o nível que ele demonstrou no conjunto ("abaixo de júnior", "júnior", "pleno", "sênior"), pesando mais as etapas técnicas.
- "score": 0 a 10 em relação à vaga.
- "verdict": 2 a 3 frases, direto ao ponto.
- "decision": o que a empresa decidiria (contratar, contratar como júnior, reprovar) e o motivo real, como seria discutido internamente.
- "byStage": uma entrada por etapa recebida, com o nível e um comentário de 1 a 2 frases específico.
- "patterns": 3 a 5 padrões que se repetem entre as respostas (ex.: "responde a definição mas nunca dá exemplo", "pretensão sem pesquisa"). Cite as perguntas.
- "strengths" e "gaps": os mais importantes, específicos.
- "howToSpeak": 4 a 6 orientações de comunicação para as próximas entrevistas, concretas e acionáveis, com frases-modelo quando ajudar.
- "studyPlan": 3 a 6 itens em ordem de prioridade, cada um com o tema, por que importa para a vaga e como praticar.
- Seja assertivo e honesto, sem elogios vazios.`;

export const SESSION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["level", "score", "verdict", "decision", "byStage", "patterns", "strengths", "gaps", "howToSpeak", "studyPlan"],
  properties: {
    level: { type: "string", enum: [...SENIORITY] },
    score: { type: "integer" },
    verdict: { type: "string" },
    decision: { type: "string" },
    byStage: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["stage", "level", "comment"],
        properties: { stage: { type: "string" }, level: { type: "string", enum: [...SENIORITY] }, comment: { type: "string" } },
      },
    },
    patterns: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    howToSpeak: { type: "array", items: { type: "string" } },
    studyPlan: { type: "array", items: { type: "string" } },
  },
} as const;

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) + "…" : s);

export function buildSessionPrompt(i: SessionInput): string {
  const parts = [`## Sessão\n${i.title} · vaga de nível ${i.target}`];
  if (i.job) parts.push(`## Vaga\n${i.job}`);
  if (i.outcome) parts.push(`## Resultado\n${i.outcome}`);
  if (i.eliminatedAt) parts.push(`Num processo real, ele teria sido eliminado em: ${i.eliminatedAt}. Ele seguiu treinando as etapas seguintes.`);
  for (const s of i.stages) {
    const items = s.items
      .map((it, k) => `${k + 1}. Pergunta: ${clip(it.question, 300)}\n   Resposta: ${clip(it.answer, 900)}\n   Avaliação: ${it.level}, ${it.score}/10${it.gaps.length ? `. Faltou: ${it.gaps.join("; ")}` : ""}`)
      .join("\n");
    parts.push(`## Etapa: ${s.stage}${s.result ? ` (${s.result})` : ""}\n${items || "(sem respostas abertas)"}`);
  }
  parts.push("Escreva o feedback geral no formato JSON pedido.");
  return parts.join("\n\n");
}

const strings = (x: unknown) => (Array.isArray(x) ? x.map(String) : []);
const lvl = (x: unknown): Seniority => (SENIORITY.includes(x as Seniority) ? (x as Seniority) : "júnior");

export function normalizeSession(raw: unknown): SessionFeedback {
  if (!raw || typeof raw !== "object") throw new Error("Resposta da IA não é um objeto JSON.");
  const r = raw as Record<string, unknown>;
  return {
    level: lvl(r.level),
    score: Math.max(0, Math.min(10, Math.round(Number(r.score) || 0))),
    verdict: String(r.verdict ?? ""),
    decision: String(r.decision ?? ""),
    byStage: Array.isArray(r.byStage)
      ? r.byStage.map((b: any) => ({ stage: String(b?.stage ?? ""), level: lvl(b?.level), comment: String(b?.comment ?? "") }))
      : [],
    patterns: strings(r.patterns),
    strengths: strings(r.strengths),
    gaps: strings(r.gaps),
    howToSpeak: strings(r.howToSpeak),
    studyPlan: strings(r.studyPlan),
  };
}
