"use client";

import { ChevronDown, Pause, Play, type LucideIcon } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/** Classes fixas por cor (o Tailwind só gera classes que aparecem inteiras no código). */
const TONE = {
  accent: { text: "text-accent", bg: "bg-accent", border: "border-accent/50", hover: "hover:border-accent", glow: "shadow-[0_0_24px_rgba(34,228,255,0.18)]" },
  "accent-2": { text: "text-accent-2", bg: "bg-accent-2", border: "border-accent-2/50", hover: "hover:border-accent-2", glow: "shadow-[0_0_24px_rgba(255,60,172,0.18)]" },
  bad: { text: "text-bad", bg: "bg-bad", border: "border-bad/50", hover: "hover:border-bad", glow: "shadow-[0_0_24px_rgba(255,154,60,0.2)]" },
  ok: { text: "text-ok", bg: "bg-ok", border: "border-ok/50", hover: "hover:border-ok", glow: "shadow-[0_0_24px_rgba(57,255,143,0.18)]" },
} as const;
export type IntroTone = keyof typeof TONE;

export interface IntroPoint {
  Icon: LucideIcon;
  title: string;
  body: string;
}

export interface IntroStep {
  title: string;
  body: string;
}

/**
 * Passa pelos quadros da demonstração em loop (como um vídeo curto).
 * Com "reduzir movimento" ligado no sistema, fica parado no último quadro.
 */
export function useDemo(frames: number, ms = 2200) {
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setI(frames - 1);
      setPlaying(false);
    }
  }, [frames]);
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setI((x) => (x + 1) % frames), ms);
    return () => clearInterval(t);
  }, [playing, frames, ms]);
  return { frame: i, playing, setPlaying, go: (n: number) => (setI(n), setPlaying(false)) };
}

const KEY = (id: string) => `sdl:intro:${id}`;

/**
 * Apresentação de um app: o que é, o que resolve, como funciona e uma
 * demonstração animada que roda sozinha. Depois do "Entendi", fica recolhida
 * numa linha (lembrado neste navegador) e abre de novo com um clique.
 */
export function AppIntro({
  id,
  tone,
  name,
  headline,
  lead,
  points,
  steps,
  captions,
  demo,
  ms,
  cta,
}: {
  /** Chave para lembrar se a pessoa já viu (ex. "habito"). */
  id: string;
  tone: IntroTone;
  /** Nome do app, para a linha recolhida ("Como funciona o Hábito"). */
  name: string;
  headline: ReactNode;
  lead: ReactNode;
  points: IntroPoint[];
  steps: IntroStep[];
  /** Uma legenda por quadro da demonstração. */
  captions: string[];
  demo: (frame: number) => ReactNode;
  ms?: number;
  cta?: ReactNode;
}) {
  const t = TONE[tone];
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY(id)) === "visto") setOpen(false);
    } catch {}
  }, [id]);
  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY(id), "visto");
    } catch {}
  };
  const reopen = () => {
    setOpen(true);
    try {
      localStorage.removeItem(KEY(id));
    } catch {}
  };

  if (!open)
    return (
      <button onClick={reopen} className={`panel group mt-6 flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${t.hover}`}>
        <Play size={14} className={t.text} />
        <span className="text-muted group-hover:text-text">
          Como funciona {name}? <span className={t.text}>Ver a apresentação</span>
        </span>
        <ChevronDown size={14} className="ml-auto text-muted" />
      </button>
    );

  return (
    <section className={`panel pop-in mt-6 overflow-hidden ${t.glow}`}>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_minmax(0,440px)]">
        <div className="flex flex-col gap-4">
          <div className={`hud-label ${t.text}`}>// o que é</div>
          <h2 className="font-display text-sm leading-relaxed sm:text-base">{headline}</h2>
          <p className="text-[15px] leading-relaxed text-muted">{lead}</p>
          <ul className="flex flex-col gap-3">
            {points.map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <Icon size={18} className={`mt-0.5 shrink-0 ${t.text}`} style={{ filter: `drop-shadow(0 0 6px var(--${tone}))` }} />
                <div className="text-sm">
                  <span className="font-semibold">{title}.</span> <span className="text-muted">{body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <DemoScreen tone={tone} captions={captions} demo={demo} ms={ms} />
      </div>

      <div className="border-t border-border bg-panel-2/40 p-5 sm:p-6">
        <div className={`hud-label ${t.text}`}>// como funciona</div>
        <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-1">
              <span className={`font-display text-[10px] ${t.text}`}>PASSO {String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm font-semibold">{s.title}</span>
              <span className="text-[13px] leading-relaxed text-muted">{s.body}</span>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {cta}
          <button onClick={close} className="btn-ghost px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            Entendi, esconder
          </button>
        </div>
      </div>
    </section>
  );
}

/** A "telinha" da demonstração: barra de janela, o quadro atual, a legenda e os pontinhos de progresso. */
function DemoScreen({ tone, captions, demo, ms }: { tone: IntroTone; captions: string[]; demo: (f: number) => ReactNode; ms?: number }) {
  const t = TONE[tone];
  const { frame, playing, setPlaying, go } = useDemo(captions.length, ms);
  return (
    <div className={`flex flex-col overflow-hidden rounded-[10px] border ${t.border} bg-bg/70`}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-down/70" />
        <span className="h-2 w-2 rounded-full bg-warn/70" />
        <span className="h-2 w-2 rounded-full bg-ok/70" />
        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">demonstração</span>
        <button onClick={() => setPlaying(!playing)} className={`ml-auto flex items-center gap-1 font-mono text-[10px] uppercase ${t.text}`} aria-label={playing ? "Pausar" : "Tocar"}>
          {playing ? <Pause size={11} /> : <Play size={11} />} {playing ? "pausar" : "tocar"}
        </button>
      </div>
      <div className="relative min-h-[230px] flex-1 p-4">{demo(frame)}</div>
      <div className="flex items-center gap-3 border-t border-border px-3 py-2">
        <p key={frame} className="pop-in min-w-0 flex-1 text-[12px] text-text">{captions[frame]}</p>
        <div className="flex shrink-0 gap-1.5">
          {captions.map((c, i) => (
            <button key={c} onClick={() => go(i)} aria-label={`Quadro ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === frame ? `w-4 ${t.bg}` : "w-1.5 bg-border"}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
