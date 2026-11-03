import { describe, expect, it } from "vitest";
import {
  TRACKS,
  companyFor,
  drawTrack,
  getTrack,
  AREAS,
  STACKS,
  isReady,
  stacksOf,
  BLOCKS,
  MARKET,
  screenApplication,
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
  it("triagem com campos livres aplica os filtros da vaga", () => {
    const c = COMPANIES[0]!;
    const ok = { years: 3, salary: c.band[0] + 500, available: true, techs: "Java 17, Spring Boot, Kafka, PostgreSQL, JUnit, Docker" };
    expect(screenApplication(c, ok).knockout).toBeUndefined();
    expect(screenApplication(c, { ...ok, years: 1 }).knockout).toMatch(/2 a 5 anos/);
    expect(screenApplication(c, { ...ok, salary: c.band[1] * 1.5 }).knockout).toMatch(/acima do teto/);
    expect(screenApplication(c, { ...ok, available: false }).knockout).toBeDefined();
    expect(screenApplication(c, { ...ok, techs: "Java, Hibernate" }).knockout).toMatch(/Spring/);
    expect(screenApplication(c, { ...ok, salary: c.band[0] * 0.7 }).askedLow).toBe(true);
  });

  it("faixas das empresas seguem a pesquisa de mercado (BH até ~R$ 9 mil)", () => {
    expect(MARKET.sources.length).toBeGreaterThan(1);
    for (const c of COMPANIES) {
      expect(c.band[0]).toBeGreaterThanOrEqual(5500);
      expect(c.band[1]).toBeLessThanOrEqual(c.city === "Belo Horizonte" ? 9500 : 12000);
    }
  });
  it("catálogo de vagas: toda área tem stack, ids únicos e só Java Pleno pronto", () => {
    for (const a of AREAS) expect(stacksOf(a.id).length, a.id).toBeGreaterThan(0);
    expect(new Set(STACKS.map((s) => s.id)).size).toBe(STACKS.length);
    expect(isReady("java", "pleno")).toBe(true);
    expect(isReady("java", "senior")).toBe(false);
    expect(isReady("python", "pleno")).toBe(false);
  });
  it("vagas com pesquisa: conteúdo completo e coerente com o catálogo", () => {
    for (const st of STACKS) for (const l of st.ready) expect(getTrack(st.id, l), `${st.id}:${l}`).toBeDefined();
    for (const t of Object.values(TRACKS)) {
      expect(isReady(t.stack, t.level), t.id).toBe(true);
      const ids = new Set(t.questions.map((q) => q.id));
      expect(ids.size, t.id).toBe(t.questions.length);
      for (const b of t.blocks) expect(t.questions.some((q) => q.block === b.id), `${t.id}:${b.id}`).toBe(true);
      for (const q of t.questions) {
        expect(t.blocks.some((b) => b.id === q.block), q.id).toBe(true);
        expect(q.checklist.length, q.id).toBeGreaterThan(1);
        expect(q.reference.length, q.id).toBeGreaterThan(80);
      }
      for (const rv of t.reviews) for (const i of rv.issues) expect(rv.lines[i.line - 1]?.trim().length, `${rv.id}:${i.line}`).toBeGreaterThan(0);
      for (const c of COMPANIES) {
        const cc = companyFor(c, t);
        expect(cc.band[0]).toBeLessThan(cc.band[1]);
        expect(cc.jobAd.must.length).toBeGreaterThan(2);
      }
      expect(t.market.sources.length).toBeGreaterThan(1);
      expect(t.takehome.defense.length).toBeGreaterThan(1);
    }
  });

  it("sorteio da vaga: sem repetir, cobre os blocos principais e é determinístico", () => {
    for (const t of Object.values(TRACKS)) {
      const a = drawTrack(t, 42, 6);
      expect(a).toHaveLength(6);
      expect(new Set(a.map((q) => q.id)).size).toBe(6);
      for (const b of t.blocks.filter((b) => b.weight === 3)) expect(a.some((q) => q.block === b.id), `${t.id}:${b.id}`).toBe(true);
      expect(drawTrack(t, 42, 6).map((q) => q.id)).toEqual(a.map((q) => q.id));
    }
  });

  it("triagem usa os requisitos da vaga escolhida", () => {
    const t = getTrack("python-react", "pleno")!;
    const c = companyFor(COMPANIES[2]!, t);
    const ok = { years: 3, salary: c.band[0] + 500, available: true, techs: "Python, Django, React, TypeScript, PostgreSQL" };
    expect(screenApplication(c, ok, t).knockout).toBeUndefined();
    expect(screenApplication(c, { ...ok, techs: "Python, Django, Vue" }, t).knockout).toMatch(/React/);
    const d = getTrack("aws-k8s", "pleno")!;
    expect(screenApplication(companyFor(COMPANIES[0]!, d), { ...ok, techs: "AWS, Terraform, Docker" }, d).knockout).toMatch(/Kubernetes/);
  });
});
