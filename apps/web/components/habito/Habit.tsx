"use client";

import { EMPTY, GOALS, addDays, intensity, progressText, weekOf, type DayCounts, type DayResult, type DayState, type HabitSummary } from "@sdp/habit";
import { Flame, Server, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { profileTitle, type SessionData } from "@/components/conta/Account";

interface Data {
  db: boolean;
  session?: SessionData | null;
  title?: string;
  habit?: HabitSummary | null;
  counts?: Record<string, DayCounts>;
}

const STATE: Record<DayState, { color: string; label: string }> = {
  done: { color: "var(--ok)", label: "meta cumprida" },
  recovered: { color: "var(--accent)", label: "recuperado com a meta em dobro" },
  failover: { color: "var(--warn)", label: "failover (dia perdido, ofensiva mantida)" },
  risk: { color: "var(--bad)", label: "em risco: recupere hoje com a meta em dobro" },
  down: { color: "var(--down)", label: "fora do ar (ofensiva zerou)" },
  today: { color: "var(--muted)", label: "hoje, ainda sem a meta" },
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const br = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

export function Habit() {
  const [data, setData] = useState<Data | null>(null);
  const load = () =>
    fetch("/api/habito")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ db: false }));
  useEffect(() => {
    load();
  }, []);

  async function switchProfile(id: string) {
    await fetch("/api/perfis", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, active: true }) });
    window.dispatchEvent(new Event("conta-mudou"));
    load();
  }

  const h = data?.habit;
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-ok">
        <Server size={14} /> Hábito
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Seu <span className="text-ok glow">datacenter.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">Cada dia de meta cumprida sobe um servidor. A meta é marcada sozinha pelo que você faz na plataforma: respostas avaliadas pela IA, etapas do processo seletivo e casos de system design.</p>

      {!data && <p className="mt-8 text-muted">Carregando…</p>}
      {data && !data.db && (
        <div className="panel mt-8 p-4 text-sm text-muted">
          O hábito precisa do banco de dados. Coloque a <code className="text-text">DATABASE_URL</code> do Neon no <code className="text-text">apps/web/.env.local</code>, rode{" "}
          <code className="text-text">pnpm --filter web db:push</code> e reinicie o <code className="text-text">pnpm dev</code>.
        </div>
      )}
      {data?.db && !data.session && (
        <div className="panel mt-8 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-muted">Entre na sua conta para ter o seu rack. É só um clique, sem senha.</span>
          <Link href="/conta" className="btn-neon px-4 py-2 text-xs">
            Entrar ▶
          </Link>
        </div>
      )}
      {data?.session && !h && (
        <div className="panel mt-8 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-muted">Crie um perfil (a vaga que você treina) e escolha a meta diária.</span>
          <Link href="/conta" className="btn-neon px-4 py-2 text-xs">
            Criar perfil ▶
          </Link>
        </div>
      )}

      {data?.session && h && (
        <div className="mt-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">{data.title}</span>
            <span className="font-mono text-[11px] text-muted">meta {GOALS.find((g) => g.id === h.goal)?.title.toLowerCase()}</span>
            {data.session.profiles.length > 1 && (
              <select value={data.session.profile?.id} onChange={(e) => switchProfile(e.target.value)} className="ml-auto text-xs">
                {data.session.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {profileTitle(p)}
                  </option>
                ))}
              </select>
            )}
            <Link href="/conta" className={`text-[12px] text-muted underline hover:text-ok ${data.session.profiles.length > 1 ? "" : "ml-auto"}`}>
              perfis e meta
            </Link>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat icon={<Flame size={16} />} label="Ofensiva" value={`${h.streak} ${h.streak === 1 ? "dia" : "dias"}`} tone="text-ok" />
            <Stat icon={<Trophy size={16} />} label="Recorde" value={`${h.best} ${h.best === 1 ? "dia" : "dias"}`} />
            <Stat icon={<ShieldCheck size={16} />} label="Failovers da semana" value={`${h.failoversLeft} de ${h.failoversPerWeek}`} tone={h.failoversLeft ? "text-warn" : "text-down"} />
            <Stat icon={<Server size={16} />} label="Servidores no ar" value={String(h.online)} />
          </div>

          <Today h={h} />
          <Rack h={h} />
          <Milestones h={h} />
          <Calendar h={h} counts={data.counts ?? {}} />
        </div>
      )}
    </main>
  );
}

function Stat({ icon, label, value, tone = "" }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="panel flex flex-col gap-1 p-3">
      <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-muted">
        {icon} {label}
      </span>
      <span className={`font-display text-[15px] ${tone}`}>{value}</span>
    </div>
  );
}

function Today({ h }: { h: HabitSummary }) {
  const c = h.todayCounts;
  return (
    <div className={`panel flex flex-col gap-2 p-4 text-sm ${h.todayDone ? "!border-ok" : h.recoverToday ? "!border-bad" : ""}`}>
      <div className="hud-label">Hoje</div>
      <div className={h.todayDone ? "text-ok" : ""}>{progressText(h.goal, c)}</div>
      {h.recoverToday && !h.todayDone && (
        <div className="text-bad">Ontem o servidor caiu e a semana já não tem failover. Faça a meta em dobro hoje para recuperar e manter a ofensiva.</div>
      )}
      {h.recoverToday && h.todayDone && <div className="text-bad">Para recuperar ontem, faça a meta em dobro hoje.</div>}
      <div className="flex flex-wrap gap-4 font-mono text-[12px] text-muted">
        <span>{plural(c.answers, "resposta", "respostas")}</span>
        <span>{plural(c.stages, "etapa", "etapas")}</span>
        <span>{plural(c.processes, "processo", "processos")}</span>
        <span>{plural(c.designs, "caso de system design", "casos de system design")}</span>
      </div>
      <div className="flex flex-wrap gap-2 pt-1 text-[12px]">
        <Link href="/entrevista/java" className="btn-ghost px-3 py-1">
          Responder perguntas
        </Link>
        <Link href="/processo-seletivo" className="btn-ghost px-3 py-1">
          Processo seletivo
        </Link>
        <Link href="/entrevista/system-design" className="btn-ghost px-3 py-1">
          Caso de system design
        </Link>
      </div>
    </div>
  );
}

/** O rack: um servidor por dia, 7 por rack. Os mais antigos ficam à esquerda. */
function Rack({ h }: { h: HabitSummary }) {
  const MAX = 12;
  const racks: DayResult[][] = [];
  h.days.forEach((d, i) => (i % 7 === 0 ? racks.push([d]) : racks[racks.length - 1]!.push(d)));
  const hidden = Math.max(0, racks.length - MAX);
  const shown = racks.slice(hidden);
  const toNext = h.nextTier ? h.nextTier.min - h.streak : 0;
  return (
    <div className="panel flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="hud-label">Infraestrutura</div>
          <div className="mt-1 font-display text-[14px] text-ok glow">{h.tier.title}</div>
        </div>
        <div className="text-[12px] text-muted">
          {h.nextTier ? `${toNext} ${toNext === 1 ? "dia seguido" : "dias seguidos"} para ${h.nextTier.title}` : "Nível máximo de infraestrutura."}
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {hidden > 0 && <div className="self-center font-mono text-[11px] text-muted">+{hidden} racks antes</div>}
        {shown.map((r, i) => (
          <RackSvg key={r[0]!.day} days={r} index={hidden + i + 1} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
        {(Object.keys(STATE) as DayState[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s === "today" ? "transparent" : STATE[s].color, border: s === "today" ? "1px dashed var(--muted)" : undefined }} />
            {STATE[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}

function RackSvg({ days, index }: { days: DayResult[]; index: number }) {
  const W = 92;
  const U = 15;
  const H = 7 * (U + 3) + 20;
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Rack ${index}`}>
        <rect x={1} y={1} width={W - 2} height={H - 2} rx={4} fill="var(--panel-2)" stroke="var(--border)" />
        <rect x={6} y={5} width={W - 12} height={5} rx={1} fill="var(--border)" />
        {Array.from({ length: 7 }, (_, slot) => {
          const d = days[slot];
          // de baixo para cima
          const y = H - 8 - (slot + 1) * (U + 3) + 3;
          if (!d) return <rect key={slot} x={8} y={y} width={W - 16} height={U} rx={2} fill="none" stroke="var(--border)" strokeDasharray="2 3" />;
          const st = STATE[d.state];
          const on = d.state !== "today";
          return (
            <g key={slot}>
              <title>{`${br(d.day)}: ${st.label}`}</title>
              <rect
                x={8}
                y={y}
                width={W - 16}
                height={U}
                rx={2}
                fill={on ? `color-mix(in srgb, ${st.color} 18%, var(--bg))` : "none"}
                stroke={st.color}
                strokeDasharray={on ? undefined : "3 2"}
                className={d.state === "risk" || d.state === "today" ? "rack-blink" : undefined}
              />
              {on && (
                <>
                  <circle cx={15} cy={y + U / 2} r={2.2} fill={st.color} className={d.state === "done" ? "rack-led" : undefined} style={{ animationDelay: `${(slot * 0.37) % 1.4}s` }} />
                  <circle cx={22} cy={y + U / 2} r={2.2} fill={st.color} opacity={0.6} />
                  {[0, 1, 2, 3].map((k) => (
                    <rect key={k} x={44 + k * 8} y={y + 4} width={5} height={U - 8} rx={1} fill={st.color} opacity={0.35} />
                  ))}
                </>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption className="font-mono text-[10px] text-muted">
        {br(days[0]!.day)} · R{index}
      </figcaption>
    </figure>
  );
}

function Milestones({ h }: { h: HabitSummary }) {
  return (
    <div className="flex flex-wrap gap-2">
      {h.milestones.map((m) => (
        <div key={m.days} className={`panel flex items-center gap-2 px-3 py-2 text-[12px] ${m.reached ? "!border-ok text-ok" : "text-muted"}`}>
          <Trophy size={13} />
          {m.days} dias {m.days === 66 && <span className="text-[11px] text-muted">(tempo médio para virar hábito)</span>}
          {m.reached && " ✓"}
        </div>
      ))}
    </div>
  );
}

/** Calendário do último ano, estilo GitHub: um quadrado por dia. */
function Calendar({ h, counts }: { h: HabitSummary; counts: Record<string, DayCounts> }) {
  const first = weekOf(addDays(h.today, -364));
  const weeks: string[][] = [];
  for (let w = first; w <= h.today; w = addDays(w, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  const C = 11;
  const G = 3;
  const OP = [0, 0.25, 0.5, 0.75, 1];
  const months = weeks.map((w, i) => (i === 0 || w[0]!.slice(5, 7) !== weeks[i - 1]![0]!.slice(5, 7) ? MONTHS[Number(w[0]!.slice(5, 7)) - 1] : ""));
  const failover = new Set(h.days.filter((d) => d.state === "failover").map((d) => d.day));
  // no celular, começa mostrando as semanas mais recentes
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (box.current) box.current.scrollLeft = box.current.scrollWidth;
  }, []);
  return (
    <div className="panel flex flex-col gap-2 p-4">
      <div className="hud-label">Último ano</div>
      <div ref={box} className="overflow-x-auto">
        <svg width={weeks.length * (C + G) + 4} height={7 * (C + G) + 18}>
          {months.map((m, i) =>
            m ? (
              <text key={i} x={i * (C + G)} y={10} fontSize={9} fill="var(--muted)">
                {m}
              </text>
            ) : null,
          )}
          {weeks.map((w, i) =>
            w.map((d, j) => {
              if (d > h.today) return null;
              const c = counts[d] ?? EMPTY;
              const n = intensity(h.goal, c);
              return (
                <rect
                  key={d}
                  x={i * (C + G)}
                  y={16 + j * (C + G)}
                  width={C}
                  height={C}
                  rx={2}
                  fill={n ? `color-mix(in srgb, var(--ok) ${OP[n]! * 100}%, var(--bg))` : "var(--panel-2)"}
                  stroke={failover.has(d) ? "var(--warn)" : d === h.today ? "var(--text)" : "var(--border)"}
                  strokeWidth={0.8}
                >
                  <title>{`${br(d)}: ${c.answers} respostas, ${c.stages} etapas, ${c.processes} processos, ${c.designs} casos${failover.has(d) ? " · failover" : ""}`}</title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
        menos
        {OP.map((o, i) => (
          <span key={i} className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: i ? `color-mix(in srgb, var(--ok) ${o * 100}%, var(--bg))` : "var(--panel-2)" }} />
        ))}
        mais · borda amarela = failover
      </div>
    </div>
  );
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
