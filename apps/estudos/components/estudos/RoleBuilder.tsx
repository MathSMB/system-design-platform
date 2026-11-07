"use client";

import {
  AREA_OPTIONS,
  BACK_LANGS,
  DEV_FOCUS,
  FRONT_LANGS,
  ROLE_AREAS,
  ROLE_LEVELS,
  cleanRoleSpec,
  roleName,
  type RoleArea,
  type RoleSpec,
} from "@sdp/study";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

type Draft = Partial<RoleSpec>;

/** Monta o cargo em passos de clique: área → back/front/full → linguagens → senioridade. */
export function RoleBuilder({
  spec,
  role,
  custom,
  busy,
  onSpec,
  onText,
}: {
  spec: RoleSpec | null;
  role: string;
  custom: boolean;
  busy: boolean;
  onSpec(s: RoleSpec): void;
  onText(role: string): void;
}) {
  const [d, setD] = useState<Draft>(spec ?? {});
  const [free, setFree] = useState(custom && !spec);
  const [text, setText] = useState(role);
  useEffect(() => setD(spec ?? {}), [spec]);
  useEffect(() => setText(role), [role]);

  const done = cleanRoleSpec(d);
  const name = done ? roleName(done) : null;
  const changed = !!name && name !== role;
  const set = (p: Draft) => setD((x) => ({ ...x, ...p }));
  const area = (a: RoleArea) => setD({ area: a, level: d.level });

  // cada passo só aparece quando o anterior foi escolhido
  const steps: { label: string; show: boolean; options: { id: string; title: string }[]; value?: string; pick(id: string): void }[] = [
    { label: "1. Área", show: true, options: ROLE_AREAS, value: d.area, pick: (id) => area(id as RoleArea) },
    { label: "2. Foco", show: d.area === "dev", options: DEV_FOCUS, value: d.focus, pick: (id) => set({ focus: id as RoleSpec["focus"], back: undefined, front: undefined }) },
    { label: "3. Linguagem do back-end", show: d.area === "dev" && !!d.focus && d.focus !== "front", options: BACK_LANGS, value: d.back, pick: (id) => set({ back: id }) },
    {
      label: d.focus === "full" ? "4. Linguagem do front-end" : "3. Linguagem do front-end",
      show: d.area === "dev" && (d.focus === "front" || (d.focus === "full" && !!d.back)),
      options: FRONT_LANGS,
      value: d.front,
      pick: (id) => set({ front: id }),
    },
    { label: "2. Especialidade", show: !!d.area && d.area !== "dev", options: d.area && d.area !== "dev" ? AREA_OPTIONS[d.area] : [], value: d.option, pick: (id) => set({ option: id }) },
  ];
  const ready = d.area === "dev" ? !!d.focus && (d.focus === "front" ? !!d.front : d.focus === "back" ? !!d.back : !!d.back && !!d.front) : !!d.option;

  if (free)
    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex min-w-64 flex-1 flex-col gap-1">
            <span className="text-[12px] text-muted">Cargo escrito do seu jeito</span>
            <input value={text} maxLength={100} onChange={(e) => setText(e.target.value)} placeholder="ex. Desenvolvedor Java Pleno" />
          </label>
          {text.trim() && text.trim() !== role && (
            <button disabled={busy} onClick={() => onText(text)} className="btn-ghost px-3 py-2 text-xs">
              Salvar cargo
            </button>
          )}
        </div>
        <button onClick={() => setFree(false)} className="self-start text-[12px] text-accent underline-offset-2 hover:underline">
          montar o cargo passo a passo
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      {steps
        .filter((s) => s.show)
        .map((s) => (
          <Step key={s.label} label={s.label} options={s.options} value={s.value} onPick={s.pick} />
        ))}
      {ready && <Step label={`${d.area === "dev" ? (d.focus === "full" ? "5" : "4") : "3"}. Senioridade`} options={ROLE_LEVELS} value={d.level} onPick={(id) => set({ level: id as RoleSpec["level"] })} />}
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-panel-2/40 px-3 py-2">
        <span className="text-[12px] text-muted">Cargo:</span>
        <span className={`font-semibold ${name ? "text-accent-2" : "text-muted"}`}>{name ?? (spec ? role : "complete os passos acima")}</span>
        {changed && (
          <button disabled={busy} onClick={() => onSpec(done!)} className="btn-ghost px-3 py-1 text-xs">
            Usar este cargo
          </button>
        )}
        <button onClick={() => setFree(true)} className="ml-auto text-[12px] text-muted underline-offset-2 hover:text-text hover:underline">
          escrever do meu jeito
        </button>
      </div>
    </div>
  );
}

function Step({ label, options, value, onPick }: { label: string; options: { id: string; title: string }[]; value?: string; onPick(id: string): void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const on = value === o.id;
          return (
            <button
              key={o.id}
              aria-pressed={on}
              onClick={() => onPick(o.id)}
              className={`flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] transition-colors ${on ? "border-accent-2 bg-accent-2/15 text-accent-2" : "border-border text-muted hover:border-accent hover:text-text"}`}
            >
              {on && <Check size={11} />}
              {o.title}
            </button>
          );
        })}
      </div>
    </div>
  );
}
