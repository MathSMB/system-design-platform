/**
 * Central de estudos: a vaga que você busca, a pesquisa das vagas (habilidades e frequência),
 * as suas trilhas (pós, certificação, livro, curso, projeto), o cronograma em blocos curtos
 * e o quanto você está pronto para a vaga.
 * Tudo aqui é puro (sem banco, sem IA, sem React), para testar e reaproveitar.
 */
import { addDays } from "@sdp/habit";
import { cleanGithub, type GithubLink } from "./github";

export * from "./github";

// ---------------------------------------------------------------------------
// Helpers de limpeza (os dados vêm da tela ou da IA)
// ---------------------------------------------------------------------------

const str = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : "");
const num = (x: unknown, lo: number, hi: number, dflt: number) => {
  const v = Math.round(Number(x));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
};
const isDay = (x: unknown): x is string => typeof x === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x) && !Number.isNaN(Date.parse(x));
const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const strings = (x: unknown, max: number, n: number) => list(x).map((s) => str(s, n)).filter(Boolean).slice(0, max);

/** "Desenvolvedor Java Pleno" → "desenvolvedor-java-pleno". */
export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

// ---------------------------------------------------------------------------
// Pesquisa da vaga
// ---------------------------------------------------------------------------

export interface Skill {
  name: string;
  /** % das vagas analisadas que pedem (0 a 100). */
  frequency: number;
  /** Ex. "Linguagem", "Banco de dados", "Nuvem", "Práticas". */
  category: string;
  /** Obrigatório na maioria das vagas ou diferencial. */
  must: boolean;
}

export interface RoleResearch {
  role: string;
  level: string;
  summary: string;
  postingsAnalyzed: number;
  skills: Skill[];
  /** Faixa mensal CLT (R$), quando a pesquisa achou. */
  band: [number, number] | null;
  questions: string[];
  sources: { label: string; url: string }[];
  researchedAt: string;
}

export const researchId = (role: string, level: string) => `${slug(role)}:${level}`;

/** A pesquisa vale por 6 meses. */
export const RESEARCH_DAYS = 180;
export const researchStale = (researchedAt: string, today: string) => addDays(researchedAt, RESEARCH_DAYS) < today;

export function cleanResearch(x: unknown, meta: { role: string; level: string; today: string }): RoleResearch | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const seen = new Set<string>();
  const skills: Skill[] = [];
  for (const s of list(r.skills)) {
    const o = (s ?? {}) as Record<string, unknown>;
    const name = str(o.name, 60);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    skills.push({ name, frequency: num(o.frequency, 0, 100, 0), category: str(o.category, 40) || "Outros", must: o.must === true });
  }
  if (!skills.length) return null;
  skills.sort((a, b) => b.frequency - a.frequency);
  const band = list(r.band).map((v) => num(v, 0, 200000, 0));
  const sources = list(r.sources)
    .map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      const url = str(o.url, 500);
      return { label: str(o.label, 120) || url, url };
    })
    .filter((s) => /^https?:\/\//.test(s.url))
    .slice(0, 30);
  return {
    role: meta.role,
    level: meta.level,
    summary: str(r.summary, 1200),
    postingsAnalyzed: num(r.postingsAnalyzed, 0, 1000, 0),
    skills: skills.slice(0, 40),
    band: band.length === 2 && band[0]! > 0 && band[1]! >= band[0]! ? [band[0]!, band[1]!] : null,
    questions: strings(r.questions, 15, 300),
    sources,
    researchedAt: meta.today,
  };
}

// ---------------------------------------------------------------------------
// Trilhas: pós, certificação, livro, curso, projeto, outro
// ---------------------------------------------------------------------------

export type TrailKind = "pos" | "certificacao" | "livro" | "curso" | "projeto" | "outro";
export const TRAIL_KINDS: { id: TrailKind; title: string; unit: string; units: string }[] = [
  { id: "pos", title: "Pós-graduação", unit: "matéria", units: "matérias" },
  { id: "certificacao", title: "Certificação", unit: "módulo", units: "módulos" },
  { id: "livro", title: "Livro", unit: "capítulo", units: "capítulos" },
  { id: "curso", title: "Curso", unit: "aula", units: "aulas" },
  { id: "projeto", title: "Projeto", unit: "entrega", units: "entregas" },
  { id: "outro", title: "Outro", unit: "etapa", units: "etapas" },
];
const isKind = (x: unknown): x is TrailKind => TRAIL_KINDS.some((k) => k.id === x);
export const kindOf = (k: TrailKind) => TRAIL_KINDS.find((x) => x.id === k)!;

export interface TrailUnit {
  id: string;
  title: string;
  done: boolean;
  /** Número da issue no GitHub, quando o passo vem de um repositório ligado. */
  issue?: number;
  url?: string;
  /** ISO de quando a issue fechou. */
  doneAt?: string;
}

export interface Trail {
  id: string;
  kind: TrailKind;
  title: string;
  /** Por que importa (para a vaga ou para você). */
  why: string;
  /** 3 = essencial para a vaga; 1 = quando sobrar tempo. */
  importance: 1 | 2 | 3;
  /** Quantas vezes por semana entra no cronograma (não precisa ser todo dia). */
  perWeek: number;
  /** Minutos de cada sessão: blocos curtos cabem nos tempos pequenos do dia. */
  sessionMin: number;
  deadline: string | null;
  skills: string[];
  units: TrailUnit[];
  /** Repositório do GitHub ligado (só projetos): os passos passam a vir das issues. */
  github?: GithubLink | null;
}

export const MAX_TRAILS = 20;
export const MAX_UNITS = 60;

export function cleanTrail(x: unknown, id?: string): Trail | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const title = str(o.title, 120);
  if (!title) return null;
  const units: TrailUnit[] = [];
  for (const u of list(o.units).slice(0, MAX_UNITS)) {
    const t = typeof u === "string" ? str(u, 160) : str((u as Record<string, unknown>)?.title, 160);
    if (!t) continue;
    const uid = typeof u === "object" && u && typeof (u as any).id === "string" && /^u\d{1,3}$/.test((u as any).id) ? (u as any).id : `u${units.length + 1}`;
    const uo = typeof u === "object" && u ? (u as Record<string, unknown>) : {};
    const unit: TrailUnit = { id: units.some((v) => v.id === uid) ? `u${units.length + 1}` : uid, title: t, done: uo.done === true };
    if (Number.isInteger(uo.issue) && (uo.issue as number) > 0) unit.issue = uo.issue as number;
    if (typeof uo.url === "string" && /^https:\/\/github\.com\//.test(uo.url)) unit.url = uo.url.slice(0, 300);
    if (typeof uo.doneAt === "string" && uo.doneAt) unit.doneAt = uo.doneAt.slice(0, 30);
    units.push(unit);
  }
  const github = o.kind === "projeto" ? cleanGithub(o.github) : null;
  return {
    id: id ?? (typeof o.id === "string" && /^t[a-z0-9]{1,16}$/.test(o.id) ? o.id : `t${Date.now().toString(36)}`),
    kind: isKind(o.kind) ? o.kind : "outro",
    title,
    why: str(o.why, 400),
    importance: num(o.importance, 1, 3, 2) as 1 | 2 | 3,
    perWeek: num(o.perWeek, 1, 7, 2),
    sessionMin: num(o.sessionMin, 10, 120, 25),
    deadline: isDay(o.deadline) ? o.deadline : null,
    skills: strings(o.skills, 12, 60),
    units,
    ...(github ? { github } : {}),
  };
}

export function cleanTrails(x: unknown): Trail[] {
  const out: Trail[] = [];
  for (const t of list(x).slice(0, MAX_TRAILS)) {
    const c = cleanTrail(t);
    if (c && !out.some((o) => o.id === c.id)) out.push(c);
  }
  return out;
}

export function trailProgress(t: Trail): { done: number; total: number; pct: number } {
  const done = t.units.filter((u) => u.done).length;
  return { done, total: t.units.length, pct: t.units.length ? Math.round((100 * done) / t.units.length) : 0 };
}

// ---------------------------------------------------------------------------
// Projetos sugeridos (a IA oferece, você escolhe)
// ---------------------------------------------------------------------------

export interface ProjectOption {
  title: string;
  pitch: string;
  skills: string[];
  deliverables: string[];
  weeks: number;
}

export function cleanProjects(x: unknown): ProjectOption[] {
  return list(x)
    .map((p) => {
      const o = (p ?? {}) as Record<string, unknown>;
      return { title: str(o.title, 120), pitch: str(o.pitch, 600), skills: strings(o.skills, 12, 60), deliverables: strings(o.deliverables, 15, 160), weeks: num(o.weeks, 1, 52, 4) };
    })
    .filter((p) => p.title && p.deliverables.length)
    .slice(0, 3);
}

export function projectToTrail(p: ProjectOption, id?: string): Trail {
  return cleanTrail({ kind: "projeto", title: p.title, why: p.pitch, importance: 3, perWeek: 3, sessionMin: 30, skills: p.skills, units: p.deliverables }, id)!;
}

// ---------------------------------------------------------------------------
// Disponibilidade
// ---------------------------------------------------------------------------

export interface Availability {
  /** Minutos livres por dia da semana, de segunda [0] a domingo [6]. */
  minutes: number[];
  /** Quando você quer estar pronto para a vaga. */
  targetDate: string | null;
  /** Folga para imprevistos (0,2 = 20% do tempo fica livre). */
  slack: number;
  /** Combinados com a IA ("sábado não estudo", "semana que vem tenho prova"). */
  notes: string;
}

export const WEEKDAYS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
export const DEFAULT_AVAILABILITY: Availability = { minutes: [45, 45, 45, 45, 45, 90, 0], targetDate: null, slack: 0.2, notes: "" };

export function cleanAvailability(x: unknown): Availability {
  const o = (x ?? {}) as Record<string, unknown>;
  const m = list(o.minutes);
  return {
    minutes: DEFAULT_AVAILABILITY.minutes.map((d, i) => num(m[i], 0, 600, m.length ? 0 : d)),
    targetDate: isDay(o.targetDate) ? o.targetDate : null,
    slack: Math.min(0.5, Math.max(0, Number(o.slack ?? 0.2) || 0)),
    notes: str(o.notes, 800),
  };
}

/** Segunda = 0 … domingo = 6. */
export const weekday = (day: string) => (new Date(`${day}T12:00:00Z`).getUTCDay() + 6) % 7;

/** Minutos que o cronograma pode usar no dia (já tirando a folga). */
export const plannable = (av: Availability, day: string) => Math.floor((av.minutes[weekday(day)] ?? 0) * (1 - av.slack));

// ---------------------------------------------------------------------------
// Cronograma
// ---------------------------------------------------------------------------

export type ItemKind = "estudo" | "revisao" | "teste" | "projeto";
export const ITEM_KINDS: { id: ItemKind; title: string }[] = [
  { id: "estudo", title: "Estudo" },
  { id: "revisao", title: "Revisão" },
  { id: "teste", title: "Treino com nota" },
  { id: "projeto", title: "Projeto" },
];
const isItemKind = (x: unknown): x is ItemKind => ITEM_KINDS.some((k) => k.id === x);

export interface ScheduleItem {
  id: string;
  day: string;
  title: string;
  kind: ItemKind;
  minutes: number;
  trailId: string | null;
  unitId: string | null;
  skill: string | null;
  /** Por que entra agora (prioridade, revisão, prazo). */
  why: string;
}

export interface Schedule {
  /** Dia em que foi gerado ou replanejado. */
  createdAt: string;
  from: string;
  until: string;
  items: ScheduleItem[];
  /** Esboço das semanas seguintes, até a data alvo. */
  outline: { week: string; focus: string }[];
  notes: string;
}

/** Dias que o cronograma detalha de cada vez (o resto fica no esboço). */
export const HORIZON = 14;

/** Marca de um item do cronograma nos checks do dia. */
export const itemKey = (id: string) => `c:${id}`;

export function cleanScheduleItems(raw: unknown, ctx: { from: string; until: string; trails: Trail[]; av: Availability; gen: string }): ScheduleItem[] {
  const out: ScheduleItem[] = [];
  const used: Record<string, number> = {};
  const rows = list(raw)
    .map((x) => (x ?? {}) as Record<string, unknown>)
    .filter((o) => isDay(o.day) && o.day >= ctx.from && o.day <= ctx.until)
    .sort((a, b) => String(a.day).localeCompare(String(b.day)));
  for (const o of rows) {
    const day = o.day as string;
    const title = str(o.title, 160);
    if (!title) continue;
    const minutes = num(o.minutes, 5, 180, 25);
    const room = plannable(ctx.av, day) - (used[day] ?? 0);
    if (minutes > room) continue; // nunca passa do tempo que você tem no dia
    used[day] = (used[day] ?? 0) + minutes;
    const trail = ctx.trails.find((t) => t.id === o.trailId);
    const unit = trail?.units.find((u) => u.id === o.unitId);
    out.push({
      id: `${ctx.gen}-${out.length + 1}`,
      day,
      title,
      kind: isItemKind(o.kind) ? o.kind : "estudo",
      minutes,
      trailId: trail?.id ?? null,
      unitId: unit?.id ?? null,
      skill: str(o.skill, 60) || null,
      why: str(o.why, 240),
    });
  }
  return out;
}

export function cleanSchedule(x: unknown): Schedule | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  if (!isDay(o.from) || !isDay(o.until) || !isDay(o.createdAt)) return null;
  const items = list(o.items).filter((i): i is ScheduleItem => !!i && typeof (i as any).id === "string" && isDay((i as any).day));
  return {
    createdAt: o.createdAt,
    from: o.from,
    until: o.until,
    items,
    outline: list(o.outline).map((w) => ({ week: str((w as any)?.week, 40), focus: str((w as any)?.focus, 300) })).filter((w) => w.focus).slice(0, 26),
    notes: str(o.notes, 1200),
  };
}

/**
 * De onde o replanejamento começa: hoje, a não ser que você já tenha marcado algo de hoje
 * (aí hoje fica como está e o novo plano começa amanhã). O passado nunca muda.
 */
export function replanStart(prev: Schedule | null, today: string, checks: Record<string, string[]>): string {
  if (!prev) return today;
  const marked = prev.items.some((i) => i.day === today && (checks[today] ?? []).includes(itemKey(i.id)));
  return marked ? addDays(today, 1) : today;
}

/** Junta o que já passou do cronograma antigo com o novo. */
export function mergeSchedule(prev: Schedule | null, fresh: Omit<Schedule, "items"> & { items: ScheduleItem[] }): Schedule {
  if (!prev) return fresh;
  const kept = prev.items.filter((i) => i.day < fresh.from);
  return { ...fresh, from: prev.from < fresh.from ? prev.from : fresh.from, items: [...kept, ...fresh.items] };
}

/** O cronograma precisa de replanejamento? (acabando, ou é domingo e ainda não foi refeito hoje). */
export function needsReplan(s: Schedule | null, today: string): boolean {
  if (!s) return false;
  return s.until < addDays(today, 2) || (weekday(today) === 6 && s.createdAt < today);
}

/**
 * Dias do cronograma em que tudo foi feito. Um dia sem nada planejado dentro do cronograma
 * conta como descanso combinado (feito). Fora do cronograma, nada conta.
 */
export function scheduleDone(s: Schedule | null, day: string, checks: readonly string[]): boolean {
  if (!s || day < s.from || day > s.until) return false;
  const items = s.items.filter((i) => i.day === day);
  return items.every((i) => checks.includes(itemKey(i.id)));
}

export const itemsOn = (s: Schedule | null, day: string) => (s?.items ?? []).filter((i) => i.day === day);

// ---------------------------------------------------------------------------
// Pronto para a vaga e lacunas
// ---------------------------------------------------------------------------

/** 0 = não sei, 1 = estudando, 2 = domino. */
export type SkillLevel = 0 | 1 | 2;
export const SKILL_LEVELS: { id: SkillLevel; title: string }[] = [
  { id: 0, title: "Não sei" },
  { id: 1, title: "Estudando" },
  { id: 2, title: "Domino" },
];

export function cleanSkillStatus(x: unknown): Record<string, SkillLevel> {
  const out: Record<string, SkillLevel> = {};
  if (!x || typeof x !== "object") return out;
  for (const [k, v] of Object.entries(x as Record<string, unknown>).slice(0, 200)) {
    const n = Number(v);
    if (k.length <= 60 && (n === 0 || n === 1 || n === 2)) out[k] = n;
  }
  return out;
}

/**
 * O nível de cada habilidade: o que você marcou, ou "estudando" quando
 * algum item feito do cronograma ou unidade concluída de trilha trata dela.
 */
export function skillLevels(skills: Skill[], status: Record<string, SkillLevel>, practiced: Iterable<string>): Record<string, SkillLevel> {
  const p = new Set([...practiced].map((s) => s.toLowerCase()));
  return Object.fromEntries(skills.map((s) => [s.name, status[s.name] ?? (p.has(s.name.toLowerCase()) ? 1 : 0)])) as Record<string, SkillLevel>;
}

/** % pronto para a vaga: cada habilidade pesa pela frequência nas vagas; dominar = 1, estudando = 0,5. */
export function readiness(skills: Skill[], levels: Record<string, SkillLevel>): number {
  const total = skills.reduce((a, s) => a + Math.max(1, s.frequency), 0);
  if (!total) return 0;
  const got = skills.reduce((a, s) => a + (Math.max(1, s.frequency) * (levels[s.name] ?? 0)) / 2, 0);
  return Math.round((100 * got) / total);
}

/** O que mais falta: as habilidades mais pedidas que você ainda não domina. */
export function gaps(skills: Skill[], levels: Record<string, SkillLevel>, n = 8): Skill[] {
  return skills
    .filter((s) => (levels[s.name] ?? 0) < 2)
    .sort((a, b) => b.frequency * (2 - (levels[b.name] ?? 0)) - a.frequency * (2 - (levels[a.name] ?? 0)))
    .slice(0, n);
}
