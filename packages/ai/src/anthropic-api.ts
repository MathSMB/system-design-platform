import Anthropic from "@anthropic-ai/sdk";
import { EVALUATION_SCHEMA, SYSTEM_PROMPT, buildPrompt, extractJson, normalizeEvaluation } from "./rubric";
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
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: EVALUATION_SCHEMA as unknown as Record<string, unknown> },
      },
      messages: [{ role: "user", content: buildPrompt(input) }],
    });
    if (response.stop_reason === "refusal") throw new Error("O modelo recusou avaliar este conteúdo.");
    const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    return normalizeEvaluation(extractJson(text));
  }
}
