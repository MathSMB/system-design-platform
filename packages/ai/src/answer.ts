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
  /** Quem está entrevistando (ex. "Larissa, tech recruiter"), para a IA responder no papel. */
  interviewer?: string;
  /** Conversa até aqui nesta pergunta (pergunta original, respostas e aprofundamentos). */
  history?: { who: "entrevistador" | "candidato"; text: string }[];
  /** Respostas que soam mal ou são erradas para esta pergunta (sinais de alerta). */
  avoid?: string[];
  /** Vaga a que o candidato se candidatou: empresa, requisitos e contexto, para o feedback ser ligado à vaga. */
  job?: string;
  /** Se a IA pode fazer uma pergunta de aprofundamento depois desta resposta. */
  allowFollowUp?: boolean;
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
  /** Como um candidato do nível da vaga responderia, falado, em primeira pessoa. */
  betterAnswer: string;
  /** Dicas concretas de como falar a resposta (abertura, ordem, frases a evitar, tempo). */
  howToSay: string[];
  /** O que o entrevistador diz em seguida, no papel, sem revelar nota (1 a 3 frases). */
  reply: string;
  /** Pergunta de aprofundamento, ou "" quando não há. */
  followUp: string;
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
- "strengths" e "gaps": específicos ao que ELE disse (cite trechos ou ideias da resposta), nunca genéricos. Em "gaps", diga o que faltou e por que o entrevistador sente falta disso nesta vaga.
- "betterAnswer": a resposta que faria o candidato passar nesta vaga, do jeito que se FALA numa entrevista, em primeira pessoa, 6 a 10 frases. Estrutura obrigatória:
  1. abre com a resposta direta em uma frase (sem "então, tipo...");
  2. explica o mecanismo com os termos técnicos corretos;
  3. traz um exemplo concreto de projeto, com contexto e, se der, um número (tempo, volume, erro evitado), de preferência ligado ao domínio e às tecnologias da vaga;
  4. diz o trade-off ou o cuidado principal;
  5. fecha com como verifica ou testa (teste, métrica, log, revisão) ou, em perguntas comportamentais, com o resultado e o que aprendeu.
  Aproveite o que o candidato disse de certo e corrija o que estava errado. Nada de resposta de livro: tem que soar como alguém que já fez.
- "howToSay": 3 a 5 dicas práticas de fala, específicas para esta resposta: por onde começar, o que cortar, a ordem das ideias, frases prontas que soam bem ("No último projeto eu...", "O trade-off é..."), vícios de linguagem ou hesitações que apareceram e quanto tempo falar.
- Seja direto, assertivo e gentil, sem elogios vazios.

Você também está NO PAPEL do entrevistador, numa conversa ao vivo:
- "reply": o que o entrevistador fala logo depois da resposta, em 1 a 3 frases naturais, como numa entrevista real. Não diga nota nem nível. Pode reagir ao que foi dito, pedir um exemplo ou corrigir com tato um erro grave.
- "followUp": se for permitido aprofundar, faça UMA pergunta de aprofundamento curta que um bom entrevistador faria a partir do que o candidato disse (cutucar o ponto fraco ou ir um nível acima). Se não for permitido ou não fizer sentido, devolva "".
- Quando houver conversa anterior, avalie a última resposta do candidato considerando o contexto.`;

export const ANSWER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["level", "score", "verdict", "strengths", "gaps", "covered", "communication", "betterAnswer", "howToSay", "reply", "followUp"],
  properties: {
    level: { type: "string", enum: [...SENIORITY] },
    score: { type: "integer", description: "0 a 10, em relação ao nível da vaga" },
    verdict: { type: "string", description: "Uma ou duas frases com o veredito" },
    strengths: { type: "array", items: { type: "string" } },
    gaps: { type: "array", items: { type: "string" } },
    covered: { type: "array", items: { type: "string" } },
    communication: { type: "string" },
    betterAnswer: { type: "string" },
    howToSay: { type: "array", items: { type: "string" } },
    reply: { type: "string", description: "Fala do entrevistador, sem nota" },
    followUp: { type: "string", description: "Pergunta de aprofundamento ou vazio" },
  },
} as const;

export function buildAnswerPrompt(i: AnswerInput): string {
  const parts = [`## Etapa\n${i.stage} · vaga de nível ${i.target}${i.interviewer ? ` · entrevistador: ${i.interviewer}` : ""}`, `## Pergunta do entrevistador\n${i.question}`];
  if (i.job) parts.push(`## Vaga\n${i.job}`);
  if (i.code) parts.push(`## Código mostrado\n\`\`\`java\n${i.code}\n\`\`\``);
  if (i.expected?.length) parts.push(`## O que o entrevistador queria ouvir\n${i.expected.map((e) => `- ${e}`).join("\n")}`);
  if (i.reference) parts.push(`## Resposta de referência (não mostrada ao candidato)\n${i.reference}`);
  if (i.avoid?.length) parts.push(`## Respostas que soam mal nesta pergunta (sinais de alerta)\n${i.avoid.map((e) => `- ${e}`).join("\n")}`);
  if (i.history?.length) parts.push(`## Conversa até aqui\n${i.history.map((h) => `${h.who === "entrevistador" ? "Entrevistador" : "Candidato"}: ${h.text}`).join("\n")}`);
  parts.push(`## Última resposta do candidato${i.spoken ? " (transcrição automática de áudio)" : ""}\n${i.answer}`);
  parts.push(i.allowFollowUp ? "Pode fazer uma pergunta de aprofundamento." : "NÃO faça pergunta de aprofundamento: followUp deve ser \"\".");
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
    howToSay: strings(r.howToSay),
    reply: String(r.reply ?? ""),
    followUp: String(r.followUp ?? "").trim(),
  };
}
