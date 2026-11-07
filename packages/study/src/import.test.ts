import { describe, expect, it } from "vitest";
import { canAutoAnalyze, cleanGithub, cleanTrail, importedTrail, repoTitle, skillsOf } from "./index";

const meta = { full_name: "MathSMB/contatos-api", name: "contatos-api", description: "API de contatos em Spring", default_branch: "main", topics: ["spring-boot", "java"] };

describe("projeto que você já tinha", () => {
  it("nome do repositório vira título", () => {
    expect(repoTitle("contatos-api")).toBe("Contatos api");
    expect(repoTitle("my_cool.app")).toBe("My cool app");
  });
  it("habilidades vêm das linguagens (≥ 5%) e dos tópicos, sem repetir", () => {
    expect(skillsOf({ Java: 9000, HTML: 300, Dockerfile: 700 }, ["spring-boot", "java"])).toEqual(["Java", "Docker", "spring boot"]);
    expect(skillsOf({})).toEqual([]);
  });
  it("com link: pega nome, descrição e habilidades do GitHub e desliga a IA automática", () => {
    const t = cleanTrail(importedTrail({}, { meta, languages: { Java: 10 } }))!;
    expect(t).toMatchObject({ kind: "projeto", title: "Contatos api", why: "API de contatos em Spring", skills: ["Java", "spring boot"] });
    expect(t.github).toMatchObject({ repo: "MathSMB/contatos-api", branch: "main", autoAi: false });
  });
  it("o que você digitou vale mais que o GitHub", () => {
    const t = cleanTrail(importedTrail({ title: "Contatos", skills: ["Spring Boot"], units: ["Deploy"], importance: 3 }, { meta, languages: { Java: 10 } }))!;
    expect(t).toMatchObject({ title: "Contatos", skills: ["Spring Boot"], importance: 3 });
    expect(t.units.map((u) => u.title)).toEqual(["Deploy"]);
  });
  it("sem link: projeto à mão, sem GitHub", () => {
    const t = cleanTrail(importedTrail({ title: "App de tarefas", units: ["Login", "CRUD"] }))!;
    expect(t.github).toBeUndefined();
    expect(t.units).toHaveLength(2);
  });
  it("sem a chave autoAi (projetos ligados antes) a IA continua automática", () => {
    expect(cleanGithub({ repo: "a/b" })!.autoAi).toBe(true);
    const g = cleanGithub({ repo: "a/b", lastSha: "a".repeat(40), analyzedSha: "b".repeat(40), autoAi: false })!;
    expect(canAutoAnalyze(g, new Date())).toBe(false);
    expect(canAutoAnalyze({ ...g, autoAi: true }, new Date())).toBe(true);
  });
});
