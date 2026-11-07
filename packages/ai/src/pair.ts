// Pair Programming: o mentor que ensina como para júnior, um passo por vez.
// O jeito de ensinar fica na skill do repo (.claude/skills/pair-programming/SKILL.md);
// aqui fica só o formato da resposta que o app precisa.
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { ChatMessage } from "./study";

export const PAIR_SKILL_PATH = ".claude/skills/pair-programming/SKILL.md";

/** Se a skill não for encontrada (ex. o app rodando fora do repo), o essencial dela. */
export const PAIR_PERSONA_FALLBACK = `Você é um dev sênior fazendo pair programming com alguém em início de carreira. Fale em português do Brasil, com calma, como para um júnior: explique o fundamento de cada coisa, o ambiente, o Git e o código linha por linha. Entregue UM passo por vez, com o que fazer, por que e como conferir, e termine esperando a pessoa dizer "pode continuar". Nunca assuma que algo está instalado. Quem digita é a pessoa; você sugere, explica e confere.`;

/** Lê a persona da skill do repo, sem o cabeçalho (frontmatter). Procura subindo a partir de `from`. */
export function loadPairPersona(from = process.cwd()): string {
  let dir = from;
  for (let i = 0; i < 6; i++) {
    const p = join(dir, PAIR_SKILL_PATH);
    if (existsSync(p)) {
      const body = stripFrontmatter(readFileSync(p, "utf8")).trim();
      if (body) return body;
    }
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return PAIR_PERSONA_FALLBACK;
}

export function stripFrontmatter(md: string): string {
  return md.startsWith("---") ? md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "") : md;
}

/** O que a pessoa contou ao abrir a conversa, e o que veio dos Estudos (se ela quis ligar). */
export interface PairSetup {
  /** O que quer construir ou aprender (ex. "uma API REST de tarefas em Java"). */
  goal: string;
  /** Linguagem/stack, se ela disse. */
  stack?: string;
  /** Sistema operacional (padrão Windows). */
  os?: string;
  /** Quem é: cargo de hoje, tempo de experiência, vaga que treina. */
  who?: string;
  /** O que ela já domina e o que está estudando (dos Estudos). */
  knows?: string[];
  learning?: string[];
  /** A trilha ligada dos Estudos, em texto (título, passos, repositório, últimos commits). */
  trail?: string;
  /** A pasta do projeto no computador, quando a IA pode ler para conferir. */
  folder?: string;
  /** Repositório do GitHub ("dono/repo"), quando há. */
  repo?: string;
}

export interface PairChatInput {
  persona: string;
  setup: PairSetup;
  /** O roteiro atual (títulos) e o passo em que estão. */
  plan: string[];
  step: number;
  /** Resumo das mensagens antigas (quando a conversa é longa). */
  summary?: string;
  /** As mensagens recentes. */
  messages: ChatMessage[];
}

export interface PairChatReply {
  /** A resposta, em Markdown (blocos de código com a linguagem). */
  reply: string;
  /** O roteiro inteiro (títulos curtos). Vazio = não mudou. */
  plan: string[];
  /** Índice (0 = o primeiro) do passo em que a conversa está agora. */
  step: number;
  /** A resposta termina esperando ele dizer "pode continuar". */
  waiting: boolean;
  /** Resumo atualizado da conversa inteira. */
  summary: string;
}

export const PAIR_FORMAT = `## Como responder (formato do app)

Você está dentro do app Pair Programming. Responda SEMPRE no JSON pedido:
- "reply": a sua mensagem, em Markdown. Código sempre em bloco com a linguagem (\`\`\`java, \`\`\`bash, \`\`\`powershell…), e na linha de cima do bloco o caminho do arquivo em negrito quando for um arquivo (ex. **src/main/java/com/exemplo/App.java**). A pessoa pode clicar numa linha do bloco para pedir "Explica essa linha", então mantenha um comando ou instrução por linha.
- "plan": o roteiro inteiro, em títulos curtos (até ~8 palavras cada, de 4 a 25 passos). Mande a lista completa quando criar o roteiro ou quando ele mudar; nas outras respostas, mande [].
- "step": o índice (começando em 0) do passo do roteiro em que vocês estão depois desta resposta. Só avance quando a pessoa disser que terminou ou que pode continuar. Antes de existir roteiro, 0.
- "waiting": true quando a resposta termina esperando ela fazer algo e dizer "pode continuar"; false em respostas a dúvidas que não pedem ação.
- "summary": o resumo atualizado da conversa inteira (o resumo anterior + o que aconteceu agora), em até 8 frases: o objetivo, o que já foi feito, decisões (stack, nomes, pastas), dúvidas que ela teve e onde pararam. Esse resumo substitui as mensagens antigas na próxima vez, então não deixe de fora nada que você precise lembrar.`;

export const PAIR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "plan", "step", "waiting", "summary"],
  properties: {
    reply: { type: "string" },
    plan: { type: "array", items: { type: "string" } },
    step: { type: "integer" },
    waiting: { type: "boolean" },
    summary: { type: "string" },
  },
} as const;

export const pairSystemPrompt = (persona: string) => `${persona.trim()}\n\n${PAIR_FORMAT}`;

export function setupText(s: PairSetup): string {
  const lines = [`- Objetivo: ${s.goal || "(ainda não disse)"}`];
  if (s.stack) lines.push(`- Stack: ${s.stack}`);
  lines.push(`- Sistema operacional: ${s.os || "Windows"}`);
  if (s.who) lines.push(`- Quem é: ${s.who}`);
  if (s.knows?.length) lines.push(`- Já domina (seja breve nisso): ${s.knows.join(", ")}`);
  if (s.learning?.length) lines.push(`- Está estudando: ${s.learning.join(", ")}`);
  if (s.repo) lines.push(`- Repositório no GitHub: https://github.com/${s.repo}`);
  if (s.folder) lines.push(`- Pasta do projeto no computador dela: ${s.folder} (você pode LER essa pasta para conferir o que ela fez; nunca altere nada)`);
  else lines.push("- Você não tem acesso à pasta do projeto: para conferir, peça a saída de um comando ou o conteúdo do arquivo.");
  return `## A pessoa e o projeto\n${lines.join("\n")}${s.trail ? `\n\n## Trilha ligada nos Estudos\n${s.trail}` : ""}`;
}

export function buildPairPrompt(i: PairChatInput): string {
  const plan = i.plan.length ? `## Roteiro atual (passo atual: ${Math.min(i.step, i.plan.length - 1) + 1} de ${i.plan.length})\n${i.plan.map((t, n) => `${n + 1}. ${t}${n === i.step ? "  ← estão aqui" : n < i.step ? " (feito)" : ""}`).join("\n")}` : "## Roteiro\nAinda não existe: monte quando souber o suficiente do objetivo.";
  const talk = i.messages
    .slice(-20)
    .map((m) => `${m.role === "user" ? "Ela" : "Você"}: ${m.text.slice(0, 6000)}`)
    .join("\n\n");
  return `${setupText(i.setup)}\n\n${plan}${i.summary ? `\n\n## Resumo do começo da conversa\n${i.summary}` : ""}\n\n## Conversa${i.summary ? " (mensagens recentes)" : " até agora"}\n${talk}\n\nResponda à última mensagem dela no formato JSON pedido.`;
}

export function normalizePair(raw: unknown, current: { plan: string[]; step: number }): PairChatReply {
  const r = (raw ?? {}) as Record<string, unknown>;
  const plan = Array.isArray(r.plan) ? r.plan.map((t) => String(t ?? "").trim().slice(0, 120)).filter(Boolean).slice(0, 40) : [];
  const total = (plan.length ? plan : current.plan).length;
  const step = Math.round(Number(r.step));
  return {
    reply: String(r.reply ?? "").trim().slice(0, 20000) || "Não consegui responder agora. Pode mandar de novo?",
    plan,
    step: Number.isFinite(step) ? Math.max(0, Math.min(step, Math.max(0, total - 1))) : current.step,
    waiting: r.waiting === true,
    summary: String(r.summary ?? "").trim().slice(0, 3000),
  };
}
