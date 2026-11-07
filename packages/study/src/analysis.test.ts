import { describe, expect, it } from "vitest";
import { canAutoAnalyze, cleanGithub, diffDigest, fromAi, mergeDays, type GithubLink } from "./index";

const sha = (n: number) => n.toString(16).padStart(40, "0");

describe("diffDigest", () => {
  const files = [
    { filename: "pnpm-lock.yaml", additions: 900, deletions: 10, patch: "x".repeat(5000) },
    { filename: "README.md", additions: 3, deletions: 0, patch: "+ docs" },
    { filename: "src/test/java/PedidoServiceTest.java", additions: 40, deletions: 0, patch: "+ @Test void cria()" },
    { filename: "src/main/java/PedidoService.java", additions: 60, deletions: 5, patch: "+ class PedidoService {}" },
    { filename: "dist/app.js", additions: 1, deletions: 1, patch: "+ min" },
    { filename: "docs/logo.png", additions: 0, deletions: 0 },
  ];
  it("tira lockfile, build e imagem e põe código, depois teste, depois docs", () => {
    const d = diffDigest(files);
    expect(d.files).toBe(3);
    expect(d.ignored).toBe(3);
    expect(d.text).not.toContain("pnpm-lock");
    const i = (s: string) => d.text.indexOf(s);
    expect(i("PedidoService.java")).toBeLessThan(i("PedidoServiceTest.java"));
    expect(i("PedidoServiceTest.java")).toBeLessThan(i("README.md"));
    expect(d.truncated).toBe(false);
  });
  it("o que não cabe vira só nome e +/-", () => {
    const big = [
      { filename: "src/A.java", additions: 500, deletions: 0, patch: "a".repeat(800) },
      { filename: "src/B.java", additions: 10, deletions: 0, patch: "b".repeat(800) },
    ];
    const d = diffDigest(big, 1000);
    expect(d.truncated).toBe(true);
    expect(d.text).toContain("a".repeat(800));
    expect(d.text).not.toContain("b".repeat(800));
    expect(d.text).toContain("--- src/B.java (modified, +10 -0)");
    expect(d.text.length).toBeLessThan(1300);
  });
});

describe("fromAi", () => {
  const meta = { at: "2026-11-07T12:00:00Z", fromSha: sha(1), toSha: sha(4), commits: 3, openIssues: [3, 4], skillNames: ["JPA", "Testes de integração"] };
  it("fica só com issues abertas e com nomes de habilidade da pesquisa", () => {
    const a = fromAi({ summary: "Cadastro de pedidos com testes.", relevant: true, readyIssues: [1, 3, 3, 99], skills: ["jpa", "Kubernetes", "testes de integração"], next: "Paginação" }, meta)!;
    expect(a.readyIssues).toEqual([3]);
    expect(a.skills).toEqual(["JPA", "Testes de integração"]);
    expect(a).toMatchObject({ relevant: true, commits: 3, toSha: sha(4), next: "Paginação" });
  });
  it("sem pesquisa da vaga, aceita os nomes que vierem", () => {
    expect(fromAi({ summary: "x", skills: ["Docker"] }, { ...meta, skillNames: [] })!.skills).toEqual(["Docker"]);
  });
  it("sem resumo não vale", () => {
    expect(fromAi({ relevant: true }, meta)).toBeNull();
  });
  it("relevant ausente conta como relevante (na dúvida, o dia conta)", () => {
    expect(fromAi({ summary: "x" }, meta)!.relevant).toBe(true);
  });
});

describe("análise automática", () => {
  const base = (extra: Partial<GithubLink> = {}) => cleanGithub({ repo: "a/b", lastSha: sha(5), analyzedSha: sha(2), ...extra })!;
  const now = new Date("2026-11-07T12:00:00Z");
  it("roda quando há commit novo e nada recente", () => {
    expect(canAutoAnalyze(base(), now)).toBe(true);
  });
  it("não roda sem commit novo", () => {
    expect(canAutoAnalyze(base({ analyzedSha: sha(5) }), now)).toBe(false);
  });
  it("espera 1 hora desde a última", () => {
    const g = base({ analyses: [{ at: "2026-11-07T11:30:00Z", toSha: sha(2), summary: "x" }] as any });
    expect(canAutoAnalyze(g, now)).toBe(false);
    expect(canAutoAnalyze(g, new Date("2026-11-07T12:31:00Z"))).toBe(true);
  });
  it("uma análise travada há mais de 10 min não bloqueia", () => {
    const running = base({ analysis: { state: "running", startedAt: "2026-11-07T11:55:00Z", error: null } });
    expect(canAutoAnalyze(running, now)).toBe(false);
    const stuck = base({ analysis: { state: "running", startedAt: "2026-11-07T10:00:00Z", error: null } });
    expect(canAutoAnalyze(stuck, now)).toBe(true);
  });
  it("junta os dias pendentes", () => {
    expect(mergeDays({ "2026-11-05": 1 }, { "2026-11-05": 2, "2026-11-06": 1 })).toEqual({ "2026-11-05": 3, "2026-11-06": 1 });
  });
  it("cleanGithub limpa os campos novos", () => {
    const g = cleanGithub({ repo: "a/b", pendingDays: { "2026-11-05": 2, ruim: 3, "2026-11-06": -1 }, analysis: { state: "error" } })!;
    expect(g.pendingDays).toEqual({ "2026-11-05": 2 });
    expect(g.analysis).toEqual({ state: "error", startedAt: null, error: "A análise falhou." });
    expect(g.analyses).toEqual([]);
  });
});
