/**
 * Habit tracker: metas diárias, ofensiva com failover e o rack de servidores que cresce.
 * Tudo aqui é puro (sem banco nem React), para testar e reaproveitar no servidor e na tela.
 */

export type Goal = "leve" | "regular" | "intensa";

export const GOALS: { id: Goal; title: string; rule: string; minutes: number }[] = [
  { id: "leve", title: "Leve", rule: "1 resposta avaliada pela IA", minutes: 5 },
  { id: "regular", title: "Regular", rule: "3 respostas ou 1 etapa do processo seletivo", minutes: 15 },
  { id: "intensa", title: "Intensa", rule: "1 processo seletivo inteiro ou 1 caso de system design avaliado", minutes: 40 },
];

export const isGoal = (x: unknown): x is Goal => GOALS.some((g) => g.id === x);

/** O que conta para a meta, sempre marcado sozinho pela plataforma. */
export type ActivityKind = "answer" | "stage" | "process" | "design";
export const ACTIVITY_KINDS: ActivityKind[] = ["answer", "stage", "process", "design"];

export interface DayCounts {
  answers: number;
  stages: number;
  processes: number;
  designs: number;
}

export const EMPTY: DayCounts = { answers: 0, stages: 0, processes: 0, designs: 0 };

/** A meta do dia foi cumprida? `mult` = 2 para a recuperação (meta em dobro). */
export function meets(goal: Goal, c: DayCounts, mult = 1): boolean {
  if (goal === "leve") return c.answers >= 1 * mult;
  if (goal === "regular") return c.answers >= 3 * mult || c.stages >= 1 * mult;
  return c.processes + c.designs >= 1 * mult;
}

/** Quanto falta hoje, em palavras. */
export function progressText(goal: Goal, c: DayCounts): string {
  if (meets(goal, c)) return "Meta de hoje cumprida.";
  if (goal === "leve") return "Falta 1 resposta avaliada pela IA.";
  if (goal === "regular") return `Faltam ${3 - c.answers} respostas, ou 1 etapa do processo seletivo.`;
  return "Falta 1 processo seletivo inteiro ou 1 caso de system design avaliado.";
}

/**
 * Estado de cada dia no rack:
 * - done: meta cumprida (servidor verde)
 * - failover: perdeu, mas gastou um failover da semana (amarelo)
 * - recovered: perdeu sem failover e recuperou com a meta em dobro no dia seguinte (ciano)
 * - risk: perdeu ontem sem failover; recupera se fizer a meta em dobro hoje (laranja)
 * - down: perdeu e não recuperou; a ofensiva zerou (vermelho, fica no rack)
 * - today: hoje, ainda sem a meta
 */
export type DayState = "done" | "failover" | "recovered" | "risk" | "down" | "today";

export interface DayResult {
  day: string;
  state: DayState;
  counts: DayCounts;
}

export const MILESTONES = [7, 30, 66, 100] as const;

export const TIERS = [
  { min: 0, title: "Servidor único" },
  { min: 7, title: "Cluster" },
  { min: 30, title: "Multi-AZ" },
  { min: 66, title: "Multi-região" },
  { min: 100, title: "Edge global" },
] as const;

export interface HabitSummary {
  goal: Goal;
  today: string;
  days: DayResult[];
  /** Dias seguidos sem a ofensiva zerar (conta só os dias cumpridos). */
  streak: number;
  best: number;
  /** Servidores no ar: dias cumpridos ou recuperados. */
  online: number;
  failoversPerWeek: number;
  failoversLeft: number;
  todayCounts: DayCounts;
  todayDone: boolean;
  /** Ontem ficou em risco: hoje precisa da meta em dobro. */
  recoverToday: boolean;
  tier: (typeof TIERS)[number];
  nextTier: (typeof TIERS)[number] | null;
  milestones: { days: number; reached: boolean }[];
}

/** "2026-11-03" + n dias. */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Segunda-feira da semana do dia (a semana dos failovers). */
export function weekOf(day: string): string {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(day, -((dow + 6) % 7));
}

/** O dia de hoje no fuso de São Paulo, como "AAAA-MM-DD". */
export function dayInBrazil(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
}

export function computeHabit(opts: {
  start: string;
  today: string;
  goal: Goal;
  counts: Record<string, DayCounts>;
  failoversPerWeek?: number;
}): HabitSummary {
  const { goal, today } = opts;
  const perWeek = opts.failoversPerWeek ?? 2;
  const start = opts.start > today ? today : opts.start;
  const get = (d: string) => opts.counts[d] ?? EMPTY;
  const used: Record<string, number> = {};
  const days: DayResult[] = [];
  let streak = 0;
  let best = 0;
  let online = 0;

  for (let day = start; day <= today; day = addDays(day, 1)) {
    const c = get(day);
    let state: DayState;
    if (meets(goal, c)) {
      state = "done";
      streak++;
      online++;
    } else if (day === today) {
      state = "today";
    } else if ((used[weekOf(day)] ?? 0) < perWeek) {
      used[weekOf(day)] = (used[weekOf(day)] ?? 0) + 1;
      state = "failover";
    } else {
      const next = addDays(day, 1);
      if (meets(goal, get(next), 2)) {
        state = "recovered";
        online++;
      } else if (next === today) {
        state = "risk";
      } else {
        state = "down";
        streak = 0;
      }
    }
    best = Math.max(best, streak);
    days.push({ day, state, counts: c });
  }

  const last = days[days.length - 1]!;
  const prev = days[days.length - 2];
  let tierIdx = 0;
  TIERS.forEach((t, i) => best >= t.min && (tierIdx = i));
  return {
    goal,
    today,
    days,
    streak,
    best,
    online,
    failoversPerWeek: perWeek,
    failoversLeft: perWeek - (used[weekOf(today)] ?? 0),
    todayCounts: last.counts,
    todayDone: last.state === "done",
    recoverToday: prev?.state === "risk",
    tier: TIERS[tierIdx]!,
    nextTier: TIERS[tierIdx + 1] ?? null,
    milestones: MILESTONES.map((m) => ({ days: m, reached: best >= m })),
  };
}

/** Intensidade de 0 a 4 para o calendário do ano (estilo GitHub). */
export function intensity(goal: Goal, c: DayCounts): 0 | 1 | 2 | 3 | 4 {
  const total = c.answers + c.stages * 3 + (c.processes + c.designs) * 6;
  if (!total) return 0;
  if (meets(goal, c, 3)) return 4;
  if (meets(goal, c, 2)) return 3;
  if (meets(goal, c)) return 2;
  return 1;
}
