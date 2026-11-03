import { describe, expect, it } from "vitest";
import {
  BLOCKS,
  COMPANIES,
  JAVA_PLENO,
  REVIEWS,
  STAGES,
  TAKEHOME,
  BEHAVIORAL,
  SOFT_WARMUP,
  DOWNLEVEL,
  GHOSTING,
  cltVsPj,
  counterOffer,
  drawInterview,
  estimateLevel,
  makeOffer,
  rhQuestions,
  scoreReview,
  triagemForm,
  type AskStep,
} from "./index";

const onePleno = (s: AskStep) => s.options.filter((o) => o.level === "pleno").length;

describe("banco de perguntas Java Pleno", () => {
  it("tem 40 perguntas com ids únicos, distribuídas nos 7 blocos", () => {
    expect(JAVA_PLENO).toHaveLength(40);
    expect(new Set(JAVA_PLENO.map((q) => q.id)).size).toBe(40);
    for (const b of BLOCKS) expect(JAVA_PLENO.filter((q) => q.block === b.id).length).toBeGreaterThanOrEqual(5);
  });

  it("cada pergunta e cada aprofundamento têm exatamente uma resposta de pleno", () => {
    for (const q of JAVA_PLENO) {
      expect(onePleno({ q: q.prompt, options: q.options }), q.id).toBe(1);
      expect(onePleno(q.followUp), q.id).toBe(1);
      expect(q.checklist.length, q.id).toBeGreaterThanOrEqual(3);
      for (const o of [...q.options, ...q.followUp.options]) expect(o.why.length, q.id).toBeGreaterThan(0);
    }
  });

  it("sorteio da entrevista completa: 8 perguntas, sem repetir, sempre com Java e Spring, e igual para a mesma semente", () => {
    for (let seed = 1; seed < 200; seed++) {
      const qs = drawInterview(seed);
      expect(qs).toHaveLength(8);
      expect(new Set(qs.map((q) => q.id)).size).toBe(8);
      expect(qs.some((q) => q.block === "java")).toBe(true);
      expect(qs.some((q) => q.block === "spring")).toBe(true);
    }
    expect(drawInterview(42).map((q) => q.id)).toEqual(drawInterview(42).map((q) => q.id));
  });

  it("blocos de peso alto aparecem mais que os de peso baixo", () => {
    const count: Record<string, number> = {};
    for (let seed = 1; seed <= 2000; seed++) for (const q of drawInterview(seed)) count[q.block] = (count[q.block] ?? 0) + 1;
    expect(count.dados!).toBeGreaterThan(count.operacao!);
    expect(count.rest!).toBeGreaterThan(count.qualidade!);
  });

  it("estima o nível pela fração de pontos", () => {
    expect(estimateLevel(0.9).level).toBe("pleno forte");
    expect(estimateLevel(0.7).level).toBe("pleno");
    expect(estimateLevel(0.5).level).toBe("júnior");
    expect(estimateLevel(0.1).level).toBe("abaixo de júnior");
  });
});

describe("processo seletivo", () => {
  it("todas as etapas, na ordem real", () => {
    expect(STAGES.map((s) => s.id)).toEqual(["triagem", "rh", "teste", "tecnica", "gestor", "proposta", "admissao"]);
  });

  it("perguntas de triagem, RH, desafio, gestor e eventos têm uma melhor resposta", () => {
    for (const c of COMPANIES) {
      for (const f of triagemForm(c)) expect(onePleno(f), f.q).toBe(1);
      for (const r of rhQuestions(c)) expect(onePleno(r), r.q).toBe(1);
      // a melhor resposta da triagem nunca elimina
      for (const f of triagemForm(c)) expect(f.options.find((o) => o.level === "pleno")!.knockout).toBeFalsy();
    }
    for (const s of [...TAKEHOME.defense, ...SOFT_WARMUP, ...BEHAVIORAL, DOWNLEVEL, GHOSTING]) expect(onePleno(s), s.q).toBe(1);
  });

  it("revisão de código: acertos, tipo errado e falso positivo", () => {
    const r = REVIEWS.transferencia;
    const all = Object.fromEntries(r.issues.map((i) => [i.line, i.kind]));
    expect(scoreReview(r, all)).toEqual({ score: r.issues.length, max: r.issues.length });
    expect(scoreReview(r, { 7: "Erro engolido" }).score).toBe(0.5);
    expect(scoreReview(r, { 1: "Erro engolido" }).score).toBe(0);
    for (const rv of Object.values(REVIEWS)) for (const i of rv.issues) expect(rv.lines[i.line - 1]!.trim().length, `${rv.id}:${i.line}`).toBeGreaterThan(0);
  });

  it("proposta fica dentro da faixa e contraproposta segue as regras", () => {
    for (const c of COMPANIES) {
      for (const p of [0, 0.5, 1]) {
        const o = makeOffer(c, p, false);
        expect(o.monthly).toBeGreaterThanOrEqual(c.band[0]);
        expect(o.monthly).toBeLessThanOrEqual(c.band[1]);
      }
      expect(makeOffer(c, 1, true).monthly).toBeLessThan(makeOffer(c, 1, false).monthly);
      const offer = { regime: "CLT" as const, monthly: c.band[0] };
      expect(counterOffer(c, offer, offer.monthly * 1.08).kind).toBe("aceita");
      expect(counterOffer(c, offer, offer.monthly * 1.18).kind).toBe("meio-termo");
      expect(counterOffer(c, offer, offer.monthly * 1.6).kind).toBe("sem-orcamento");
    }
  });

  it("PJ equivalente fica entre 40% e 60% acima do CLT, como a regra de bolso", () => {
    const r = cltVsPj(10000, 1000);
    expect(r.ratio).toBeGreaterThan(1.4);
    expect(r.ratio).toBeLessThan(1.6);
  });
});
