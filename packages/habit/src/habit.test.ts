import { describe, expect, it } from "vitest";
import { BURN_LEVEL, cleanHistory, withChange, GOALS, PARTS, addDays, cleanPlan, computeHabit, dayInBrazil, intensity, meets, planOf, planText, weekOf, type DayCounts, type Plan } from "./index";

const A = (answers: number, extra: Partial<DayCounts> = {}): DayCounts => ({ answers, stages: 0, processes: 0, designs: 0, ...extra });
const leve = planOf("leve");
const start = "2026-11-02"; // segunda

describe("metas", () => {
  it("modelos prontos", () => {
    expect(meets(leve, A(1))).toBe(true);
    expect(meets(planOf("regular"), A(2))).toBe(false);
    expect(meets(planOf("regular"), A(0, { stages: 1 }))).toBe(true);
    expect(meets(planOf("intensa"), A(10))).toBe(false);
    expect(meets(planOf("intensa"), A(0, { designs: 1 }))).toBe(true);
  });

  it("a sugerida pede o check manual e 1 resposta", () => {
    const p = planOf("sugerida");
    expect(meets(p, A(1))).toBe(false);
    expect(meets(p, A(0), ["estudo"])).toBe(false);
    expect(meets(p, A(1), ["estudo"])).toBe(true);
  });

  it("meta só manual, do seu jeito", () => {
    const p = cleanPlan({ mode: "all", items: [{ kind: "manual", text: "  1 hora de Spring  " }, { kind: "manual", text: "2 exercícios" }] })!;
    expect(p.items.map((i) => i.id)).toEqual(["i1", "i2"]);
    expect(planText(p)).toBe("1 hora de Spring + 2 exercícios");
    expect(meets(p, A(5), ["i1"])).toBe(false);
    expect(meets(p, A(0), ["i1", "i2"])).toBe(true);
  });

  it("limpa planos inválidos", () => {
    expect(cleanPlan({ items: [] })).toBeNull();
    expect(cleanPlan({ items: [{ kind: "manual", text: "" }] })).toBeNull();
    expect(cleanPlan({ items: [{ kind: "platform", metric: "answers", target: 99 }] })!.items[0]).toMatchObject({ target: 20 });
    expect(planOf("personalizada", null)).toEqual(GOALS[0]!.plan);
  });
});

describe("datas", () => {
  it("soma dias e acha a segunda-feira", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekOf("2026-11-03")).toBe("2026-11-02");
    expect(weekOf("2026-11-08")).toBe("2026-11-02");
    expect(dayInBrazil(new Date("2026-11-04T02:00:00Z"))).toBe("2026-11-03");
  });
});

const run = (pattern: string, plan: Plan = leve, failoversPerWeek = 2) => {
  const counts: Record<string, DayCounts> = {};
  [...pattern].forEach((c, i) => c === "d" && (counts[addDays(start, i)] = A(1)));
  return computeHabit({ start, today: addDays(start, pattern.length - 1), plan, counts, failoversPerWeek });
};

describe("placa-mãe", () => {
  it("cada dia cumprido instala uma peça; hoje sem meta não conta como perdido", () => {
    const h = run("ddd.");
    expect(h.days.map((d) => d.state)).toEqual(["install", "install", "install", "today"]);
    expect(h.days.map((d) => d.part)).toEqual(["cpu", "ram", "power", undefined]);
    expect(h.board).toEqual({ parts: 3, wear: 0, overclock: 0, reboots: 0 });
    expect(h.todayDone).toBe(false);
  });

  it("2 failovers por semana; o 3º dia perdido desgasta e zera a ofensiva", () => {
    const h = run("d...d");
    expect(h.days.map((d) => d.state)).toEqual(["install", "failover", "failover", "wear", "repair"]);
    expect(h.board.wear).toBe(0);
    expect(h.board.parts).toBe(1);
    expect(h.streak).toBe(1);
    expect(h.best).toBe(1);
    expect(h.failoversLeft).toBe(0);
  });

  it("conserta um nível por dia antes de instalar peça nova", () => {
    const h = run("dd....ddd");
    expect(h.days.slice(2).map((d) => d.state)).toEqual(["failover", "failover", "wear", "wear", "repair", "repair", "install"]);
    expect(h.board).toMatchObject({ parts: 3, wear: 0 });
  });

  it("no 6º nível a máquina queima e a placa recomeça vazia", () => {
    const h = run("ddddd" + ".".repeat(BURN_LEVEL) + "d", leve, 0);
    const burn = h.days.find((d) => d.state === "burn")!;
    expect(burn.level).toBe(BURN_LEVEL);
    expect(h.board).toEqual({ parts: 1, wear: 0, overclock: 0, reboots: 1 });
    expect(h.days[h.days.length - 1]!.part).toBe("cpu");
  });

  it("depois da última peça, cada dia vira overclock e os marcos contam pelo recorde", () => {
    const h = run("d".repeat(PARTS.length + 3));
    expect(h.board).toMatchObject({ parts: PARTS.length, overclock: 3 });
    expect(h.milestones[0]).toEqual({ days: 7, reached: true });
    expect(h.todayDone).toBe(true);
  });

  it("checks manuais por dia", () => {
    const p = planOf("sugerida");
    const h = computeHabit({ start, today: "2026-11-03", plan: p, counts: { "2026-11-02": A(1), "2026-11-03": A(1) }, checks: { "2026-11-02": ["estudo"] } });
    expect(h.days.map((d) => d.state)).toEqual(["install", "today"]);
    expect(h.todayChecks).toEqual([]);
  });
});

describe("troca de meta", () => {
  it("a meta antiga vale para os dias antes da troca", () => {
    const counts = { "2026-11-02": A(1), "2026-11-03": A(1) };
    const sug = planOf("sugerida");
    const sem = computeHabit({ start, today: "2026-11-04", plan: sug, counts });
    expect(sem.days.map((d) => d.state)).toEqual(["failover", "failover", "today"]);
    const com = computeHabit({ start, today: "2026-11-04", plan: sug, counts, history: withChange([], leve, "2026-11-04") });
    expect(com.days.map((d) => d.state)).toEqual(["install", "install", "today"]);
    expect(cleanHistory([{ until: "2026-11-04", plan: leve }, { until: "x", plan: leve }])).toHaveLength(1);
  });
});

describe("calendário", () => {
  it("intensidade", () => {
    expect(intensity(leve, A(0))).toBe(0);
    expect(intensity(planOf("regular"), A(1))).toBe(1);
    expect(intensity(leve, A(1))).toBe(2);
    expect(intensity(leve, A(3))).toBe(4);
  });
});
