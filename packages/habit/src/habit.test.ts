import { describe, expect, it } from "vitest";
import { addDays, computeHabit, dayInBrazil, intensity, meets, weekOf, type DayCounts } from "./index";

const A = (answers: number, extra: Partial<DayCounts> = {}): DayCounts => ({ answers, stages: 0, processes: 0, designs: 0, ...extra });

describe("metas", () => {
  it("leve, regular e intensa", () => {
    expect(meets("leve", A(1))).toBe(true);
    expect(meets("regular", A(2))).toBe(false);
    expect(meets("regular", A(0, { stages: 1 }))).toBe(true);
    expect(meets("intensa", A(10))).toBe(false);
    expect(meets("intensa", A(0, { designs: 1 }))).toBe(true);
    expect(meets("leve", A(1), 2)).toBe(false);
  });
});

describe("datas", () => {
  it("soma dias e acha a segunda-feira", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekOf("2026-11-03")).toBe("2026-11-02"); // terça → segunda
    expect(weekOf("2026-11-08")).toBe("2026-11-02"); // domingo → segunda anterior
    expect(dayInBrazil(new Date("2026-11-04T02:00:00Z"))).toBe("2026-11-03"); // 23h em SP
  });
});

describe("ofensiva", () => {
  const start = "2026-11-02"; // segunda
  it("7 dias seguidos viram cluster", () => {
    const counts = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [addDays(start, i), A(1)]));
    const h = computeHabit({ start, today: "2026-11-08", goal: "leve", counts });
    expect(h.streak).toBe(7);
    expect(h.tier.title).toBe("Cluster");
    expect(h.milestones[0]).toEqual({ days: 7, reached: true });
    expect(h.todayDone).toBe(true);
  });

  it("2 failovers por semana seguram a ofensiva; o 3º dia perdido zera se não recuperar", () => {
    const counts = { "2026-11-02": A(1), "2026-11-06": A(1), "2026-11-07": A(1) };
    // perde 03, 04 (failovers) e 05 (sem failover); 06 só faz a meta simples → 05 cai
    const h = computeHabit({ start, today: "2026-11-07", goal: "leve", counts });
    expect(h.days.map((d) => d.state)).toEqual(["done", "failover", "failover", "down", "done", "done"]);
    expect(h.streak).toBe(2);
    expect(h.best).toBe(2);
    expect(h.failoversLeft).toBe(0);
  });

  it("meta em dobro no dia seguinte recupera o dia perdido", () => {
    const counts = { "2026-11-02": A(1), "2026-11-06": A(2) };
    const h = computeHabit({ start, today: "2026-11-06", goal: "leve", counts });
    expect(h.days.map((d) => d.state)).toEqual(["done", "failover", "failover", "recovered", "done"]);
    expect(h.streak).toBe(2);
    expect(h.online).toBe(3);
  });

  it("ontem em risco: hoje ainda dá para recuperar, e a ofensiva não zera antes", () => {
    const counts = { "2026-11-02": A(1) };
    const h = computeHabit({ start, today: "2026-11-06", goal: "leve", counts });
    expect(h.days.map((d) => d.state)).toEqual(["done", "failover", "failover", "risk", "today"]);
    expect(h.recoverToday).toBe(true);
    expect(h.streak).toBe(1);
  });

  it("failovers voltam na semana nova", () => {
    const h = computeHabit({ start, today: "2026-11-09", goal: "leve", counts: {} });
    expect(h.failoversLeft).toBe(2);
  });
});

it("intensidade do calendário", () => {
  expect(intensity("leve", A(0))).toBe(0);
  expect(intensity("regular", A(1))).toBe(1);
  expect(intensity("regular", A(3))).toBe(2);
  expect(intensity("leve", A(3))).toBe(4);
});
