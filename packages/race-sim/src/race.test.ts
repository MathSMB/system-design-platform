import { describe, expect, it } from "vitest";
import { exploreAll, getScenario, runSchedule } from "./index";

const explore = (id: string) => exploreAll(getScenario(id)!);

describe("cenários de concorrência", () => {
  it("lost update: alguma intercalação vende o último ingresso duas vezes", () => {
    const r = explore("lost-update");
    expect(r.total).toBeGreaterThan(1);
    expect(r.violations).toBeGreaterThan(0);
    expect(r.example!.verdict.message).toContain("Overselling");
  });

  it("intercalação clássica do lost update: os dois leem antes de gravar", () => {
    const s = getScenario("lost-update")!;
    const run = runSchedule(s, [0, 1, 0, 0, 1, 1]);
    expect(run.db.log.length).toBe(2);
    expect(s.invariant(run.db).ok).toBe(false);
  });

  for (const id of ["atomic-update", "select-for-update", "optimistic", "write-skew-locked"]) {
    it(`${id}: nenhuma intercalação quebra a regra`, () => {
      const r = explore(id);
      expect(r.total).toBeGreaterThan(1);
      expect(r.violations).toBe(0);
      expect(r.deadlocks).toBe(0);
    });
  }

  it("write skew acontece mesmo com transações", () => {
    const r = explore("write-skew");
    expect(r.violations).toBeGreaterThan(0);
    expect(r.example!.verdict.message).toContain("Ninguém");
  });

  it("locks em ordem diferente podem dar deadlock", () => {
    const r = explore("deadlock");
    expect(r.deadlocks).toBeGreaterThan(0);
  });

  it("cache-aside pode deixar valor velho no cache", () => {
    const r = explore("cache-aside-stale");
    expect(r.violations).toBeGreaterThan(0);
    const s = getScenario("cache-aside-stale")!;
    // leitor: miss, lê 100 → escritor grava 120 e apaga → leitor grava 100 no cache
    const run = runSchedule(s, [0, 0, 1, 1, 0]);
    expect(s.invariant(run.db).ok).toBe(false);
  });

  it("no lock pessimista, o segundo comprador fica bloqueado", () => {
    const s = getScenario("select-for-update")!;
    const run = runSchedule(s, [0, 0, 1]); // A: BEGIN, FOR UPDATE; B: BEGIN
    expect(() => runSchedule(s, [0, 0, 1, 1])).toThrow(); // B não consegue travar
    expect(run.db.locks.estoque).toBe(0);
  });
});
