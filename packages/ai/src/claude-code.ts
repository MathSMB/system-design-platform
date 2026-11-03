import { spawn } from "node:child_process";
import { ANSWER_SCHEMA, ANSWER_SYSTEM_PROMPT, buildAnswerPrompt, normalizeAnswer, type AnswerEvaluation, type AnswerInput } from "./answer";
import { EVALUATION_SCHEMA, SYSTEM_PROMPT, buildPrompt, extractJson, normalizeEvaluation } from "./rubric";
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

  /** Roda `claude -p` com saída JSON validada pelo schema. */
  private async json(system: string, schema: object, prompt: string): Promise<unknown> {
    const args = [
      ...(this.opts.binArgs ?? []),
      "-p",
      "--output-format",
      "json",
      "--json-schema",
      JSON.stringify(schema),
      "--system-prompt",
      system,
      "--tools",
      "",
      "--no-session-persistence",
    ];
    if (this.opts.model) args.push("--model", this.opts.model);

    const stdout = await run(this.opts.bin ?? process.env.CLAUDE_BIN ?? "claude", args, prompt, this.opts.timeoutMs ?? 180_000);
    return parseClaudeJson(stdout);
  }
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
