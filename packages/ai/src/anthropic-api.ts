import Anthropic from "@anthropic-ai/sdk";
import { ANSWER_SCHEMA, ANSWER_SYSTEM_PROMPT, buildAnswerPrompt, normalizeAnswer, type AnswerEvaluation, type AnswerInput } from "./answer";
import { EVALUATION_SCHEMA, SYSTEM_PROMPT, buildPrompt, extractJson, normalizeEvaluation } from "./rubric";
import { SESSION_SCHEMA, SESSION_SYSTEM_PROMPT, buildSessionPrompt, normalizeSession, type SessionFeedback, type SessionInput } from "./session";
import type { AiProvider, Evaluation, EvaluationInput } from "./types";

/**
 * Usa a API da Anthropic (chave em ANTHROPIC_API_KEY). Necessário se o app for
 * publicado para outras pessoas.
 */
export class AnthropicApiProvider implements AiProvider {
  readonly name = "anthropic-api";
  private client: Anthropic;

  constructor(private model = "claude-opus-5-5") {
    this.client = new Anthropic();
  }

  async evaluate(input: EvaluationInput): Promise<Evaluation> {
    return normalizeEvaluation(await this.json(SYSTEM_PROMPT, EVALUATION_SCHEMA, buildPrompt(input)));
  }

  async evaluateAnswer(input: AnswerInput): Promise<AnswerEvaluation> {
    return normalizeAnswer(await this.json(ANSWER_SYSTEM_PROMPT, ANSWER_SCHEMA, buildAnswerPrompt(input)));
  }

  async evaluateSession(input: SessionInput): Promise<SessionFeedback> {
    return normalizeSession(await this.json(SESSION_SYSTEM_PROMPT, SESSION_SCHEMA, buildSessionPrompt(input)));
  }

  private async json(system: string, schema: object, prompt: string): Promise<unknown> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: schema as unknown as Record<string, unknown> },
      },
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") throw new Error("O modelo recusou avaliar este conteúdo.");
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return extractJson(text);
  }
}
