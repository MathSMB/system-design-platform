import { AnthropicApiProvider } from "./anthropic-api";
import { ClaudeCodeProvider } from "./claude-code";
import type { AiProvider } from "./types";

export * from "./types";
export { ClaudeCodeProvider, parseClaudeOutput, parseClaudeJson } from "./claude-code";
export * from "./answer";
export * from "./session";
export * from "./study";
export * from "./pair";
export { AnthropicApiProvider } from "./anthropic-api";
export { buildPrompt, normalizeEvaluation, EVALUATION_SCHEMA, SYSTEM_PROMPT, DIMENSIONS } from "./rubric";

/** Escolhe o provedor pela variável AI_PROVIDER: "claude-code" (padrão, assinatura local) ou "api". */
export function createProvider(kind = process.env.AI_PROVIDER ?? "claude-code"): AiProvider {
  if (kind === "api") return new AnthropicApiProvider(process.env.ANTHROPIC_MODEL);
  return new ClaudeCodeProvider({ model: process.env.CLAUDE_CODE_MODEL });
}
