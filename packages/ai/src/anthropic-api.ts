import { CHAT_SCHEMA, CHAT_SYSTEM_PROMPT, PROJECTS_SCHEMA, PROJECTS_SYSTEM_PROMPT, RESEARCH_SCHEMA, RESEARCH_SYSTEM_PROMPT, SCHEDULE_SCHEMA, SCHEDULE_SYSTEM_PROMPT, buildChatPrompt, buildProjectsPrompt, buildResearchPrompt, buildSchedulePrompt, normalizeChat, normalizeSchedule, type ResearchInput, type ScheduleDraft, type ScheduleInput, type StudyChatInput, type StudyChatReply, type StudyContext } from "./study";
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


  researchRole(input: ResearchInput): Promise<unknown> {
    return this.json(RESEARCH_SYSTEM_PROMPT, RESEARCH_SCHEMA, buildResearchPrompt(input), { web: true, timeoutMs: 20 * 60_000 });
  }

  async studyChat(input: StudyChatInput): Promise<StudyChatReply> {
    return normalizeChat(await this.json(CHAT_SYSTEM_PROMPT, CHAT_SCHEMA, buildChatPrompt(input), { web: true, timeoutMs: 5 * 60_000 }));
  }

  async proposeProjects(input: StudyContext): Promise<unknown> {
    return ((await this.json(PROJECTS_SYSTEM_PROMPT, PROJECTS_SCHEMA, buildProjectsPrompt(input))) as { projects?: unknown })?.projects;
  }

  async planSchedule(input: ScheduleInput): Promise<ScheduleDraft> {
    return normalizeSchedule(await this.json(SCHEDULE_SYSTEM_PROMPT, SCHEDULE_SCHEMA, buildSchedulePrompt(input), { timeoutMs: 6 * 60_000 }));
  }

  private async json(system: string, schema: object, prompt: string, o: { web?: boolean; timeoutMs?: number } = {}): Promise<unknown> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 16000,
      system,
      ...(o.web ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 20 }] as any } : {}),
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
