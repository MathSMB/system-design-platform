import { BLOCKS, JAVA_PLENO } from "../java-pleno";
import { COMPANIES, MARKET, REVIEWS, TAKEHOME, type Company } from "../process";
import { pickWeighted, rng } from "../rng";
import type { Level, MarketProfile } from "../tracks";
import type { AskStep } from "../types";
import { DEVOPS_PLENO } from "./devops";
import { PYTHON_FULLSTACK_PLENO } from "./python-fullstack";
import type { OpenQuestion, TrackContent } from "./types";

export * from "./types";
export { DEVOPS_PLENO, PYTHON_FULLSTACK_PLENO };

/** Pergunta com alternativas → pergunta aberta: a melhor vira referência, as outras sinais de alerta. */
const best = (s: Pick<AskStep, "options">) => s.options.find((o) => o.level === "pleno")!;
const others = (s: Pick<AskStep, "options">) => s.options.filter((o) => o.level !== "pleno").map((o) => `${o.text} (${o.why})`);

/** Java Pleno, montado a partir do banco de 40 perguntas e das vagas originais. */
export const JAVA_PLENO_TRACK: TrackContent = {
  id: "java:pleno",
  stack: "java",
  level: "pleno",
  role: "Dev Java Pleno",
  experience: "Java e Spring Boot",
  blocks: BLOCKS.map((b) => ({ id: b.id, title: b.title, weight: b.weight })),
  questions: JAVA_PLENO.map(
    (q): OpenQuestion => ({
      id: q.id,
      block: q.block,
      prompt: q.prompt,
      code: q.code,
      checklist: q.checklist,
      reference: `${best(q).text}\nAprofundamento esperado: ${q.followUp.q} ${best(q.followUp).text}`,
      avoid: others(q),
    }),
  ),
  required: [{ pattern: "spring", label: "Spring Boot" }],
  jobs: Object.fromEntries(COMPANIES.map((c) => [c.id, { ...c.jobAd, band: c.band }])) as TrackContent["jobs"],
  reviews: [REVIEWS.transferencia, REVIEWS.relatorio],
  takehome: { title: TAKEHOME.title, brief: TAKEHOME.brief, defense: TAKEHOME.defense.map((d) => ({ q: d.q, reference: best(d).text, avoid: others(d) })) },
  race: true,
  market: {
    stack: "java",
    level: "pleno",
    researchedAt: "2026-11-03",
    band: [6000, 11500],
    sources: MARKET.sources,
    topics: BLOCKS.map((b) => ({ title: b.title, weight: b.weight })),
  },
};

/** Vagas com pesquisa profunda, por "<stack>:<nível>". */
export const TRACKS: Record<string, TrackContent> = Object.fromEntries([JAVA_PLENO_TRACK, PYTHON_FULLSTACK_PLENO, DEVOPS_PLENO].map((t) => [t.id, t]));

export const getTrack = (stack: string, level: Level) => TRACKS[`${stack}:${level}`];

/** Pesquisa de mercado de cada vaga pronta (vai para a tabela market_profiles). */
export const MARKET_PROFILES: Record<string, MarketProfile> = Object.fromEntries(Object.values(TRACKS).map((t) => [t.id, t.market]));

/** A empresa com a vaga da stack escolhida: anúncio, faixa e quem entrevista. */
export function companyFor(c: Company, t: TrackContent): Company {
  const job = t.jobs[c.id];
  const { band, tecnica, gestor, ...jobAd } = job;
  return { ...c, band, jobAd, raceQuestion: c.raceQuestion && t.race, who: { ...c.who, tecnica: tecnica ?? c.who.tecnica, gestor: gestor ?? c.who.gestor } };
}

/** Sorteia n perguntas da vaga, pesando pelos blocos e cobrindo os blocos de peso 3; em ordem de bloco. */
export function drawTrack(t: TrackContent, seed: number, n = 6): OpenQuestion[] {
  const rand = rng(seed);
  const weight = (q: OpenQuestion) => t.blocks.find((b) => b.id === q.block)?.weight ?? 1;
  const core = t.blocks.filter((b) => b.weight === 3).flatMap((b) => pickWeighted(t.questions.filter((q) => q.block === b.id), () => 1, 1, rand));
  const rest = pickWeighted(t.questions.filter((q) => !core.includes(q)), weight, Math.max(0, n - core.length), rand);
  const order = t.blocks.map((b) => b.id);
  return [...core, ...rest].slice(0, n).sort((a, b) => order.indexOf(a.block) - order.indexOf(b.block));
}
