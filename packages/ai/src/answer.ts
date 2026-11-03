/** Avaliação de uma resposta falada ou escrita numa entrevista (técnica, RH ou gestor). */

export const SENIORITY = ["abaixo de júnior", "júnior", "pleno", "sênior"] as const;
export type Seniority = (typeof SENIORITY)[number];

export interface AnswerInput {
  /** Etapa e área, ex. "Entrevista técnica · Java Pleno" ou "Conversa com o RH". */
  stage: string;
  /** Nível da vaga. */
  target: Seniority;
  question: string;
  /** Código mostrado junto da pergunta. */
  code?: string;
  /** O que o entrevistador queria ouvir. */
  expected?: string[];
  /** Resposta de referência de um bom candidato. */
  reference?: string;
  /** O que o candidato disse (transcrição do áudio ou texto digitado). */
  answer: string;
  /** true quando a resposta veio de transcrição automática (pode ter erros de reconhecimento). */
  spoken?: boolean;
}

export interface AnswerEvaluation {
  /** Nível que a resposta demonstra. */
  level: Seniority;
  score: number;
  verdict: string;
  strengths: string[];
  gaps: string[];
  /** Itens de `expected` que o candidato cobriu. */
  covered: string[];
  communication: string;
  /** Como um candidato do nível da vaga responderia, em 4 a 8 frases. */
  betterAnswer: string;
}

export const ANSWER_SYSTEM_PROMPT = `Você é um entrevistador experiente de vagas de desenvolvimento Java no Brasil e avalia UMA resposta de candidato, em português do Brasil.

Regras:
- Diga em que nível a resposta está: "abaixo de júnior", "júnior", "pleno" ou "sênior". Critérios:
  - júnior: conhece a definição e o uso básico;
  - pleno: explica o mecanismo, dá um exemplo concreto vivido ou plausível, sabe o trade-off principal e como testar ou verificar;
  - sênior: além disso, considera escala, falhas, operação e alternativas, e conecta com decisões de arquitetura e de time.
- Nota de 0 a 10 em relação ao nível da vaga.
- Seja tecnicamente preciso e aponte erros técnicos explicitamente.
- Em perguntas de RH ou comportamentais, avalie clareza, estrutura STAR (situação, tarefa, ação, resultado), resultado concreto e sinais de alerta (falar mal de empresa, culpar outros, pretensão sem pesquisa).
- Se a resposta veio de transcrição de áudio, ignore erros de reconhecimento de palavras e avalie também a fala: objetividade, ordem das ideias e vícios de linguagem.
- "covered": copie exatamente os itens da lista do que o entrevistador queria ouvir que o candidato cobriu.
- "betterAnswer": como um candidato do nível da vaga responderia, em primeira pessoa, 4 a 8 frases.
- Seja direto e gentil, sem elogios vazios.`;

export const ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["level", "score", "verdict", "strengths", "gaps", "covered", "communication", "betterAnswer"],
  properties: {
    level: { type: "string", enum: [...SENIORITY] },
    score: { type: "integer", description: "0 a 10, em relação ao nível da vaga" },
    verdict: { type: "string", description: "Uma ou duas frases com o veredito" },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    covered: { type: "array", items: { type: "string" } },
    communication: { type: "string" },
    betterAnswer: { type: "string" },
  },
} as const;

export function buildAnswerPrompt(i: AnswerInput): string {
  const parts = [`## Etapa\n${i.stage} · vaga de nível ${i.target}`, `## Pergunta do entrevistador\n${i.question}`];
  if (i.code) parts.push(`## Código mostrado\n\`\`\`java\n${i.code}\n\`\`\``);
  if (i.expected?.length) parts.push(`## O que o entrevistador queria ouvir\n${i.expected.map((e) => `- ${e}`).join("\n")}`);
  if (i.reference) parts.push(`## Resposta de referência (não mostrada ao candidato)\n${i.reference}`);
  parts.push(`## Resposta do candidato${i.spoken ? " (transcrição automática de áudio)" : ""}\n${i.answer}`);
  parts.push("Avalie e responda no formato JSON pedido.");
  return parts.join("\n\n");
}

const strings = (x: unknown) => (Array.isArray(x) ? x.map(String) : []);

export function normalizeAnswer(raw: unknown): AnswerEvaluation {
  if (!raw || typeof raw !== "object") throw new Error("Resposta da IA não é um objeto JSON.");
  const r = raw as Record<string, unknown>;
  const level = SENIORITY.includes(r.level as Seniority) ? (r.level as Seniority) : "júnior";
  return {
    level,
    score: Math.max(0, Math.min(10, Math.round(Number(r.score) || 0))),
    verdict: String(r.verdict ?? ""),
    strengths: strings(r.strengths),
    gaps: strings(r.gaps),
    covered: strings(r.covered),
    communication: String(r.communication ?? ""),
    betterAnswer: String(r.betterAnswer ?? ""),
  };
}
