/**
 * Habit tracker: a meta diária que você mesmo define e a placa-mãe que é montada,
 * se desgasta, é consertada e, se queimar, recomeça do zero.
 * Tudo aqui é puro (sem banco nem React), para testar e reaproveitar no servidor e na tela.
 */

// ---------------------------------------------------------------------------
// Meta do dia: uma lista de itens. Itens da plataforma são marcados sozinhos;
// itens manuais (o seu tipo de estudo) você marca com um check.
// ---------------------------------------------------------------------------

/** O que a plataforma conta sozinha. */
export type ActivityKind = "answer" | "stage" | "process" | "design";
export const ACTIVITY_KINDS: ActivityKind[] = ["answer", "stage", "process", "design"];

export interface DayCounts {
  answers: number;
  stages: number;
  processes: number;
  designs: number;
}
export const EMPTY: DayCounts = { answers: 0, stages: 0, processes: 0, designs: 0 };

export type Metric = keyof DayCounts;
export const METRICS: { id: Metric; one: string; many: string; href: string }[] = [
  { id: "answers", one: "resposta avaliada pela IA", many: "respostas avaliadas pela IA", href: "/entrevista/java" },
  { id: "stages", one: "etapa do processo seletivo", many: "etapas do processo seletivo", href: "/processo-seletivo" },
  { id: "processes", one: "processo seletivo inteiro", many: "processos seletivos inteiros", href: "/processo-seletivo" },
  { id: "designs", one: "caso de system design avaliado", many: "casos de system design avaliados", href: "/entrevista/system-design" },
];
export const isMetric = (x: unknown): x is Metric => METRICS.some((m) => m.id === x);

export type GoalItem =
  | { id: string; kind: "platform"; metric: Metric; target: number }
  | { id: string; kind: "manual"; text: string }
  /** Cumprir tudo o que o cronograma da Central de estudos pôs no dia (marcado sozinho). */
  | { id: string; kind: "schedule" };

export const SCHEDULE_TEXT = "Cumprir o cronograma do dia (Central de estudos)";

/** "all" = todos os itens; "any" = qualquer um deles. */
export interface Plan {
  mode: "all" | "any";
  items: GoalItem[];
}

/** Modelos prontos. O "sugerido" é o padrão de quem está começando. */
export type Goal = "sugerida" | "leve" | "regular" | "intensa" | "personalizada";
export const GOALS: { id: Exclude<Goal, "personalizada">; title: string; rule: string; minutes: number; plan: Plan }[] = [
  {
    id: "sugerida",
    title: "Sugerida",
    rule: "30 min de estudo do seu jeito + 1 resposta avaliada pela IA",
    minutes: 35,
    plan: {
      mode: "all",
      items: [
        { id: "estudo", kind: "manual", text: "Estudar 30 min (curso, leitura, vídeo ou projeto)" },
        { id: "resposta", kind: "platform", metric: "answers", target: 1 },
      ],
    },
  },
  { id: "leve", title: "Leve", rule: "1 resposta avaliada pela IA", minutes: 5, plan: { mode: "all", items: [{ id: "resposta", kind: "platform", metric: "answers", target: 1 }] } },
  {
    id: "regular",
    title: "Regular",
    rule: "3 respostas ou 1 etapa do processo seletivo",
    minutes: 15,
    plan: {
      mode: "any",
      items: [
        { id: "respostas", kind: "platform", metric: "answers", target: 3 },
        { id: "etapa", kind: "platform", metric: "stages", target: 1 },
      ],
    },
  },
  {
    id: "intensa",
    title: "Intensa",
    rule: "1 processo seletivo inteiro ou 1 caso de system design avaliado",
    minutes: 40,
    plan: {
      mode: "any",
      items: [
        { id: "processo", kind: "platform", metric: "processes", target: 1 },
        { id: "caso", kind: "platform", metric: "designs", target: 1 },
      ],
    },
  },
];
export const isGoal = (x: unknown): x is Goal => x === "personalizada" || GOALS.some((g) => g.id === x);

export const MAX_ITEMS = 8;

/** Valida e limpa um plano vindo da tela. Devolve null se não der para usar. */
export function cleanPlan(x: unknown): Plan | null {
  if (!x || typeof x !== "object") return null;
  const raw = x as { mode?: unknown; items?: unknown };
  if (!Array.isArray(raw.items)) return null;
  const items: GoalItem[] = [];
  const ids = new Set<string>();
  for (const it of raw.items.slice(0, MAX_ITEMS)) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    let id = typeof o.id === "string" && /^[a-z0-9-]{1,24}$/.test(o.id) ? o.id : `i${items.length + 1}`;
    while (ids.has(id)) id = `${id}-${items.length + 1}`;
    if (o.kind === "manual" && typeof o.text === "string" && o.text.trim()) {
      items.push({ id, kind: "manual", text: o.text.trim().slice(0, 120) });
    } else if (o.kind === "schedule") {
      if (items.some((i) => i.kind === "schedule")) continue;
      items.push({ id, kind: "schedule" });
    } else if (o.kind === "platform" && isMetric(o.metric)) {
      const target = Math.min(20, Math.max(1, Math.round(Number(o.target) || 1)));
      items.push({ id, kind: "platform", metric: o.metric, target });
    } else continue;
    ids.add(id);
  }
  if (!items.length) return null;
  return { mode: raw.mode === "any" ? "any" : "all", items };
}

/** O plano de um perfil: o salvo, ou o do modelo escolhido. */
export function planOf(goal: string, saved?: unknown): Plan {
  return cleanPlan(saved) ?? GOALS.find((g) => g.id === goal)?.plan ?? GOALS[0]!.plan;
}

export function itemDone(item: GoalItem, c: DayCounts, checks: readonly string[]): boolean {
  return item.kind === "platform" ? c[item.metric] >= item.target : checks.includes(item.id);
}

/** A meta do dia foi cumprida? */
export function meets(plan: Plan, c: DayCounts, checks: readonly string[] = []): boolean {
  const ok = plan.items.map((i) => itemDone(i, c, checks));
  return plan.mode === "any" ? ok.some(Boolean) : ok.every(Boolean);
}

export function itemText(item: GoalItem): string {
  if (item.kind === "manual") return item.text;
  if (item.kind === "schedule") return SCHEDULE_TEXT;
  const m = METRICS.find((x) => x.id === item.metric)!;
  return `${item.target} ${item.target === 1 ? m.one : m.many}`;
}

/** Resumo do plano em uma linha. */
export function planText(plan: Plan): string {
  return plan.items.map(itemText).join(plan.mode === "any" ? " ou " : " + ");
}

// ---------------------------------------------------------------------------
// Datas (sempre no horário de Brasília)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// A placa-mãe
// ---------------------------------------------------------------------------

/** As peças, na ordem em que são instaladas (uma por dia cumprido). */
export const PARTS = [
  { id: "cpu", name: "Processador", d: "IHS metálico, núcleos pulsando" },
  { id: "ram", name: "Memória DDR5", d: "4 pentes com dissipador e RGB correndo" },
  { id: "power", name: "Energia", d: "24 pinos e EPS 8 pinos com cabos trançados" },
  { id: "ssd", name: "SSD Gen5", d: "dissipador com ventoinha própria" },
  { id: "pump", name: "Water cooler: bomba", d: "tela redonda com a temperatura" },
  { id: "radiator", name: "Radiador 360 mm", d: "3 ventoinhas e líquido correndo nas mangueiras" },
  { id: "vrm", name: "VRM", d: "dissipadores, heatpipe e bobinas" },
  { id: "chipset", name: "Chipset", d: "dissipador com ventoinha" },
  { id: "io", name: "Painel traseiro", d: "USB4, rede 10 GbE com LED" },
  { id: "wifi", name: "Antenas Wi-Fi 7", d: "sinal pulsando" },
  { id: "audio", name: "Áudio de estúdio", d: "capacitores dourados e equalizador" },
  { id: "debug", name: "Display de diagnóstico", d: "código POST e LEDs de status" },
  { id: "gpu", name: "Placa de vídeo", d: "3 ventoinhas, backplate e RGB" },
  { id: "cmos", name: "Bateria CMOS", d: "guarda a configuração" },
  { id: "rgb", name: "Iluminação RGB", d: "contorno da placa e logo" },
] as const;
export type PartId = (typeof PARTS)[number]["id"];

/** Níveis de desgaste. No 6º a máquina queima e a placa recomeça vazia. */
export const WEAR = [
  { name: "Poeira e engasgo", items: ["Poeira começa a cobrir a placa", "Uma ventoinha da placa de vídeo engasga", "O RGB da borda pisca falhando"] },
  { name: "Superaquecendo", items: ["A ventoinha do meio do radiador e a do SSD param", "Um capacitor perto da memória estufa e vaza", "As trilhas de dados ficam âmbar e lentas"] },
  { name: "Curto-circuito", items: ["Choques elétricos nas bobinas do VRM e no cabo EPS", "Dois pentes de memória apagam (código 55)", "O conector da placa de vídeo começa a derreter"] },
  { name: "Cabo rompe", items: ["O cabo de energia da placa de vídeo rompe soltando faíscas", "As ventoinhas da placa de vídeo param e a imagem dá glitch", "O Wi-Fi perde o sinal e o áudio zera"] },
  { name: "Vazamento", items: ["O water cooler vaza e a água empoça na placa", "O líquido esquenta e corre devagar", "A tela da bomba falha e marca 91°"] },
  { name: "Fora do ar", items: ["O VRM pega fogo e solta fumaça", "Todas as peças saem da placa", "A montagem recomeça do zero"] },
] as const;
export const BURN_LEVEL = WEAR.length;

export const MILESTONES = [7, 30, 66, 100] as const;

/**
 * O que aconteceu em cada dia:
 * - install: meta cumprida, entrou uma peça nova
 * - repair: meta cumprida, consertou um nível de desgaste
 * - overclock: meta cumprida com a placa completa
 * - failover: dia perdido, mas a semana ainda tinha failover (nada quebra)
 * - wear: dia perdido sem failover, subiu um nível de desgaste
 * - burn: o desgaste chegou ao máximo; a placa esvaziou
 * - today: hoje, ainda sem a meta (não conta como perdido)
 */
export type DayState = "install" | "repair" | "overclock" | "failover" | "wear" | "burn" | "today";
export const DONE_STATES: DayState[] = ["install", "repair", "overclock"];

export interface DayResult {
  day: string;
  state: DayState;
  counts: DayCounts;
  checks: string[];
  /** Peça instalada, nível consertado ou nível de desgaste alcançado. */
  part?: PartId;
  level?: number;
}

export interface Board {
  /** Peças instaladas (0 a 15). */
  parts: number;
  /** Desgaste atual (0 a 5; o 6 vira recomeço). */
  wear: number;
  overclock: number;
  reboots: number;
}

export interface HabitSummary {
  today: string;
  plan: Plan;
  days: DayResult[];
  board: Board;
  /** Dias seguidos sem desgaste (cumpridos ou salvos por failover; só os cumpridos somam). */
  streak: number;
  best: number;
  doneDays: number;
  failoversPerWeek: number;
  failoversLeft: number;
  todayCounts: DayCounts;
  todayChecks: string[];
  todayDone: boolean;
  milestones: { days: number; reached: boolean }[];
}

/** Mudar a meta não reescreve o passado: a antiga continua valendo para os dias antes da troca. */
export interface PlanChange {
  until: string;
  plan: Plan;
}

/** Acrescenta a meta atual ao histórico, quando ela muda hoje. */
export function withChange(history: PlanChange[], current: Plan, today: string): PlanChange[] {
  return [...history.filter((h) => h.until < today), { until: today, plan: current }].slice(-50);
}

export function cleanHistory(x: unknown): PlanChange[] {
  if (!Array.isArray(x)) return [];
  return x.flatMap((h) => {
    const plan = cleanPlan(h?.plan);
    return plan && typeof h?.until === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.until) ? [{ until: h.until, plan }] : [];
  });
}

export function computeHabit(opts: {
  start: string;
  today: string;
  plan: Plan;
  counts: Record<string, DayCounts>;
  checks?: Record<string, string[]>;
  /** Metas antigas: cada uma vale para os dias antes de `until` (quando a meta mudou). */
  history?: PlanChange[];
  failoversPerWeek?: number;
}): HabitSummary {
  const { plan, today } = opts;
  const perWeek = opts.failoversPerWeek ?? 2;
  const start = opts.start > today ? today : opts.start;
  const used: Record<string, number> = {};
  const days: DayResult[] = [];
  const b: Board = { parts: 0, wear: 0, overclock: 0, reboots: 0 };
  let streak = 0;
  let best = 0;
  let doneDays = 0;
  const older = [...(opts.history ?? [])].sort((a, b) => a.until.localeCompare(b.until));
  const planFor = (day: string) => older.find((h) => day < h.until)?.plan ?? plan;

  for (let day = start; day <= today; day = addDays(day, 1)) {
    const counts = opts.counts[day] ?? EMPTY;
    const checks = opts.checks?.[day] ?? [];
    const r: DayResult = { day, state: "today", counts, checks };
    if (meets(planFor(day), counts, checks)) {
      doneDays++;
      streak++;
      if (b.wear > 0) {
        r.state = "repair";
        r.level = b.wear;
        b.wear--;
      } else if (b.parts < PARTS.length) {
        r.state = "install";
        r.part = PARTS[b.parts]!.id;
        b.parts++;
      } else {
        r.state = "overclock";
        b.overclock++;
      }
    } else if (day === today) {
      r.state = "today";
    } else if ((used[weekOf(day)] ?? 0) < perWeek) {
      used[weekOf(day)] = (used[weekOf(day)] ?? 0) + 1;
      r.state = "failover";
    } else {
      streak = 0;
      b.wear++;
      r.level = b.wear;
      if (b.wear >= BURN_LEVEL) {
        r.state = "burn";
        b.parts = 0;
        b.wear = 0;
        b.overclock = 0;
        b.reboots++;
      } else r.state = "wear";
    }
    best = Math.max(best, streak);
    days.push(r);
  }

  const last = days[days.length - 1]!;
  return {
    today,
    plan,
    days,
    board: b,
    streak,
    best,
    doneDays,
    failoversPerWeek: perWeek,
    failoversLeft: perWeek - (used[weekOf(today)] ?? 0),
    todayCounts: last.counts,
    todayChecks: last.checks,
    todayDone: DONE_STATES.includes(last.state),
    milestones: MILESTONES.map((m) => ({ days: m, reached: best >= m })),
  };
}

/** Intensidade de 0 a 4 para o calendário do ano (estilo GitHub). */
export function intensity(plan: Plan, c: DayCounts, checks: readonly string[] = []): 0 | 1 | 2 | 3 | 4 {
  const total = c.answers + c.stages * 3 + (c.processes + c.designs) * 6 + checks.length * 3;
  if (!total) return 0;
  if (!meets(plan, c, checks)) return 1;
  const extra = plan.items.filter((i) => i.kind === "platform").reduce((s, i) => s + (i.kind === "platform" ? Math.floor(c[i.metric] / i.target) : 0), 0);
  return extra >= 3 ? 4 : extra >= 2 ? 3 : 2;
}
