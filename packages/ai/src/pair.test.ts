import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ClaudeCodeProvider, PAIR_PERSONA_FALLBACK, buildPairPrompt, loadPairPersona, normalizePair, pairSystemPrompt, stripFrontmatter } from "./index";

const base = { persona: "mentor", setup: { goal: "API de tarefas em Java" }, plan: [] as string[], step: 0, messages: [{ role: "user" as const, text: "Quero criar uma API" }] };

describe("pair programming", () => {
  it("lê a persona da skill do repo, sem o cabeçalho", () => {
    const p = loadPairPersona(__dirname);
    expect(p).toContain("pode continuar");
    expect(p).not.toMatch(/^---/);
    expect(p).not.toContain("description:");
    expect(stripFrontmatter("---\nname: x\n---\ncorpo")).toBe("corpo");
  });

  it("sem a skill, usa o essencial dela", () => {
    expect(loadPairPersona(tmpdir())).toBe(PAIR_PERSONA_FALLBACK);
  });

  it("o prompt leva o objetivo, o roteiro com o passo atual e só o que precisa", () => {
    const p = buildPairPrompt({
      ...base,
      setup: { goal: "API de tarefas", stack: "Java + Spring", knows: ["Git"], folder: "C:\\projetos\\tarefas", trail: "Projeto: API de tarefas" },
      plan: ["Instalar o IntelliJ", "Instalar o JDK", "Criar o projeto"],
      step: 1,
      summary: "Ela já instalou o IntelliJ.",
    });
    expect(p).toContain("Objetivo: API de tarefas");
    expect(p).toContain("Sistema operacional: Windows");
    expect(p).toContain("Já domina (seja breve nisso): Git");
    expect(p).toContain("2. Instalar o JDK  ← estão aqui");
    expect(p).toContain("1. Instalar o IntelliJ (feito)");
    expect(p).toContain("Resumo do começo da conversa");
    expect(p).toContain("C:\\projetos\\tarefas");
    expect(p).toContain("Trilha ligada nos Estudos");
    // sem pasta: pede a saída dos comandos
    expect(buildPairPrompt(base)).toContain("Você não tem acesso à pasta");
  });

  it("o sistema junta a persona com o formato do app", () => {
    const s = pairSystemPrompt("PERSONA");
    expect(s.startsWith("PERSONA")).toBe(true);
    expect(s).toContain('"waiting"');
  });

  it("normaliza a resposta: passo dentro do roteiro e roteiro vazio mantém o atual", () => {
    const r = normalizePair({ reply: "Oi", plan: ["a", " ", "b"], step: 9, waiting: true, summary: "s" }, { plan: [], step: 0 });
    expect(r.plan).toEqual(["a", "b"]);
    expect(r.step).toBe(1);
    expect(r.waiting).toBe(true);
    const keep = normalizePair({ reply: "", plan: [], step: 2 }, { plan: ["a", "b", "c", "d"], step: 1 });
    expect(keep.step).toBe(2);
    expect(keep.reply).toContain("Não consegui");
    expect(normalizePair({ reply: "x", step: "?" }, { plan: ["a", "b"], step: 1 }).step).toBe(1);
  });

  it("com a pasta do projeto, libera só leitura (arquivos e git status/log/diff)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fake-claude-"));
    const script = join(dir, "fake-claude.mjs");
    writeFileSync(
      script,
      `let input = "";
process.stdin.on("data", (d) => (input += d));
process.stdin.on("end", () => {
  const a = process.argv.slice(2);
  const tools = a[a.indexOf("--tools") + 1];
  const allowed = a[a.indexOf("--allowedTools") + 1];
  const dirArg = a.includes("--add-dir") ? a[a.indexOf("--add-dir") + 1] : "";
  const sys = a[a.indexOf("--system-prompt") + 1];
  process.stdout.write(JSON.stringify({ type: "result", structured_output: { reply: JSON.stringify({ tools, allowed, dirArg, cwd: process.cwd(), persona: sys.startsWith("mentor") }), plan: ["Instalar"], step: 0, waiting: true, summary: "r" } }));
});
`,
    );
    const ai = new ClaudeCodeProvider({ bin: process.execPath, binArgs: [script] });
    const withDir = JSON.parse((await ai.pairChat({ ...base, setup: { goal: "x", folder: dir } })).reply);
    expect(withDir.tools).toBe("Read,Glob,Grep,Bash,WebSearch,WebFetch");
    expect(withDir.allowed).toContain("Bash(git status:*)");
    expect(withDir.allowed).not.toMatch(/(^|,)Bash(,|$)/);
    expect(withDir.dirArg).toBe(dir);
    expect(withDir.cwd).toContain("fake-claude-");
    expect(withDir.persona).toBe(true);
    // pasta que não existe: segue sem acesso
    const none = JSON.parse((await ai.pairChat({ ...base, setup: { goal: "x", folder: join(dir, "nao-existe") } })).reply);
    expect(none.tools).toBe("WebSearch,WebFetch");
    expect(none.dirArg).toBe("");
  });
});
