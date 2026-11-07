import { describe, expect, it } from "vitest";
import { checkToken, cleanTrail, commitsByDay, countsAsWork, issuesToUnits, mergeCommits, newlyDone, parseRepo, toCommit, trailProgress, type ApiCommit, type ApiIssue } from "./index";

describe("parseRepo", () => {
  it("aceita dono/repo e links do GitHub", () => {
    expect(parseRepo("MathSMB/system-design-platform")).toBe("MathSMB/system-design-platform");
    expect(parseRepo("https://github.com/MathSMB/system-design-platform.git")).toBe("MathSMB/system-design-platform");
    expect(parseRepo("git@github.com:MathSMB/x.git")).toBe("MathSMB/x");
    expect(parseRepo("https://github.com/MathSMB/x/")).toBe("MathSMB/x");
  });
  it("recusa o resto", () => {
    expect(parseRepo("só-um-nome")).toBeNull();
    expect(parseRepo("a/b/c")).toBeNull();
    expect(parseRepo("https://gitlab.com/a/b")).toBeNull();
  });
});

describe("checkToken", () => {
  it("só aceita fine-grained", () => {
    expect(checkToken("github_pat_" + "a".repeat(40))).toEqual({ token: "github_pat_" + "a".repeat(40) });
    expect(checkToken("ghp_" + "a".repeat(36))).toHaveProperty("error");
    expect(checkToken("")).toHaveProperty("error");
    expect(checkToken("qualquer")).toHaveProperty("error");
  });
});

const commit = (sha: string, date: string, extra: Partial<ApiCommit> = {}): ApiCommit => ({
  sha,
  html_url: `https://github.com/a/b/commit/${sha}`,
  parents: [{}],
  commit: { message: `msg ${sha}\n\ncorpo`, author: { name: "Matheus", date } },
  author: { login: "MathSMB", type: "User" },
  ...extra,
});

describe("commits", () => {
  it("merges e robôs não contam", () => {
    expect(countsAsWork(commit("a1", "2026-11-05T10:00:00Z"))).toBe(true);
    expect(countsAsWork(commit("a2", "2026-11-05T10:00:00Z", { parents: [{}, {}] }))).toBe(false);
    expect(countsAsWork(commit("a3", "2026-11-05T10:00:00Z", { author: { login: "dependabot[bot]", type: "Bot" } }))).toBe(false);
  });
  it("pega só a primeira linha da mensagem", () => {
    expect(toCommit(commit("a1", "2026-11-05T10:00:00Z")).message).toBe("msg a1");
  });
  it("junta sem repetir, do mais novo ao mais velho", () => {
    const old = [toCommit(commit("aa", "2026-11-04T10:00:00Z"))];
    const fresh = [toCommit(commit("bb", "2026-11-06T10:00:00Z")), toCommit(commit("aa", "2026-11-04T10:00:00Z"))];
    expect(mergeCommits(old, fresh).map((c) => c.sha)).toEqual(["bb", "aa"]);
  });
  it("conta commits por dia no fuso dado", () => {
    const br = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(iso));
    // 01h UTC do dia 6 ainda é dia 5 em Brasília
    const cs = [commit("a", "2026-11-06T01:00:00Z"), commit("b", "2026-11-05T15:00:00Z"), commit("c", "2026-11-06T15:00:00Z")].map(toCommit);
    expect(commitsByDay(cs, br)).toEqual({ "2026-11-05": 2, "2026-11-06": 1 });
  });
});

const issue = (number: number, state: "open" | "closed", extra: Partial<ApiIssue> = {}): ApiIssue => ({
  number,
  title: `Passo ${number}`,
  state,
  html_url: `https://github.com/a/b/issues/${number}`,
  closed_at: state === "closed" ? "2026-11-05T12:00:00Z" : null,
  ...extra,
});

describe("issues como passos", () => {
  it("aberta = a fazer, fechada = feito; PR e not planned ficam de fora", () => {
    const units = issuesToUnits([issue(3, "closed"), issue(1, "open"), issue(2, "open", { pull_request: {} }), issue(4, "closed", { state_reason: "not_planned" })], []);
    expect(units.map((u) => [u.issue, u.done])).toEqual([
      [1, false],
      [3, true],
    ]);
    expect(units[0]!.title).toBe("#1 Passo 1");
    expect(units[1]!.doneAt).toBe("2026-11-05T12:00:00Z");
  });
  it("mantém o id do passo que já existia para a mesma issue", () => {
    const before = issuesToUnits([issue(1, "open"), issue(2, "open")], []);
    const after = issuesToUnits([issue(5, "open"), issue(2, "closed"), issue(1, "open")], before);
    expect(after.find((u) => u.issue === 2)!.id).toBe(before.find((u) => u.issue === 2)!.id);
    expect(new Set(after.map((u) => u.id)).size).toBe(3);
  });
  it("filtra por label", () => {
    const units = issuesToUnits([issue(1, "open", { labels: [{ name: "Estudo" }] }), issue(2, "open", { labels: ["bug"] })], [], "estudo");
    expect(units.map((u) => u.issue)).toEqual([1]);
  });
  it("acha os passos que acabaram de fechar", () => {
    const before = issuesToUnits([issue(1, "open"), issue(2, "closed")], []);
    const after = issuesToUnits([issue(1, "closed"), issue(2, "closed"), issue(3, "closed")], before);
    // a 3 é nova: já chegou fechada, não conta como "acabou de fechar"
    expect(newlyDone(before, after).map((u) => u.issue)).toEqual([1]);
  });
  it("a barra de progresso usa as issues", () => {
    const t = cleanTrail({ kind: "projeto", title: "API", units: issuesToUnits([issue(1, "closed"), issue(2, "open"), issue(3, "open"), issue(4, "closed")], []) })!;
    expect(trailProgress(t)).toEqual({ done: 2, total: 4, pct: 50 });
  });
});

describe("cleanTrail com GitHub", () => {
  it("guarda o repositório só em projeto e preserva a issue do passo", () => {
    const github = { repo: "a/b", branch: "main", lastSha: "f".repeat(40), checkedAt: "2026-11-05T10:00:00Z", commits: [], label: "" };
    const t = cleanTrail({ kind: "projeto", title: "API", github, units: [{ id: "u1", title: "#1 x", done: true, issue: 1, url: "https://github.com/a/b/issues/1" }] })!;
    expect(t.github).toMatchObject(github);
    expect(t.units[0]).toMatchObject({ issue: 1, url: "https://github.com/a/b/issues/1" });
    expect(cleanTrail({ kind: "livro", title: "DDD", github })!.github).toBeUndefined();
    expect(cleanTrail({ kind: "projeto", title: "API", github: { repo: "inválido" } })!.github).toBeUndefined();
  });
});
