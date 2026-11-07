import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PRESETS, simulate } from "@sdp/sim-engine";
import { describe, expect, it } from "vitest";
import { ClaudeCodeProvider, buildAnswerPrompt, buildPrompt, normalizeAnswer, buildSessionPrompt, normalizeSession, normalizeEvaluation, parseClaudeOutput } from "./index";

const sample = {
  overallScore: 12,
  judges: [{ name: "A", perspective: "big tech", score: 7, strengths: ["x"], weaknesses: [] }],
  dimensions: [{ dimension: "Estimativas", score: -1, comment: "ok" }],
  consensus: "bom",
  followUpQuestions: ["E se o cache cair?"],
  nextSteps: ["Adicionar réplica"],
};

describe("avaliação por IA", () => {
  it("monta o prompt com desenho e simulação", () => {
    const graph = PRESETS.withCache!.graph;
    const simulation = simulate(graph, { durationSec: 5, seed: 1 });
    const p = buildPrompt({ problem: "Projete um feed", graph, simulation });
    expect(p).toContain("Redis");
    expect(p).toContain("p99");
    expect(p).toContain("cache → db");
  });

  it("normaliza notas para 0 a 10", () => {
    const e = normalizeEvaluation(sample);
    expect(e.overallScore).toBe(10);
    expect(e.dimensions[0]!.score).toBe(0);
  });

  it("lê structured_output ou o texto do resultado", () => {
    expect(parseClaudeOutput(JSON.stringify({ structured_output: sample })).consensus).toBe("bom");
    const fromText = parseClaudeOutput(JSON.stringify({ result: "```json\n" + JSON.stringify(sample) + "\n```" }));
    expect(fromText.followUpQuestions).toHaveLength(1);
    expect(() => parseClaudeOutput(JSON.stringify({ is_error: true, result: "sem login" }))).toThrow("sem login");
  });

  it("chama o Claude Code pela linha de comando, sem a chave de API no ambiente", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fake-claude-"));
    // roda o "claude" falso pelo próprio node, para funcionar também no Windows
    const script = join(dir, "fake-claude.mjs");
    writeFileSync(
      script,
      `let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const args = process.argv.slice(2);
  const ok = args.includes("-p") && args.includes("--json-schema") && input.includes("Problema") && !process.env.ANTHROPIC_API_KEY;
  process.stdout.write(JSON.stringify({ type: "result", is_error: !ok, result: ok ? "" : "args errados", structured_output: ${JSON.stringify(sample)} }));
});
`,
    );
    process.env.ANTHROPIC_API_KEY = "nao-deve-vazar";
    const e = await new ClaudeCodeProvider({ bin: process.execPath, binArgs: [script] }).evaluate({ problem: "Encurtador", graph: PRESETS.singleServer!.graph });
    delete process.env.ANTHROPIC_API_KEY;
    expect(e.judges[0]!.name).toBe("A");
  });

  it("monta o prompt de resposta de entrevista e normaliza o nível", () => {
    const p = buildAnswerPrompt({ stage: "Entrevista técnica · Java", target: "pleno", question: "O que é N+1?", expected: ["Causa: LAZY"], answer: "é quando...", spoken: true });
    expect(p).toContain("transcrição automática");
    expect(p).toContain("NÃO faça pergunta de aprofundamento");
    const p2 = buildAnswerPrompt({ stage: "RH", target: "pleno", question: "Fale de você", answer: "x", allowFollowUp: true, history: [{ who: "entrevistador", text: "Oi" }] });
    expect(p2).toContain("Entrevistador: Oi");
    expect(p2).toContain("Pode fazer uma pergunta");
    expect(p).toContain("- Causa: LAZY");
    const a = normalizeAnswer({ level: "mestre", score: 14, verdict: "ok", strengths: [], gaps: ["x"], covered: [], communication: "", betterAnswer: "" });
    expect(a.level).toBe("júnior");
    expect(a.score).toBe(10);
  });

  it("avalia resposta pelo Claude Code com o schema de resposta", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fake-claude-"));
    const script = join(dir, "fake-claude.mjs");
    const out = { level: "pleno", score: 8, verdict: "boa", strengths: ["mecanismo"], gaps: [], covered: ["Causa: LAZY"], communication: "clara", betterAnswer: "...", reply: "Boa.", followUp: "E com paginação?" };
    writeFileSync(
      script,
      `let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const args = process.argv.slice(2);
  const schema = args[args.indexOf("--json-schema") + 1] || "";
  const ok = schema.includes("betterAnswer") && input.includes("resposta do candidato");
  process.stdout.write(JSON.stringify({ type: "result", is_error: !ok, result: ok ? "" : "args errados", structured_output: ${JSON.stringify(out)} }));
});
`,
    );
    const a = await new ClaudeCodeProvider({ bin: process.execPath, binArgs: [script] }).evaluateAnswer({ stage: "Técnica", target: "pleno", question: "N+1?", answer: "lazy em loop" });
    expect(a.level).toBe("pleno");
    expect(a.covered).toEqual(["Causa: LAZY"]);
    expect(a.followUp).toBe("E com paginação?");
  });

  it("monta o feedback geral da sessão com as etapas e normaliza", () => {
    const p = buildSessionPrompt({
      title: "Processo seletivo · Tucano",
      target: "pleno",
      eliminatedAt: "Conversa com o RH",
      stages: [{ stage: "RH", result: "52%", items: [{ question: "Fale de você", answer: "sou dev", level: "júnior", score: 4, gaps: ["sem resultado"] }] }],
    });
    expect(p).toContain("## Etapa: RH (52%)");
    expect(p).toContain("eliminado em: Conversa com o RH");
    expect(p).toContain("Faltou: sem resultado");
    const f = normalizeSession({ level: "x", score: 12, byStage: [{ stage: "RH", level: "pleno", comment: "ok" }], studyPlan: ["JPA"] });
    expect(f.level).toBe("júnior");
    expect(f.score).toBe(10);
    expect(f.byStage[0]!.level).toBe("pleno");
    expect(f.howToSpeak).toEqual([]);
  });
});

describe("anexos no Claude Code", () => {
  it("lê a linha de resultado do stream-json e monta os blocos", async () => {
    const { lastResult, attachmentBlock, parseClaudeJson } = await import("./claude-code");
    const out = `{"type":"system"}\n{"type":"result","is_error":false,"structured_output":{"r":"ok"}}\n`;
    expect(parseClaudeJson(lastResult(out))).toEqual({ r: "ok" });
    expect(attachmentBlock({ name: "a.pdf", mime: "application/pdf", data: "x" }).type).toBe("document");
    expect(attachmentBlock({ name: "a.png", mime: "image/png", data: "x" }).type).toBe("image");
  });
});
