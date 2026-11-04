"use client";

import { METRICS, PARTS, SCHEDULE_TEXT, WEAR, addDays, intensity, itemDone, itemText, planText, weekOf, type DayResult, type DayState, type GoalItem, type HabitSummary } from "@sdp/habit";
import { Cpu, Flame, RotateCcw, ShieldCheck, Trophy, Wrench } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { profileTitle, type SessionData, PlanEditor, planReady, planValue, type PlanValue, appUrl } from "@sdp/ui";
import { Board } from "./Board";
import { HabitIntro } from "./Intro";

interface Data {
  db: boolean;
  session?: SessionData | null;
  title?: string;
  habit?: HabitSummary | null;
}

const STATE: Record<DayState, { color: string; label: string }> = {
  install: { color: "var(--ok)", label: "meta cumprida, peça nova" },
  repair: { color: "var(--accent)", label: "meta cumprida, conserto" },
  overclock: { color: "var(--ok)", label: "meta cumprida, overclock" },
  failover: { color: "var(--warn)", label: "failover (nada quebrou)" },
  wear: { color: "var(--bad)", label: "dia perdido, desgaste" },
  burn: { color: "var(--down)", label: "a máquina queimou" },
  today: { color: "var(--muted)", label: "hoje" },
};
const LEGEND: DayState[] = ["install", "repair", "failover", "wear", "burn"];

const br = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

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
    await fetch("/api/perfis", json("PATCH", { id, active: true }));
    window.dispatchEvent(new Event("conta-mudou"));
    load();
  }

  const h = data?.habit;
  const profile = data?.session?.profile;
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {data?.session && (
        <>
          <div className="flex items-center gap-2 hud-label !text-ok">
            <Cpu size={14} /> Hábito
          </div>
          <h1 className="mt-3 font-display text-xl leading-relaxed">
            Sua <span className="text-ok glow">máquina.</span>
          </h1>
          <p className="mt-3 max-w-3xl text-muted">
            Cada dia de meta cumprida instala uma peça na placa-mãe. Dia perdido gasta um failover da semana; sem failover, a máquina se desgasta. O próximo dia cumprido conserta um nível de desgaste.
            Se o desgaste chegar ao fim, a máquina queima e a montagem recomeça do zero.
          </p>
        </>
      )}
      <HabitIntro />
      <div id="comecar" className="scroll-mt-20" />

      {!data && <p className="mt-8 text-muted">Carregando…</p>}
      {data && !data.db && (
        <div className="panel mt-8 p-4 text-sm text-muted">
          O banco não respondeu. Abra o Docker Desktop, rode <code className="text-text">pnpm db:up</code> na raiz do projeto e reinicie o <code className="text-text">pnpm dev</code>.
        </div>
      )}
      {data?.session && !h && (
        <div className="panel mt-8 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-muted">Crie um perfil (a vaga que você treina) e defina a sua meta diária.</span>
          <Link href={appUrl("painel", "/conta")} className="btn-neon px-4 py-2 text-xs">
            Criar perfil ▶
          </Link>
        </div>
      )}

      {data?.session && h && profile && (
        <div className="mt-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">{data.title}</span>
            {data.session.profiles.length > 1 && (
              <select value={profile.id} onChange={(e) => switchProfile(e.target.value)} className="ml-auto text-xs">
                {data.session.profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {profileTitle(p)}
                  </option>
                ))}
              </select>
            )}
            <Link href={appUrl("painel", "/conta")} className={`text-[12px] text-muted underline hover:text-ok ${data.session.profiles.length > 1 ? "" : "ml-auto"}`}>
              perfis
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat icon={<Flame size={16} />} label="Ofensiva" value={`${h.streak} ${h.streak === 1 ? "dia" : "dias"}`} tone="text-ok" />
            <Stat icon={<Trophy size={16} />} label="Recorde" value={`${h.best} ${h.best === 1 ? "dia" : "dias"}`} />
            <Stat icon={<ShieldCheck size={16} />} label="Failovers da semana" value={`${h.failoversLeft} de ${h.failoversPerWeek}`} tone={h.failoversLeft ? "text-warn" : "text-down"} />
            <Stat icon={<Cpu size={16} />} label="Peças" value={h.board.parts >= PARTS.length ? `${PARTS.length} · OC +${h.board.overclock}` : `${h.board.parts} de ${PARTS.length}`} />
            <Stat icon={<Wrench size={16} />} label="Desgaste" value={`${h.board.wear} de ${WEAR.length}`} tone={h.board.wear ? "text-bad" : ""} />
          </div>

          <Today h={h} onChange={load} profileId={profile.id} goal={profile.goal} saved={profile.plan} />
          <Board board={h.board} profileId={profile.id} />
          {h.board.reboots > 0 && (
            <p className="-mt-3 flex items-center gap-2 text-[12px] text-muted">
              <RotateCcw size={13} /> A máquina já queimou {h.board.reboots === 1 ? "1 vez" : `${h.board.reboots} vezes`}; as marcas de queimado ficam na placa.
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Parts h={h} />
            <Wear h={h} />
          </div>
          <Milestones h={h} />
          <Calendar h={h} />
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
      <span className={`font-display text-[13px] ${tone}`}>{value}</span>
    </div>
  );
}

/** A meta de hoje: itens da plataforma contam sozinhos; os seus você marca. */
function Today({ h, onChange, profileId, goal, saved }: { h: HabitSummary; onChange(): void; profileId: string; goal: string; saved?: unknown }) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<PlanValue | null>(null);
  const [error, setError] = useState("");
  const yesterday = h.days[h.days.length - 2];
  const manual = h.plan.items.filter((i) => i.kind === "manual");
  const missedYesterday = yesterday && manual.length > 0 && !["install", "repair", "overclock"].includes(yesterday.state);

  async function check(item: GoalItem, done: boolean, day?: string) {
    setBusy(true);
    await fetch("/api/checkin", json("POST", { itemId: item.id, done, day }));
    setBusy(false);
    onChange();
  }
  async function savePlan() {
    if (!editing) return;
    setError("");
    const r = await fetch("/api/perfis", json("PATCH", { id: profileId, ...editing }));
    if (!r.ok) return setError((await r.json().catch(() => ({}))).error ?? "Não deu para salvar.");
    setEditing(null);
    window.dispatchEvent(new Event("conta-mudou"));
    onChange();
  }

  return (
    <div className={`panel flex flex-col gap-3 p-4 text-sm ${h.todayDone ? "!border-ok" : h.board.wear ? "!border-bad" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="hud-label">Meta de hoje</div>
        <button onClick={() => setEditing(editing ? null : planValue(goal, saved))} className="text-[12px] text-muted underline hover:text-ok">
          {editing ? "fechar" : "editar meta"}
        </button>
      </div>
      {h.todayDone ? (
        <div className="text-ok">{h.board.wear ? "Meta cumprida. Amanhã conserta mais um nível." : "Meta cumprida. Volte amanhã para a próxima peça."}</div>
      ) : (
        <div className="text-muted">
          {h.plan.mode === "any" ? "Qualquer um dos itens cumpre a meta." : "Cumpra todos os itens."}
          {h.board.wear > 0 && <span className="text-bad"> Cumprir hoje conserta um nível de desgaste.</span>}
        </div>
      )}
      <ul className="flex flex-col gap-2">
        {h.plan.items.map((it) => (
          <Item key={it.id} it={it} h={h} busy={busy} onCheck={(d) => check(it, d)} />
        ))}
      </ul>
      {missedYesterday && (
        <details className="text-[12px] text-muted">
          <summary className="cursor-pointer">Estudou ontem e esqueceu de marcar?</summary>
          <div className="mt-2 flex flex-col gap-1.5">
            {manual.map((it) => (
              <label key={it.id} className="flex items-center gap-2">
                <input type="checkbox" disabled={busy} checked={yesterday.checks.includes(it.id)} onChange={(e) => check(it, e.target.checked, yesterday.day)} />
                {br(yesterday.day)}: {itemText(it)}
              </label>
            ))}
          </div>
        </details>
      )}
      {editing && (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <PlanEditor value={editing} onChange={setEditing} />
          <p className="text-[12px] text-muted">A meta nova vale a partir de hoje; os dias anteriores continuam com a meta antiga.</p>
          <div className="flex items-center gap-3">
            <button disabled={!planReady(editing.plan)} onClick={savePlan} className="btn-neon px-4 py-2 text-xs disabled:opacity-40">
              Salvar meta ▶
            </button>
            {error && <span className="text-[12px] text-down">{error}</span>}
          </div>
        </div>
      )}
      {!editing && <div className="text-[12px] text-muted">Meta: {planText(h.plan)}</div>}
    </div>
  );
}

function Item({ it, h, busy, onCheck }: { it: GoalItem; h: HabitSummary; busy: boolean; onCheck(done: boolean): void }) {
  const done = itemDone(it, h.todayCounts, h.todayChecks);
  if (it.kind === "manual")
    return (
      <li>
        <label className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 transition-colors ${done ? "border-ok text-ok" : "border-border hover:border-muted"}`}>
          <input type="checkbox" className="h-4 w-4 accent-[var(--ok)]" disabled={busy} checked={done} onChange={(e) => onCheck(e.target.checked)} />
          <span className="flex-1">{it.text}</span>
          <span className="font-mono text-[10px] uppercase text-muted">você marca</span>
        </label>
      </li>
    );
  if (it.kind === "schedule")
    return (
      <li className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 ${done ? "border-ok text-ok" : "border-border"}`}>
        <span className="flex-1">{SCHEDULE_TEXT}</span>
        {!done && (
          <Link href={appUrl("estudos", "/#cronograma")} className="btn-ghost px-2.5 py-1 text-[11px]">
            Ver o de hoje
          </Link>
        )}
        <span className="font-mono text-[10px] uppercase text-muted">automático</span>
      </li>
    );
  const m = METRICS.find((x) => x.id === it.metric)!;
  const n = Math.min(h.todayCounts[it.metric], it.target);
  return (
    <li className={`flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 ${done ? "border-ok text-ok" : "border-border"}`}>
      <span className="font-mono text-[12px]">
        {n}/{it.target}
      </span>
      <span className="flex-1">{itemText(it)}</span>
      {!done && (
        <Link href={appUrl(m.app, m.href)} className="btn-ghost px-2.5 py-1 text-[11px]">
          Fazer agora
        </Link>
      )}
      <span className="font-mono text-[10px] uppercase text-muted">automático</span>
    </li>
  );
}

function Parts({ h }: { h: HabitSummary }) {
  return (
    <div className="panel flex flex-col gap-2 p-4">
      <div className="hud-label">
        Peças ({Math.min(h.board.parts, PARTS.length)} de {PARTS.length})
      </div>
      <ol className="grid gap-x-4 gap-y-1 text-[13px] sm:grid-cols-2">
        {PARTS.map((p, i) => (
          <li key={p.id} className={i < h.board.parts ? "text-ok" : i === h.board.parts ? "text-text" : "text-muted"} title={p.d}>
            {i < h.board.parts ? "✓" : i === h.board.parts ? "▸" : "·"} {p.name}
          </li>
        ))}
      </ol>
      {h.board.parts >= PARTS.length && <p className="text-[12px] text-muted">Placa completa. Cada dia cumprido agora vira overclock: as ventoinhas giram mais rápido.</p>}
    </div>
  );
}

function Wear({ h }: { h: HabitSummary }) {
  return (
    <div className="panel flex flex-col gap-2 p-4">
      <div className="hud-label">Desgaste</div>
      <ol className="flex flex-col gap-1.5 text-[13px]">
        {WEAR.map((w, i) => {
          const on = i < h.board.wear;
          return (
            <li key={w.name} className={on ? "text-bad" : "text-muted"}>
              <span className="font-mono">{i + 1}.</span> <span className={on ? "font-semibold" : ""}>{w.name}</span>
              <span className="text-[12px]"> · {w.items.join("; ")}</span>
            </li>
          );
        })}
      </ol>
    </div>
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
function Calendar({ h }: { h: HabitSummary }) {
  const byDay = new Map<string, DayResult>(h.days.map((d) => [d.day, d]));
  const first = weekOf(addDays(h.today, -364));
  const weeks: string[][] = [];
  for (let w = first; w <= h.today; w = addDays(w, 7)) weeks.push(Array.from({ length: 7 }, (_, i) => addDays(w, i)));
  const C = 11;
  const G = 3;
  const OP = [0, 0.25, 0.5, 0.75, 1];
  const months = weeks.map((w, i) => (i === 0 || w[0]!.slice(5, 7) !== weeks[i - 1]![0]!.slice(5, 7) ? MONTHS[Number(w[0]!.slice(5, 7)) - 1] : ""));
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
            w.map((day, j) => {
              if (day > h.today) return null;
              const d = byDay.get(day);
              const st = d?.state;
              const n = d ? intensity(h.plan, d.counts, d.checks) : 0;
              const fill =
                st === "wear" || st === "burn" ? `color-mix(in srgb, ${STATE[st].color} 70%, var(--bg))` : n ? `color-mix(in srgb, var(--ok) ${OP[n]! * 100}%, var(--bg))` : "var(--panel-2)";
              const stroke = st === "failover" ? "var(--warn)" : st === "repair" ? "var(--accent)" : day === h.today ? "var(--text)" : "var(--border)";
              return (
                <rect key={day} x={i * (C + G)} y={16 + j * (C + G)} width={C} height={C} rx={2} fill={fill} stroke={stroke} strokeWidth={0.8}>
                  <title>{`${br(day)}${st ? `: ${STATE[st].label}` : ""}${d?.part ? ` (${PARTS.find((p) => p.id === d.part)?.name})` : ""}`}</title>
                </rect>
              );
            }),
          )}
        </svg>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
        {LEGEND.map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={
                s === "failover" || s === "repair" ? { border: `1px solid ${STATE[s].color}` } : { background: s === "install" ? "var(--ok)" : `color-mix(in srgb, ${STATE[s].color} 70%, var(--bg))` }
              }
            />
            {STATE[s].label}
          </span>
        ))}
      </div>
    </div>
  );
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
