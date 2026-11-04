import { describe, expect, it } from "vitest";
import {
  cleanAvailability,
  cleanProjects,
  cleanResearch,
  cleanScheduleItems,
  cleanTrail,
  gaps,
  itemKey,
  mergeSchedule,
  needsReplan,
  plannable,
  projectToTrail,
  readiness,
  replanStart,
  researchId,
  researchStale,
  scheduleDone,
  skillLevels,
  weekday,
  type Schedule,
} from "./index";

const today = "2026-11-04"; // quarta

describe("pesquisa da vaga", () => {
  it("limpa e ordena as habilidades pela frequência", () => {
    const r = cleanResearch(
      {
        summary: "ok",
        postingsAnalyzed: 25,
        skills: [{ name: "Docker", frequency: 40 }, { name: "Spring Boot", frequency: 96, must: true }, { name: "docker", frequency: 10 }, { name: "" }],
        band: [6000, 11000],
        sources: [{ label: "Gupy", url: "https://gupy.io/x" }, { url: "javascript:alert(1)" }],
      },
      { role: "Dev Java", level: "pleno", today },
    )!;
    expect(r.skills.map((s) => s.name)).toEqual(["Spring Boot", "Docker"]);
    expect(r.skills[0]!.must).toBe(true);
    expect(r.band).toEqual([6000, 11000]);
    expect(r.sources).toHaveLength(1);
    expect(cleanResearch({ skills: [] }, { role: "x", level: "pleno", today })).toBeNull();
  });

  it("id e validade de 6 meses", () => {
    expect(researchId("Desenvolvedor Java Sênior", "senior")).toBe("desenvolvedor-java-senior:senior");
    expect(researchStale("2026-01-01", today)).toBe(true);
    expect(researchStale("2026-10-01", today)).toBe(false);
  });
});

describe("trilhas", () => {
  it("pós com matérias, poucas vezes por semana e blocos curtos", () => {
    const t = cleanTrail({ kind: "pos", title: "Pós em Arquitetura", perWeek: 9, sessionMin: 5, units: ["Microsserviços", { title: "Cloud" }, ""] }, "t1")!;
    expect(t).toMatchObject({ id: "t1", kind: "pos", perWeek: 7, sessionMin: 10, importance: 2 });
    expect(t.units.map((u) => u.id)).toEqual(["u1", "u2"]);
    expect(cleanTrail({ title: "" })).toBeNull();
  });

  it("projeto escolhido vira trilha com as entregas", () => {
    const [p] = cleanProjects([{ title: "API de pagamentos", pitch: "x", skills: ["Kafka"], deliverables: ["API", "Fila"], weeks: 6 }, { title: "sem entregas" }]);
    const t = projectToTrail(p!, "tp");
    expect(t.kind).toBe("projeto");
    expect(t.units.map((u) => u.title)).toEqual(["API", "Fila"]);
  });
});

describe("cronograma", () => {
  const av = cleanAvailability({ minutes: [60, 60, 60, 60, 60, 0, 0], slack: 0.2 });
  const trail = cleanTrail({ title: "Livro DDIA", kind: "livro", units: ["Cap 1"] }, "t1")!;

  it("respeita o tempo livre do dia, já com a folga", () => {
    expect(weekday(today)).toBe(2);
    expect(plannable(av, today)).toBe(48);
    const items = cleanScheduleItems(
      [
        { day: today, title: "Cap 1", minutes: 30, trailId: "t1", unitId: "u1" },
        { day: today, title: "Não cabe", minutes: 25 },
        { day: today, title: "Cabe", minutes: 15, trailId: "zzz" },
        { day: "2026-11-07", title: "Sábado sem tempo", minutes: 10 },
        { day: "2026-12-30", title: "Fora do período", minutes: 10 },
      ],
      { from: today, until: "2026-11-17", trails: [trail], av, gen: "g1" },
    );
    expect(items.map((i) => i.title)).toEqual(["Cap 1", "Cabe"]);
    expect(items[0]).toMatchObject({ id: "g1-1", trailId: "t1", unitId: "u1" });
    expect(items[1]!.trailId).toBeNull();
  });

  it("replanejar não muda o passado nem o que você já marcou hoje", () => {
    const prev: Schedule = {
      createdAt: "2026-11-01",
      from: "2026-11-01",
      until: "2026-11-14",
      outline: [],
      notes: "",
      items: [
        { id: "a-1", day: "2026-11-03", title: "ontem", kind: "estudo", minutes: 20, trailId: null, unitId: null, skill: null, why: "" },
        { id: "a-2", day: today, title: "hoje", kind: "estudo", minutes: 20, trailId: null, unitId: null, skill: null, why: "" },
      ],
    };
    expect(replanStart(prev, today, {})).toBe(today);
    const checks = { [today]: [itemKey("a-2")] };
    const from = replanStart(prev, today, checks);
    expect(from).toBe("2026-11-05");
    const m = mergeSchedule(prev, { createdAt: today, from, until: "2026-11-18", outline: [], notes: "", items: [] });
    expect(m.items.map((i) => i.id)).toEqual(["a-1", "a-2"]);
    expect(m.from).toBe("2026-11-01");
    expect(scheduleDone(m, today, checks[today]!)).toBe(true);
    expect(scheduleDone(m, "2026-11-03", [])).toBe(false);
    expect(scheduleDone(m, "2026-11-10", [])).toBe(true); // descanso combinado
    expect(scheduleDone(m, "2026-12-01", [])).toBe(false);
    expect(needsReplan(m, today)).toBe(false);
    expect(needsReplan(m, "2026-11-08")).toBe(true); // domingo
  });
});

describe("pronto para a vaga", () => {
  const skills = [
    { name: "Spring", frequency: 90, category: "", must: true },
    { name: "Kafka", frequency: 50, category: "", must: false },
    { name: "Go", frequency: 10, category: "", must: false },
  ];
  it("pesa pela frequência e lista o que mais falta", () => {
    const lv = skillLevels(skills, { Spring: 2 }, ["kafka"]);
    expect(lv).toEqual({ Spring: 2, Kafka: 1, Go: 0 });
    expect(readiness(skills, lv)).toBe(Math.round((100 * (90 + 25)) / 150));
    expect(gaps(skills, lv).map((s) => s.name)).toEqual(["Kafka", "Go"]);
  });
});
