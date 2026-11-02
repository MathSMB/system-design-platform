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

  for (const [bug, fix] of [
    ["mensagem-duplicada", "mensagem-idempotente"],
    ["reserva-assento", "reserva-set-nx"],
    ["pix-duplo", "pix-versao"],
    ["therac-25", "therac-25-trava"],
  ] as const) {
    it(`${bug}: alguma ordem quebra; ${fix}: nenhuma quebra`, () => {
      const b = explore(bug);
      expect(b.violations).toBeGreaterThan(0);
      const f = explore(fix);
      expect(f.total).toBeGreaterThan(1);
      expect(f.violations).toBe(0);
      expect(f.deadlocks).toBe(0);
    });
  }

  it("mensagem duplicada: os dois conferem antes de marcar e creditam R$ 200", () => {
    const s = getScenario("mensagem-duplicada")!;
    const run = runSchedule(s, [0, 1, 0, 1, 0, 1]);
    expect(run.db.rows.saldo!.value).toBe(200);
  });

  it("Therac-25: configuração lê raio X, operador corrige, disparo sai em overdose", () => {
    const s = getScenario("therac-25")!;
    const run = runSchedule(s, [0, 0, 1, 1, 0]);
    expect(s.invariant(run.db).message).toContain("Overdose");
  });

  it("Pix com versão: o perdedor recomeça e não envia", () => {
    const s = getScenario("pix-versao")!;
    const run = runSchedule(s, [0, 1, 0, 1, 1, 1]);
    expect(run.txs[1]!.restarts).toBe(1);
    expect(run.db.rows.conta!.value).toBe(400);
  });
});

