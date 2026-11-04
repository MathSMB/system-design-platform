"use client";

import { GOALS, MAX_ITEMS, METRICS, planOf, type Goal, type GoalItem, type Metric, type Plan } from "@sdp/habit";
import { Plus, X } from "lucide-react";

export interface PlanValue {
  goal: Goal;
  plan: Plan;
}

export const planValue = (goal: string, saved?: unknown): PlanValue => ({ goal: (GOALS.some((g) => g.id === goal) || goal === "personalizada" ? goal : "sugerida") as Goal, plan: planOf(goal, saved) });

const newId = (items: GoalItem[]) => {
  let n = items.length + 1;
  while (items.some((i) => i.id === `i${n}`)) n++;
  return `i${n}`;
};

/**
 * Meta diária: escolha um modelo (o "Sugerido" é o padrão) ou monte a sua.
 * Itens manuais são o seu tipo de estudo (você marca o check); itens da plataforma contam sozinhos.
 */
export function PlanEditor({ value, onChange }: { value: PlanValue; onChange(v: PlanValue): void }) {
  const { goal, plan } = value;
  const edit = (p: Plan) => onChange({ goal: "personalizada", plan: p });
  const setItem = (i: number, it: GoalItem) => edit({ ...plan, items: plan.items.map((x, k) => (k === i ? it : x)) });

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="grid gap-2 sm:grid-cols-5">
        {GOALS.map((g) => (
          <button key={g.id} type="button" onClick={() => onChange({ goal: g.id, plan: g.plan })} className={`panel flex flex-col gap-1 p-3 text-left transition-colors ${goal === g.id ? "!border-ok" : "hover:border-muted"}`}>
            <span className={`font-display text-[10px] ${goal === g.id ? "text-ok" : ""}`}>{g.title}</span>
            <span className="text-[12px] text-muted">{g.rule}</span>
            <span className="font-mono text-[11px] text-muted">~{g.minutes} min</span>
          </button>
        ))}
        <button type="button" onClick={() => edit(plan)} className={`panel flex flex-col gap-1 p-3 text-left transition-colors ${goal === "personalizada" ? "!border-ok" : "hover:border-muted"}`}>
          <span className={`font-display text-[10px] ${goal === "personalizada" ? "text-ok" : ""}`}>Do seu jeito</span>
          <span className="text-[12px] text-muted">Você escreve o que vai estudar e marca o check todo dia.</span>
        </button>
      </div>

      <div className="panel flex flex-col gap-2 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="hud-label">Itens da meta</span>
          <label className="flex items-center gap-2 text-[12px] text-muted">
            Conta como cumprida com
            <select value={plan.mode} onChange={(e) => edit({ ...plan, mode: e.target.value as Plan["mode"] })}>
              <option value="all">todos os itens</option>
              <option value="any">qualquer um dos itens</option>
            </select>
          </label>
        </div>
        {plan.items.map((it, i) => (
          <div key={it.id} className="flex flex-wrap items-center gap-2">
            <span className={`w-20 shrink-0 font-mono text-[10px] uppercase ${it.kind === "manual" ? "text-accent" : "text-ok"}`}>{it.kind === "manual" ? "você marca" : "automático"}</span>
            {it.kind === "manual" ? (
              <input value={it.text} maxLength={120} onChange={(e) => setItem(i, { ...it, text: e.target.value })} placeholder="ex. 1 hora de Spring Boot" className="min-w-48 flex-1" />
            ) : (
              <>
                <input type="number" min={1} max={20} value={it.target} onChange={(e) => setItem(i, { ...it, target: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })} className="w-16" />
                <select value={it.metric} onChange={(e) => setItem(i, { ...it, metric: e.target.value as Metric })} className="min-w-48 flex-1">
                  {METRICS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.many}
                    </option>
                  ))}
                </select>
              </>
            )}
            <button type="button" aria-label="Remover item" disabled={plan.items.length === 1} onClick={() => edit({ ...plan, items: plan.items.filter((_, k) => k !== i) })} className="text-muted hover:text-down disabled:opacity-30">
              <X size={15} />
            </button>
          </div>
        ))}
        {plan.items.length < MAX_ITEMS && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => edit({ ...plan, items: [...plan.items, { id: newId(plan.items), kind: "manual", text: "" }] })} className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-[12px]">
              <Plus size={12} /> Estudo do seu jeito
            </button>
            <button type="button" onClick={() => edit({ ...plan, items: [...plan.items, { id: newId(plan.items), kind: "platform", metric: "answers", target: 1 }] })} className="btn-ghost flex items-center gap-1 px-2.5 py-1 text-[12px]">
              <Plus size={12} /> Atividade da plataforma
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Pronto para salvar? (todo item manual precisa de texto) */
export const planReady = (p: Plan) => p.items.length > 0 && p.items.every((i) => i.kind !== "manual" || i.text.trim().length > 0);
