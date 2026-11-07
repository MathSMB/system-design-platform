"use client";

import { planOf } from "@sdp/habit";
import {
  ITEM_KINDS,
  SKILL_LEVELS,
  hm,
  TRAIL_KINDS,
  WEEKDAYS,
  itemKey,
  kindOf,
  plannable,
  researchStale,
  trailProgress,
  type Availability,
  type Pace,
  type ProjectOption,
  type RoleResearch,
  type RoleSpec,
  type Schedule,
  type ScheduleItem,
  type Skill,
  type SkillLevel,
  type Trail,
} from "@sdp/study";
import { BookOpen, CalendarDays, Check, Compass, FolderGit2, History, Lightbulb, Loader2, MessageCircle, Plus, RefreshCw, Search, Target, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { type SessionData, appUrl } from "@sdp/ui";
import { GithubLink } from "./GithubLink";
import { RoleBuilder } from "./RoleBuilder";
import { StudyChat } from "./StudyChat";
import { StudyIntro } from "./Intro";

export interface CenterData {
  role: string;
  customRole: boolean;
  roleSpec: RoleSpec | null;
  level: string;
  researchId: string | null;
  availability: Availability;
  trails: Trail[];
  projectOptions: ProjectOption[];
  skillStatus: Record<string, SkillLevel>;
  schedule: Schedule | null;
}
interface Data {
  db: boolean;
  session?: SessionData | null;
  title?: string;
  today?: string;
  center?: CenterData | null;
  research?: { status: "running" | "done" | "error"; error: string | null; startedAt: string | null; data: RoleResearch | null; id: string | null } | null;
  history?: HistoryRow[];
  pace?: Pace;
  versions?: { id: number; createdAt: string; researchId: string | null; notes: string; items: number }[];
  levels?: Record<string, SkillLevel>;
  readiness?: number | null;
  gaps?: Skill[];
  checks?: Record<string, string[]>;
  needsReplan?: boolean;
}

interface HistoryRow {
  id: string;
  role: string;
  level: string;
  status: "running" | "done" | "error";
  error: string | null;
  startedAt: string;
  researchedAt: string | null;
  postings: number;
  skills: number;
}

export const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const br = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
const money = (n: number) => `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
const dayName = (d: string) => WEEKDAYS[(new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7];

async function call(url: string, init?: RequestInit): Promise<{ ok: boolean; body: any }> {
  const r = await fetch(url, init);
  return { ok: r.ok, body: await r.json().catch(() => ({})) };
}

export function Study() {
  const [data, setData] = useState<Data | null>(null);
  const [chat, setChat] = useState(false);
  const load = useCallback(
    () =>
      fetch("/api/estudos")
        .then((r) => r.json())
        .then(setData)
        .catch(() => setData({ db: false })),
    [],
  );
  useEffect(() => {
    load();
  }, [load]);
  // enquanto a pesquisa roda, confere a cada 5 s
  useEffect(() => {
    if (data?.research?.status !== "running") return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [data?.research?.status, load]);

  const patch = async (body: unknown) => {
    const r = await call("/api/estudos", json("PATCH", body));
    await load();
    return r;
  };

  const c = data?.center;
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {data?.session && (
        <>
          <div className="flex items-center gap-2 hud-label !text-accent-2">
            <Compass size={14} /> Central de estudos
          </div>
          <h1 className="mt-3 font-display text-xl leading-relaxed">
            Do anúncio da vaga à <span className="text-accent-2 glow">meta de hoje.</span>
          </h1>
          <p className="mt-3 max-w-3xl text-muted">
            A IA pesquisa as vagas do cargo que você busca, mostra o que mais pedem, sugere projetos e monta o seu cronograma em blocos curtos, com revisão espaçada. Você junta a pós, a certificação e
            o livro que está lendo, conversando com ela.
          </p>
        </>
      )}
      <StudyIntro />
      <div id="comecar" className="scroll-mt-20" />

      {!data && <p className="mt-8 text-muted">Carregando…</p>}
      {data && !data.db && (
        <div className="panel mt-8 p-4 text-sm text-muted">
          O banco não abriu. Reinicie o <code className="text-text">pnpm dev</code> e veja o terminal.
        </div>
      )}
      {data?.session && !c && (
        <div className="panel mt-8 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-muted">Crie um perfil (a vaga que você treina) para começar.</span>
          <Link href={appUrl("painel", "/conta")} className="btn-neon px-4 py-2 text-xs">
            Criar perfil ▶
          </Link>
        </div>
      )}

      {c && data && (
        <>
          <Hero data={data} c={c} onChat={() => setChat(true)} />
          <Role data={data} c={c} patch={patch} load={load} />
          <Gaps data={data} />
          <Trails c={c} patch={patch} reload={load} onChat={() => setChat(true)} />
          <Projects data={data} c={c} patch={patch} load={load} />
          <Plan data={data} c={c} patch={patch} load={load} />
          {chat && data.session?.profile && <StudyChat profileId={data.session.profile.id} onClose={() => setChat(false)} onChanged={load} />}
        </>
      )}
    </main>
  );
}

function Section({ id, icon, title, children, right }: { id: string; icon: React.ReactNode; title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 scroll-mt-16">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {icon} {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}

function Hero({ data, c, onChat }: { data: Data; c: CenterData; onChat(): void }) {
  const today = data.today!;
  const items = (c.schedule?.items ?? []).filter((i) => i.day === today);
  const done = items.filter((i) => (data.checks?.[today] ?? []).includes(itemKey(i.id))).length;
  return (
    <div className="mt-8 grid gap-3 md:grid-cols-3">
      <div className="panel p-4">
        <div className="hud-label">Pronto para a vaga</div>
        {data.readiness == null ? (
          <p className="mt-2 text-sm text-muted">Aparece depois da pesquisa da vaga.</p>
        ) : (
          <>
            <div className="mt-1 font-mono text-3xl text-accent-2">{data.readiness}%</div>
            <div className="mt-2 h-1.5 rounded-full bg-panel-2">
              <div className="h-full rounded-full bg-accent-2" style={{ width: `${data.readiness}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-muted">Cada habilidade pesa pelo quanto as vagas pedem. Dominar conta inteiro; estudando conta metade.</p>
          </>
        )}
      </div>
      <a href="#cronograma" className="panel block p-4 transition-colors hover:!border-accent">
        <div className="hud-label">Hoje</div>
        {items.length ? (
          <>
            <div className="mt-1 font-mono text-3xl text-accent">
              {done}/{items.length}
            </div>
            <p className="mt-2 text-[12px] text-muted">blocos do cronograma feitos · {items.reduce((a, i) => a + i.minutes, 0)} min no total</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">{c.schedule ? "Nada planejado hoje: descanso combinado." : "Sem cronograma ainda."}</p>
        )}
      </a>
      <div className="panel flex flex-col justify-between gap-3 p-4">
        <div>
          <div className="hud-label">Pós, certificação, livro</div>
          <p className="mt-2 text-[13px] text-muted">Conte para a IA o que você está fazendo ou quer fazer. Ela monta a trilha e encaixa no cronograma.</p>
        </div>
        <button onClick={onChat} className="btn-neon flex items-center justify-center gap-2 px-4 py-2 text-xs">
          <MessageCircle size={14} /> Conversar com a IA
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vaga e pesquisa
// ---------------------------------------------------------------------------

function Role({ data, c, patch, load }: { data: Data; c: CenterData; patch(b: unknown): Promise<unknown>; load(): void }) {
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState<{ id: string; data: RoleResearch } | null>(null);
  const r = data.research;
  const res = r?.data;
  const running = r?.status === "running";
  const stale = res && researchStale(res.researchedAt, data.today!);
  const history = data.history ?? [];
  // já existe uma pesquisa pronta deste cargo, recente: dá para reaproveitar em vez de gastar outra
  const reusable = history.find((h) => h.status === "done" && h.role === c.role && h.level === c.level && h.researchedAt && !researchStale(h.researchedAt, data.today!));

  async function save(b: unknown) {
    setSaving(true);
    setErr("");
    const out = (await patch({ op: "role", ...(b as object) })) as { ok: boolean; body: any };
    if (!out.ok) setErr(out.body?.error ?? "Não deu para salvar o cargo.");
    setSaving(false);
  }
  async function start() {
    if (reusable && !confirm(`Você já tem uma pesquisa deste cargo de ${br(reusable.researchedAt!)}. Fazer outra mesmo assim? (leva de 3 a 10 minutos da sua assinatura)`)) return;
    setErr("");
    const out = await call("/api/estudos/pesquisa", { method: "POST" });
    if (!out.ok) setErr(out.body.error ?? "Não deu para começar.");
    load();
  }
  async function view(id: string) {
    if (id === r?.id) return setViewing(null);
    const out = await call(`/api/estudos/pesquisa?id=${id}`);
    if (out.ok && out.body.research?.data) setViewing({ id, data: out.body.research.data });
  }
  async function use(id: string) {
    await patch({ op: "research-use", id });
    setViewing(null);
  }
  const shown = viewing?.data ?? res;

  return (
    <Section id="vaga" icon={<Target size={18} className="text-accent-2" />} title="A vaga que você busca">
      <div className="panel flex flex-col gap-3 p-4 text-sm">
        <RoleBuilder spec={c.roleSpec} role={c.role} custom={c.customRole} busy={saving} onSpec={(spec) => save({ spec })} onText={(role) => save({ role })} />
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <button disabled={running || saving} onClick={start} className="btn-neon flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-40">
            {running ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
            {running ? "Pesquisando…" : res ? "Fazer uma pesquisa nova" : "Pesquisar as vagas"}
          </button>
          <span className="text-[12px] text-muted">
            para <span className="text-text">{c.role}</span>
          </span>
        </div>
        {running && (
          <p className="text-[12px] text-muted">
            A IA está lendo anúncios reais na web (LinkedIn, Gupy, Glassdoor…). Leva de 3 a 10 minutos e usa o limite da sua assinatura. Pode sair da página: a pesquisa continua e entra no histórico.
          </p>
        )}
        {!running && !res && !r?.error && <p className="text-[12px] text-muted">Ainda sem pesquisa. Cada pesquisa fica salva no histórico, com a data, e vale por 6 meses.</p>}
        {r?.error && !running && <p className="text-[12px] text-down">A última pesquisa falhou: {r.error}</p>}
        {err && <p className="text-[12px] text-down">{err}</p>}
        {stale && !running && <p className="text-[12px] text-warn">Esta pesquisa tem mais de 6 meses. Vale pesquisar de novo.</p>}
        {res && res.role !== c.role && !running && (
          <p className="text-[12px] text-warn">
            A pesquisa em uso é de &quot;{res.role}&quot;. Faça uma pesquisa nova para &quot;{c.role}&quot; ou escolha outra no histórico.
          </p>
        )}
        {history.length > 0 && <ResearchHistory rows={history} activeId={r?.id ?? null} viewingId={viewing?.id ?? null} onView={view} onUse={use} />}
      </div>
      {viewing && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md border border-warn/50 px-3 py-2 text-[13px] text-warn">
          Vendo a pesquisa de {br(viewing.data.researchedAt)}/{viewing.data.researchedAt.slice(0, 4)} ({viewing.data.role}). O cronograma usa outra.
          <button onClick={() => use(viewing.id)} className="btn-ghost px-3 py-1 text-xs">
            Usar esta no cronograma
          </button>
          <button onClick={() => setViewing(null)} className="text-[12px] text-muted underline">
            voltar para a em uso
          </button>
        </div>
      )}
      {shown && <ResearchView res={shown} levels={viewing ? viewing.data.skills.reduce((a, s) => ({ ...a, [s.name]: c.skillStatus[s.name] ?? 0 }), {} as Record<string, SkillLevel>) : (data.levels ?? {})} patch={patch} />}
    </Section>
  );
}

/** O histórico de pesquisas, por dia: abrir uma antiga e escolher qual o cronograma usa. */
function ResearchHistory({ rows, activeId, viewingId, onView, onUse }: { rows: HistoryRow[]; activeId: string | null; viewingId: string | null; onView(id: string): void; onUse(id: string): void }) {
  const byDay = new Map<string, HistoryRow[]>();
  for (const h of rows) {
    const d = h.researchedAt ?? new Date(h.startedAt).toISOString().slice(0, 10);
    byDay.set(d, [...(byDay.get(d) ?? []), h]);
  }
  return (
    <details className="border-t border-border pt-3" open={rows.length > 1}>
      <summary className="flex cursor-pointer items-center gap-1.5 hud-label">
        <History size={12} /> Histórico de pesquisas ({rows.length})
      </summary>
      <div className="mt-2 flex flex-col gap-2">
        {[...byDay].map(([day, list]) => (
          <div key={day}>
            <div className="font-mono text-[11px] text-muted">
              {br(day)}/{day.slice(0, 4)}
            </div>
            <ul className="mt-1 flex flex-col gap-1">
              {list.map((h) => (
                <li key={h.id} className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] ${h.id === activeId ? "border-ok/60" : h.id === viewingId ? "border-warn/60" : "border-border"}`}>
                  <span className="flex-1">
                    {h.role} <span className="text-[11px] text-muted">· {h.level}</span>
                  </span>
                  {h.status === "done" && (
                    <span className="font-mono text-[11px] text-muted">
                      {h.postings} anúncios · {h.skills} habilidades
                    </span>
                  )}
                  {h.status === "running" && <span className="text-[11px] text-muted">pesquisando…</span>}
                  {h.status === "error" && <span className="text-[11px] text-down" title={h.error ?? ""}>falhou</span>}
                  {h.id === activeId && <span className="flex items-center gap-1 text-[11px] text-ok"><Check size={11} /> usada no cronograma</span>}
                  {h.status === "done" && h.id !== activeId && (
                    <>
                      <button onClick={() => onView(h.id)} className="text-[12px] text-accent underline-offset-2 hover:underline">
                        ver
                      </button>
                      <button onClick={() => onUse(h.id)} className="btn-ghost px-2 py-0.5 text-[11px]">
                        usar no cronograma
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}

function ResearchView({ res, levels, patch }: { res: RoleResearch; levels: Record<string, SkillLevel>; patch(b: unknown): Promise<unknown> }) {
  const known = res.skills.filter((s) => (levels[s.name] ?? 0) > 0).length;
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_320px]">
      <div className="panel p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">O que as vagas pedem</h3>
          <span className="font-mono text-[11px] text-muted">
            {res.postingsAnalyzed} anúncios · pesquisa de {br(res.researchedAt)}/{res.researchedAt.slice(0, 4)}
          </span>
        </div>
        <p className="mt-1 text-[12px] text-muted">
          % dos anúncios que pedem cada habilidade. <span className="text-text">Clique no quadradinho do quanto você sabe</span>: isso muda o &quot;pronto para a vaga&quot; e a prioridade do cronograma. Tudo começa em &quot;não sei&quot;.
        </p>
        <div className="mt-3 grid grid-cols-[minmax(0,10rem)_1fr_auto] items-end gap-3 border-b border-border pb-1.5 sm:grid-cols-[minmax(0,14rem)_1fr_auto]">
          <span className="font-mono text-[11px] text-muted">{known} de {res.skills.length} você já estuda ou domina</span>
          <span />
          <span className="flex gap-1">
            {SKILL_LEVELS.map((l) => (
              <span key={l.id} className={`w-14 text-center text-[10px] uppercase tracking-wide ${LEVEL_COLOR[l.id]}`}>
                {l.title}
              </span>
            ))}
          </span>
        </div>
        <ul className="mt-1.5 flex flex-col gap-1">
          {res.skills.map((s) => (
            <SkillRow key={s.name} s={s} level={levels[s.name] ?? 0} onLevel={(l) => patch({ op: "skill", name: s.name, level: l })} />
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-3">
        <div className="panel p-4 text-sm">
          <div className="hud-label">Resumo do mercado</div>
          <p className="mt-2 text-[13px] leading-relaxed">{res.summary}</p>
          {res.band && (
            <p className="mt-3 text-[13px]">
              Faixa CLT:{" "}
              <span className="font-mono text-ok">
                {money(res.band[0])} a {money(res.band[1])}
              </span>
            </p>
          )}
        </div>
        {res.questions.length > 0 && (
          <details className="panel p-4 text-sm">
            <summary className="cursor-pointer hud-label">O que cai nas entrevistas</summary>
            <ul className="mt-2 list-disc pl-5 text-[13px] text-muted">
              {res.questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </details>
        )}
        <details className="panel p-4 text-sm">
          <summary className="cursor-pointer hud-label">Fontes ({res.sources.length})</summary>
          <ul className="mt-2 flex flex-col gap-1 text-[12px]">
            {res.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-accent underline-offset-2 hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
}

const LEVEL_COLOR = ["text-muted", "text-warn", "text-ok"];

const BOX_ON = ["border-muted bg-muted/30 text-text", "border-warn bg-warn/25 text-warn", "border-ok bg-ok/25 text-ok"];

function SkillRow({ s, level, onLevel }: { s: Skill; level: SkillLevel; onLevel(l: SkillLevel): void }) {
  return (
    <li
      className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 rounded-md px-1 py-0.5 hover:bg-panel-2/50 sm:grid-cols-[minmax(0,14rem)_1fr_auto]"
      title={`${s.name}: ${s.frequency}% dos anúncios${s.must ? " (obrigatório na maioria)" : ""} · ${s.category}`}
    >
      <span className="truncate text-[13px]">
        {s.name}
        {s.must && <span className="ml-1 text-[10px] text-accent-2">●</span>}
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3 flex-1 rounded-r-[4px] bg-panel-2">
          <span className="block h-full rounded-r-[4px] bg-accent" style={{ width: `${Math.max(2, s.frequency)}%`, opacity: 0.35 + 0.65 * (s.frequency / 100) }} />
        </span>
        <span className="w-9 text-right font-mono text-[11px] text-muted">{s.frequency}%</span>
      </span>
      <span className="flex gap-1" role="radiogroup" aria-label={`O quanto você sabe de ${s.name}`}>
        {SKILL_LEVELS.map((l) => {
          const on = level === l.id;
          return (
            <span key={l.id} className="flex w-14 justify-center">
              <button
                role="radio"
                aria-checked={on}
                aria-label={l.title}
                title={l.title}
                onClick={() => !on && onLevel(l.id)}
                className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${on ? BOX_ON[l.id] : "border-border hover:border-text"}`}
              >
                {on && <Check size={12} strokeWidth={3} />}
              </button>
            </span>
          );
        })}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Lacunas
// ---------------------------------------------------------------------------

function Gaps({ data }: { data: Data }) {
  if (!data.research?.data || !data.gaps?.length) return null;
  return (
    <Section id="lacunas" icon={<Target size={18} className="text-warn" />} title="O que mais falta para a vaga">
      <div className="panel p-4 text-sm">
        <p className="text-[12px] text-muted">As habilidades mais pedidas que você ainda não domina. O cronograma dá prioridade a elas e às que tiveram nota baixa nas suas entrevistas.</p>
        <ol className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.gaps.map((g, i) => (
            <li key={g.name} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <span className="font-mono text-[11px] text-muted">{i + 1}</span>
              <span className="flex-1">{g.name}</span>
              <span className="font-mono text-[11px] text-muted">{g.frequency}% das vagas</span>
              <span className={`text-[10px] uppercase ${LEVEL_COLOR[data.levels?.[g.name] ?? 0]}`}>{SKILL_LEVELS[data.levels?.[g.name] ?? 0]!.title}</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[12px] text-muted">
          Treinar com nota é a forma mais forte de fixar:{" "}
          <Link href={appUrl("entrevista")} className="text-accent underline">
            fazer uma entrevista de treino
          </Link>
          .
        </p>
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Trilhas
// ---------------------------------------------------------------------------

function Trails({ c, patch, reload, onChat }: { c: CenterData; patch(b: unknown): Promise<unknown>; reload(): Promise<unknown>; onChat(): void }) {
  const [adding, setAdding] = useState(false);
  return (
    <Section
      id="trilhas"
      icon={<BookOpen size={18} className="text-ok" />}
      title="Suas trilhas"
      right={
        <div className="flex gap-2">
          <button onClick={() => setAdding(!adding)} className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs">
            <Plus size={12} /> Adicionar à mão
          </button>
          <button onClick={onChat} className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs">
            <MessageCircle size={12} /> Conversar com a IA
          </button>
        </div>
      }
    >
      {adding && <TrailForm onSave={async (t) => (await patch({ op: "trail-add", trail: t }), setAdding(false))} onCancel={() => setAdding(false)} />}
      {!c.trails.length && !adding && (
        <div className="panel p-4 text-sm text-muted">Nenhuma trilha ainda. Adicione a sua pós, uma certificação, o livro que está lendo ou um projeto sugerido abaixo.</div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {c.trails.map((t) => (
          <TrailCard key={t.id} t={t} patch={patch} reload={reload} />
        ))}
      </div>
    </Section>
  );
}

export function TrailSummary({ t }: { t: Pick<Trail, "kind" | "importance" | "hours" | "deadline"> }) {
  return (
    <span className="font-mono text-[11px] text-muted">
      {kindOf(t.kind).title} · {"●".repeat(t.importance)}
      {"○".repeat(3 - t.importance)}
      {t.hours ? ` · ~${t.hours} h` : ""}
      {t.deadline ? ` · data fixa ${br(t.deadline)}` : ""}
    </span>
  );
}

function TrailCard({ t, patch, reload }: { t: Trail; patch(b: unknown): Promise<unknown>; reload(): Promise<unknown> }) {
  const p = trailProgress(t);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState("");
  const project = t.kind === "projeto";
  const edit = async (b: unknown) => {
    setBusy(true);
    await patch(b);
    setBusy(false);
  };
  return (
    <div className="panel flex flex-col gap-2 p-4 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{t.title}</div>
          <TrailSummary t={t} />
        </div>
        <button aria-label="Remover trilha" onClick={() => confirm(`Remover "${t.title}"?`) && edit({ op: "trail-remove", id: t.id })} className="text-muted hover:text-down">
          <Trash2 size={14} />
        </button>
      </div>
      {t.why && <p className="text-[12px] text-muted">{t.why}</p>}
      <div className="flex items-center gap-2">
        <span className="h-1.5 flex-1 rounded-full bg-panel-2" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Conclusão de ${t.title}`}>
          <span className="block h-full rounded-full bg-ok" style={{ width: `${p.pct}%` }} />
        </span>
        <span className="font-mono text-[11px] text-muted">
          {project && <span className="mr-1.5 text-ok">{p.pct}%</span>}
          {p.done}/{p.total} {t.github && t.units.some((u) => u.issue) ? "issues" : kindOf(t.kind).units}
        </span>
      </div>
      {project && <GithubLink t={t} onChanged={reload} />}
      <TrailScope t={t} busy={busy} onSave={(x) => edit({ op: "trail-update", trail: { ...t, ...x } })} />
      {(t.units.length > 0 || project) && (
        <details className="text-[13px]">
          <summary className="cursor-pointer text-[12px] text-muted">Ver {kindOf(t.kind).units}</summary>
          <ul className="mt-2 flex max-h-64 flex-col gap-1 overflow-y-auto">
            {t.units.map((u) => (
              <li key={u.id} className="group flex items-center gap-2">
                {u.issue ? (
                  // passo que vem do GitHub: só leitura, quem fecha é a issue
                  <a href={u.url} target="_blank" rel="noreferrer" className={`flex flex-1 items-center gap-2 hover:text-accent-2 ${u.done ? "text-ok" : ""}`} title="Abra a issue no GitHub para fechar">
                    <input type="checkbox" readOnly tabIndex={-1} checked={u.done} className="pointer-events-none" />
                    {u.title}
                  </a>
                ) : (
                  <>
                    <label className={`flex flex-1 items-center gap-2 ${u.done ? "text-ok" : ""}`}>
                      <input type="checkbox" disabled={busy} checked={u.done} onChange={(e) => edit({ op: "unit", trailId: t.id, unitId: u.id, done: e.target.checked })} />
                      {u.title}
                    </label>
                    {project && (
                      <button aria-label={`Remover ${u.title}`} disabled={busy} onClick={() => edit({ op: "unit-remove", trailId: t.id, unitId: u.id })} className="text-muted opacity-0 hover:text-down group-hover:opacity-100">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
          {project && !t.units.some((u) => u.issue) && (
            <form
              className="mt-2 flex gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!step.trim()) return;
                await edit({ op: "unit-add", trailId: t.id, title: step });
                setStep("");
              }}
            >
              <input value={step} onChange={(e) => setStep(e.target.value)} placeholder="Novo passo (à mão)" className="min-w-0 flex-1 text-[12px]" />
              <button disabled={busy || !step.trim()} className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-[11px]">
                <Plus size={11} /> Adicionar
              </button>
            </form>
          )}
        </details>
      )}
      {t.skills.length > 0 && <div className="text-[11px] text-muted">Cobre: {t.skills.join(", ")}</div>}
    </div>
  );
}

/** Horas estimadas e data fixa. O ritmo (vezes por semana, minutos) é com o cronograma. */
function TrailScope({ t, busy, onSave }: { t: Trail; busy: boolean; onSave(x: Partial<Trail>): void }) {
  const [hours, setHours] = useState(t.hours ? String(t.hours) : "");
  useEffect(() => setHours(t.hours ? String(t.hours) : ""), [t.hours]);
  const n = Number(hours) || null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-[12px] text-muted">
      <label className="flex items-center gap-1" title="Estimativa da IA (ou sua) para a trilha inteira. O cronograma usa para calcular o ritmo.">
        ~
        <input type="number" min={0} max={2000} disabled={busy} value={hours} onChange={(e) => setHours(e.target.value)} onBlur={() => n !== t.hours && onSave({ hours: n })} className="w-16" placeholder="?" />h no total
      </label>
      <label className="flex items-center gap-1" title="Só se existir de verdade: data da prova, fim da matéria.">
        data fixa
        <input type="date" disabled={busy} value={t.deadline ?? ""} onChange={(e) => onSave({ deadline: e.target.value || null })} />
      </label>
      <span className="text-[11px]">o ritmo fica com o cronograma</span>
    </div>
  );
}

function TrailForm({ onSave, onCancel }: { onSave(t: unknown): Promise<void>; onCancel(): void }) {
  const [f, setF] = useState({ kind: "livro", title: "", units: "", hours: "", importance: 2, deadline: "" });
  const kind = TRAIL_KINDS.find((k) => k.id === f.kind)!;
  return (
    <div className="panel mb-3 grid gap-3 p-4 text-sm md:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="text-[12px] text-muted">Tipo</span>
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
          {TRAIL_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.title}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] text-muted">Nome</span>
        <input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="ex. Designing Data-Intensive Applications" />
      </label>
      <label className="flex flex-col gap-1 md:col-span-2">
        <span className="text-[12px] text-muted">{kind.units[0]!.toUpperCase() + kind.units.slice(1)} (uma por linha)</span>
        <textarea rows={4} value={f.units} onChange={(e) => setF({ ...f, units: e.target.value })} />
      </label>
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <label className="flex items-center gap-1 text-[12px] text-muted">
          horas no total (estimativa) <input type="number" min={0} max={2000} value={f.hours} onChange={(e) => setF({ ...f, hours: e.target.value })} className="w-16" placeholder="?" />
        </label>
        <label className="flex items-center gap-1 text-[12px] text-muted">
          importância
          <select value={f.importance} onChange={(e) => setF({ ...f, importance: Number(e.target.value) })}>
            <option value={3}>essencial para a vaga</option>
            <option value={2}>importante</option>
            <option value={1}>quando sobrar tempo</option>
          </select>
        </label>
        <label className="flex items-center gap-1 text-[12px] text-muted">
          data fixa (se houver) <input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
        </label>
      </div>
      <p className="text-[11px] text-muted md:col-span-2">A trilha guarda o que precisa aprender. Quantas vezes por semana e de quantos minutos fica com o cronograma, pelo seu tempo livre.</p>
      <div className="flex gap-2 md:col-span-2">
        <button disabled={!f.title.trim()} onClick={() => onSave({ ...f, hours: Number(f.hours) || 0, units: f.units.split("\n") })} className="btn-neon px-4 py-2 text-xs disabled:opacity-40">
          Adicionar ▶
        </button>
        <button onClick={onCancel} className="btn-ghost px-3 py-2 text-xs">
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projetos
// ---------------------------------------------------------------------------

function Projects({ data, c, patch, load }: { data: Data; c: CenterData; patch(b: unknown): Promise<unknown>; load(): void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const has = !!data.research?.data;
  async function suggest() {
    setBusy(true);
    setErr("");
    const r = await call("/api/estudos/projetos", { method: "POST" });
    if (!r.ok) setErr(r.body.error ?? "Não deu certo.");
    setBusy(false);
    load();
  }
  const chosen = new Set(c.trails.filter((t) => t.kind === "projeto").map((t) => t.title));
  return (
    <Section
      id="projetos"
      icon={<FolderGit2 size={18} className="text-accent" />}
      title="Projetos para o portfólio"
      right={
        <button disabled={!has || busy} onClick={suggest} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} {c.projectOptions.length ? "Sugerir outros" : "Sugerir 3 projetos"}
        </button>
      }
    >
      {!has && <div className="panel p-4 text-sm text-muted">Os projetos saem da pesquisa da vaga: pesquise primeiro.</div>}
      {busy && <p className="mb-2 text-[12px] text-muted">A IA está montando os projetos a partir das habilidades que faltam (cerca de 1 minuto)…</p>}
      {err && <p className="mb-2 text-[12px] text-down">{err}</p>}
      <div className="grid gap-3 md:grid-cols-3">
        {c.projectOptions.map((p, i) => (
          <div key={p.title} className="panel flex flex-col gap-2 p-4 text-sm">
            <div className="font-semibold">{p.title}</div>
            <span className="font-mono text-[11px] text-muted">
              ~{p.weeks} semanas · {p.deliverables.length} entregas
            </span>
            <p className="text-[13px] text-muted">{p.pitch}</p>
            <div className="text-[11px] text-muted">Pratica: {p.skills.join(", ")}</div>
            <details className="text-[12px]">
              <summary className="cursor-pointer text-muted">Entregas</summary>
              <ol className="mt-1 list-decimal pl-5">
                {p.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ol>
            </details>
            <button disabled={chosen.has(p.title)} onClick={() => patch({ op: "project-choose", index: i })} className="btn-neon mt-auto px-3 py-2 text-xs disabled:opacity-40">
              {chosen.has(p.title) ? "Já está nas trilhas" : "Escolher este ▶"}
            </button>
          </div>
        ))}
      </div>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Cronograma
// ---------------------------------------------------------------------------

function Plan({ data, c, patch, load }: { data: Data; c: CenterData; patch(b: unknown): Promise<unknown>; load(): void }) {
  const [av, setAv] = useState(c.availability);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => setAv(c.availability), [c.availability]);
  const dirty = JSON.stringify(av) !== JSON.stringify(c.availability);
  const s = c.schedule;
  const today = data.today!;
  const profile = data.session?.profile;
  const plan = profile ? planOf(profile.goal, profile.plan) : null;
  const inGoal = !!plan?.items.some((i) => i.kind === "schedule");

  async function generate() {
    setBusy(true);
    setErr("");
    if (dirty) await patch({ op: "availability", availability: av });
    const r = await call("/api/estudos/cronograma", { method: "POST" });
    if (!r.ok) setErr(r.body.error ?? "Não deu certo.");
    setBusy(false);
    load();
  }
  async function useAsGoal() {
    if (!profile || !plan) return;
    await call("/api/perfis", json("PATCH", { id: profile.id, goal: "personalizada", plan: { mode: plan.mode, items: [...plan.items, { id: "cronograma", kind: "schedule" }] } }));
    window.dispatchEvent(new Event("conta-mudou"));
    load();
  }

  const days = s ? [...new Set(s.items.map((i) => i.day).filter((d) => d >= addDaysLocal(today, -3)))].sort() : [];
  const weekMin = av.minutes.reduce((a, m) => a + m, 0);
  return (
    <Section id="cronograma" icon={<CalendarDays size={18} className="text-accent" />} title="Cronograma">
      <div className="panel flex flex-col gap-3 p-4 text-sm">
        <div className="hud-label">Seu tempo livre</div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {WEEKDAYS.map((d, i) => (
            <label key={d} className="flex flex-col gap-1 text-[12px] text-muted">
              {d}
              <select value={av.minutes[i]} onChange={(e) => setAv({ ...av, minutes: av.minutes.map((m, k) => (k === i ? Number(e.target.value) : m)) })}>
                {[0, 15, 20, 30, 45, 60, 90, 120, 180, 240].map((m) => (
                  <option key={m} value={m}>
                    {m ? `${m} min` : "folga"}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-muted">
          <span>
            {Math.floor(weekMin / 60)}h{String(weekMin % 60).padStart(2, "0")} por semana
          </span>
          <label className="flex items-center gap-1">
            pronto até <input type="date" value={av.targetDate ?? ""} onChange={(e) => setAv({ ...av, targetDate: e.target.value || null })} />
          </label>
          <label className="flex items-center gap-1">
            folga para imprevistos
            <select value={av.slack} onChange={(e) => setAv({ ...av, slack: Number(e.target.value) })}>
              {[0, 0.1, 0.2, 0.3].map((x) => (
                <option key={x} value={x}>
                  {Math.round(x * 100)}%
                </option>
              ))}
            </select>
          </label>
          {dirty && (
            <button onClick={() => patch({ op: "availability", availability: av })} className="btn-ghost px-3 py-1 text-xs">
              Salvar
            </button>
          )}
        </div>
        {c.availability.notes && (
          <div className="text-[12px] text-muted">
            Combinados com a IA:
            <ul className="mt-1 list-disc pl-5">
              {c.availability.notes.split("\n").map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
          <button disabled={busy} onClick={generate} className="btn-neon flex items-center gap-2 px-4 py-2 text-xs disabled:opacity-40">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {busy ? "Montando…" : s ? "Replanejar a partir de hoje" : "Montar o cronograma"}
          </button>
          {busy && <span className="text-[12px] text-muted">A IA está encaixando as trilhas no seu tempo (1 a 3 minutos)…</span>}
          {err && <span className="text-[12px] text-down">{err}</span>}
          {s && !inGoal && (
            <button onClick={useAsGoal} className="btn-ghost px-3 py-2 text-xs">
              Pôr o cronograma na meta do dia (placa-mãe)
            </button>
          )}
          {s && inGoal && <span className="text-[12px] text-ok">O cronograma faz parte da sua meta do dia.</span>}
        </div>
        {data.needsReplan && !busy && (
          <div className="rounded-md border border-warn/50 px-3 py-2 text-[13px] text-warn">Hora de replanejar: é domingo ou o cronograma está acabando. O que já passou não muda.</div>
        )}
      </div>

      {data.pace && c.trails.length > 0 && <PaceBox p={data.pace} tips={s?.tips ?? []} />}

      {s && (
        <>
          {s.notes && <p className="mt-3 max-w-4xl text-[13px] leading-relaxed text-muted">{s.notes}</p>}
          <div className="mt-3 flex flex-col gap-2">
            {days.map((d) => (
              <Day key={d} day={d} today={today} items={s.items.filter((i) => i.day === d)} checks={data.checks?.[d] ?? []} av={c.availability} trails={c.trails} onChange={load} />
            ))}
          </div>
          {(data.versions?.length ?? 0) > 1 && (
            <details className="panel mt-3 p-4 text-sm">
              <summary className="cursor-pointer hud-label">Versões do cronograma ({data.versions!.length})</summary>
              <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
                {data.versions!.map((v, i) => (
                  <li key={v.id}>
                    <span className="font-mono text-[11px] text-muted">{new Date(v.createdAt).toLocaleDateString("pt-BR")}</span>
                    {i === 0 && <span className="ml-2 text-[11px] text-ok">atual</span>} <span className="text-muted">· {v.items} blocos</span>
                    {v.notes && <p className="text-[12px] text-muted">{v.notes}</p>}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {s.outline.length > 0 && (
            <details className="panel mt-3 p-4 text-sm">
              <summary className="cursor-pointer hud-label">Próximas semanas (esboço)</summary>
              <ul className="mt-2 flex flex-col gap-1 text-[13px]">
                {s.outline.map((w) => (
                  <li key={w.week + w.focus}>
                    <span className="font-mono text-[11px] text-muted">{w.week}</span> {w.focus}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </Section>
  );
}

/** Seu tempo (o cronograma usa este) x o que seria o ideal para chegar na data alvo, com dicas. */
function PaceBox({ p, tips }: { p: Pace; tips: string[] }) {
  const short = p.idealWeeklyMin != null && p.idealWeeklyMin > p.weeklyMin;
  return (
    <div className={`panel mt-3 grid gap-4 p-4 text-sm md:grid-cols-[1fr_1fr] ${short ? "!border-warn/60" : ""}`}>
      <div>
        <div className="hud-label">Seu tempo x o ideal</div>
        {p.remainingHours > 0 ? (
          <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
            <li>
              Faltam <span className="font-mono text-text">~{p.remainingHours} h</span> nas trilhas{p.unknown.length ? <span className="text-muted"> (sem estimativa: {p.unknown.join(", ")})</span> : ""}.
            </li>
            <li>
              Você deu <span className="font-mono text-text">{hm(p.weeklyMin)}</span> por semana (já sem a folga)
              {p.finishDate ? (
                <>
                  : nesse ritmo termina por volta de <span className="font-mono text-text">{br(p.finishDate)}/{p.finishDate.slice(0, 4)}</span>.
                </>
              ) : (
                "."
              )}
            </li>
            {p.targetDate && p.idealWeeklyMin != null && (
              <li className={short ? "text-warn" : "text-ok"}>
                {short ? (
                  <>
                    Para chegar em {br(p.targetDate)}, o ideal seria <span className="font-mono">{hm(p.idealWeeklyMin)}</span> por semana (~{Math.round(p.idealWeeklyMin / 7)} min por dia).
                  </>
                ) : (
                  <>No seu tempo dá para chegar em {br(p.targetDate)}. 👍</>
                )}
              </li>
            )}
            {!p.targetDate && <li className="text-muted">Ponha uma data em &quot;pronto até&quot; para ver o ritmo ideal.</li>}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-muted">{p.unknown.length ? "Coloque as horas estimadas nas trilhas para ver o ritmo." : "Nada pendente nas trilhas."}</p>
        )}
        <p className="mt-2 text-[11px] text-muted">O cronograma sempre cabe no tempo que você deu. Isto é só um aviso: nada muda sozinho.</p>
      </div>
      <div>
        <div className="flex items-center gap-1.5 hud-label">
          <Lightbulb size={12} /> Dicas para chegar perto do ideal
        </div>
        {tips.length ? (
          <ul className="mt-2 list-disc pl-5 text-[13px] text-muted">
            {tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-muted">Aparecem quando a IA montar ou replanejar o cronograma.</p>
        )}
      </div>
    </div>
  );
}

function addDaysLocal(day: string, n: number) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const KIND_COLOR: Record<string, string> = { estudo: "text-accent", revisao: "text-warn", teste: "text-accent-2", projeto: "text-ok" };

function Day({ day, today, items, checks, av, trails, onChange }: { day: string; today: string; items: ScheduleItem[]; checks: string[]; av: Availability; trails: Trail[]; onChange(): void }) {
  const [busy, setBusy] = useState(false);
  // marca na hora; o servidor confirma em seguida
  const [local, setLocal] = useState<Record<string, boolean>>({});
  const checksKey = checks.join();
  useEffect(() => setLocal({}), [checksKey]);
  const isDone = (i: ScheduleItem) => local[i.id] ?? checks.includes(itemKey(i.id));
  const editable = day === today || day === addDaysLocal(today, -1);
  const done = items.filter(isDone).length;
  const past = day < today;
  async function mark(i: ScheduleItem, d: boolean) {
    setLocal((l) => ({ ...l, [i.id]: d }));
    setBusy(true);
    await call("/api/estudos/feito", json("POST", { itemId: i.id, done: d }));
    setBusy(false);
    onChange();
  }
  return (
    <div className={`panel p-3 text-sm ${day === today ? "!border-accent" : ""} ${past && done < items.length ? "opacity-70" : ""}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-semibold">
          {day === today ? "Hoje" : dayName(day)} <span className="font-mono text-[11px] text-muted">{br(day)}</span>
        </span>
        <span className="font-mono text-[11px] text-muted">
          {done}/{items.length} · {items.reduce((a, i) => a + i.minutes, 0)} de {plannable(av, day)} min
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((i) => {
          const ok = isDone(i);
          const trail = trails.find((t) => t.id === i.trailId);
          return (
            <li key={i.id}>
              <label className={`flex items-start gap-3 rounded-md border px-3 py-2 ${ok ? "border-ok" : "border-border"} ${editable ? "cursor-pointer" : ""}`}>
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--ok)]" disabled={!editable || busy} checked={ok} onChange={(e) => mark(i, e.target.checked)} />
                <span className="flex-1">
                  <span className={ok ? "text-ok" : ""}>{i.title}</span>
                  <span className="block text-[11px] text-muted">
                    {trail ? `${trail.title} · ` : ""}
                    {i.why}
                  </span>
                </span>
                <span className={`font-mono text-[10px] uppercase ${KIND_COLOR[i.kind]}`}>{ITEM_KINDS.find((k) => k.id === i.kind)?.title}</span>
                <span className="w-12 text-right font-mono text-[11px] text-muted">{i.minutes} min</span>
              </label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
