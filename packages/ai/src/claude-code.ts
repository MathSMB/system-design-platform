import { ANALYSIS_SCHEMA, ANALYSIS_SYSTEM_PROMPT, buildAnalysisPrompt, type ProjectAnalysisInput, CHAT_SCHEMA, CHAT_SYSTEM_PROMPT, PROJECTS_SCHEMA, PROJECTS_SYSTEM_PROMPT, RESEARCH_SCHEMA, RESEARCH_SYSTEM_PROMPT, SCHEDULE_SCHEMA, SCHEDULE_SYSTEM_PROMPT, buildChatPrompt, buildProjectsPrompt, buildResearchPrompt, buildSchedulePrompt, normalizeChat, normalizeSchedule, type ResearchInput, type ScheduleDraft, type ScheduleInput, type StudyChatInput, type StudyChatReply, type StudyContext, type ChatAttachment } from "./study";
import { spawn } from "node:child_process";
import { ANSWER_SCHEMA, ANSWER_SYSTEM_PROMPT, buildAnswerPrompt, normalizeAnswer, type AnswerEvaluation, type AnswerInput } from "./answer";
import { EVALUATION_SCHEMA, SYSTEM_PROMPT, buildPrompt, extractJson, normalizeEvaluation } from "./rubric";
import { SESSION_SCHEMA, SESSION_SYSTEM_PROMPT, buildSessionPrompt, normalizeSession, type SessionFeedback, type SessionInput } from "./session";
import type { AiProvider, Evaluation, EvaluationInput } from "./types";

export interface ClaudeCodeOptions {
  /** Caminho do executável. Padrão: "claude" (ou a variável CLAUDE_BIN). */
  bin?: string;
  /** Argumentos antes dos do Claude Code (ex.: o script, quando bin é o node). */
  binArgs?: string[];
  /** Modelo, ex. "opus" ou "sonnet". Padrão: o do Claude Code. */
  model?: string;
  timeoutMs?: number;
}

/**
 * Usa o Claude Code instalado na máquina, logado com a assinatura (Pro/Max).
 *
 * Só serve para uso pessoal e local: a assinatura não pode alimentar um app
 * publicado para outras pessoas. Para isso, use o AnthropicApiProvider.
 */
export class ClaudeCodeProvider implements AiProvider {
  readonly name = "claude-code";
  constructor(private opts: ClaudeCodeOptions = {}) {}

  async evaluate(input: EvaluationInput): Promise<Evaluation> {
    return normalizeEvaluation(await this.json(SYSTEM_PROMPT, EVALUATION_SCHEMA, buildPrompt(input)));
  }

  async evaluateAnswer(input: AnswerInput): Promise<AnswerEvaluation> {
    return normalizeAnswer(await this.json(ANSWER_SYSTEM_PROMPT, ANSWER_SCHEMA, buildAnswerPrompt(input)));
  }

  async evaluateSession(input: SessionInput): Promise<SessionFeedback> {
    return normalizeSession(await this.json(SESSION_SYSTEM_PROMPT, SESSION_SCHEMA, buildSessionPrompt(input)));
  }


  researchRole(input: ResearchInput): Promise<unknown> {
    return this.json(RESEARCH_SYSTEM_PROMPT, RESEARCH_SCHEMA, buildResearchPrompt(input), { web: true, timeoutMs: 20 * 60_000 });
  }

  async studyChat(input: StudyChatInput): Promise<StudyChatReply> {
    return normalizeChat(await this.json(CHAT_SYSTEM_PROMPT, CHAT_SCHEMA, buildChatPrompt(input), { web: true, timeoutMs: 5 * 60_000, attachments: input.attachments }));
  }

  async proposeProjects(input: StudyContext): Promise<unknown> {
    return ((await this.json(PROJECTS_SYSTEM_PROMPT, PROJECTS_SCHEMA, buildProjectsPrompt(input))) as { projects?: unknown })?.projects;
  }

  async analyzeProject(input: ProjectAnalysisInput): Promise<unknown> {
    return this.json(ANALYSIS_SYSTEM_PROMPT, ANALYSIS_SCHEMA, buildAnalysisPrompt(input), { timeoutMs: 4 * 60_000 });
  }

  async planSchedule(input: ScheduleInput): Promise<ScheduleDraft> {
    return normalizeSchedule(await this.json(SCHEDULE_SYSTEM_PROMPT, SCHEDULE_SCHEMA, buildSchedulePrompt(input), { timeoutMs: 6 * 60_000 }));
  }

  /**
   * Roda `claude -p` com saída JSON validada pelo schema. Com web, libera só a busca e a leitura de páginas.
   * Com anexos, a mensagem vai em stream-json com os blocos de imagem/PDF em base64: a IA vê o arquivo
   * sem ganhar acesso a nenhuma pasta do computador.
   */
  private async json(system: string, schema: object, prompt: string, o: { web?: boolean; timeoutMs?: number; attachments?: ChatAttachment[] } = {}): Promise<unknown> {
    const files = o.attachments?.length ? o.attachments : null;
    const args = [
      ...(this.opts.binArgs ?? []),
      "-p",
      ...(files ? ["--input-format", "stream-json", "--output-format", "stream-json", "--verbose"] : ["--output-format", "json"]),
      "--json-schema",
      JSON.stringify(schema),
      "--system-prompt",
      system,
      ...(o.web ? ["--tools", "WebSearch,WebFetch", "--allowedTools", "WebSearch,WebFetch"] : ["--tools", ""]),
      "--no-session-persistence",
    ];
    if (this.opts.model) args.push("--model", this.opts.model);

    const stdin = files ? `${JSON.stringify({ type: "user", message: { role: "user", content: [{ type: "text", text: prompt }, ...files.map(attachmentBlock)] } })}\n` : prompt;
    const stdout = await run(this.opts.bin ?? process.env.CLAUDE_BIN ?? "claude", args, stdin, Math.max(this.opts.timeoutMs ?? 180_000, o.timeoutMs ?? 0));
    return parseClaudeJson(files ? lastResult(stdout) : stdout);
  }
}

/** Bloco de conteúdo da mensagem (formato da API) para uma imagem ou um PDF. */
export function attachmentBlock(a: ChatAttachment) {
  return a.mime === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: a.mime, data: a.data }, title: a.name }
    : { type: "image", source: { type: "base64", media_type: a.mime, data: a.data } };
}

/** No stream-json, cada linha é um evento; o resultado final é a linha "result". */
export function lastResult(stdout: string): string {
  const lines = stdout.split("\n").filter((l) => l.includes('"type":"result"'));
  if (!lines.length) throw new Error(`Saída inesperada do Claude Code: ${stdout.slice(-300)}`);
  return lines[lines.length - 1]!;
}

export function parseClaudeOutput(stdout: string): Evaluation {
  return normalizeEvaluation(parseClaudeJson(stdout));
}

/** Lê o envelope JSON do `claude -p` e devolve o objeto estruturado. */
export function parseClaudeJson(stdout: string): unknown {
  let envelope: Record<string, unknown>;
  try {
    envelope = JSON.parse(stdout);
  } catch {
    throw new Error(`Saída inesperada do Claude Code: ${stdout.slice(0, 300)}`);
  }
  if (envelope.is_error) {
    throw new Error(`Claude Code retornou erro: ${String(envelope.result ?? envelope.subtype ?? "desconhecido")}`);
  }
  if (envelope.structured_output) return envelope.structured_output;
  return extractJson(String(envelope.result ?? ""));
}

function run(bin: string, args: string[], stdin: string, timeoutMs: number): Promise<string> {
  // Sem ANTHROPIC_API_KEY no ambiente, o Claude Code usa o login da assinatura.
  const env = { ...process.env };
  delete env.ANTHROPIC_API_KEY;

  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { env, stdio: ["pipe", "pipe", "pipe"] });
    let out = "";
    let err = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Claude Code não respondeu em ${Math.round(timeoutMs / 1000)}s.`));
    }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      reject(
        e.code === "ENOENT"
          ? new Error("Claude Code não encontrado. Instale (npm i -g @anthropic-ai/claude-code) e rode `claude` uma vez para fazer login.")
          : e,
      );
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0 || out.trim().startsWith("{")) resolve(out);
      else reject(new Error(`Claude Code saiu com código ${code}: ${err.slice(0, 500)}`));
    });
    child.stdin.end(stdin);
  });
}
