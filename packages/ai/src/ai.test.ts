import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PRESETS, simulate } from "@sdp/sim-engine";
import { describe, expect, it } from "vitest";
import { ClaudeCodeProvider, buildPrompt, normalizeEvaluation, parseClaudeOutput } from "./index";

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
    const bin = join(dir, "claude");
    writeFileSync(
      bin,
      `#!/usr/bin/env node
let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const args = process.argv.slice(2);
  const ok = args.includes("-p") && args.includes("--json-schema") && input.includes("Problema") && !process.env.ANTHROPIC_API_KEY;
  process.stdout.write(JSON.stringify({ type: "result", is_error: !ok, result: ok ? "" : "args errados", structured_output: ${JSON.stringify(sample)} }));
});
`,
    );
    chmodSync(bin, 0o755);
    process.env.ANTHROPIC_API_KEY = "nao-deve-vazar";
    const e = await new ClaudeCodeProvider({ bin }).evaluate({ problem: "Encurtador", graph: PRESETS.singleServer!.graph });
    delete process.env.ANTHROPIC_API_KEY;
    expect(e.judges[0]!.name).toBe("A");
  });
});
