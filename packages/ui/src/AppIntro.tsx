"use client";

import { Check, ChevronDown, LogIn, Maximize2, Pause, Play, type LucideIcon } from "lucide-react";
import type { AppId } from "./apps";
import { loginUrl, useSession } from "./useSession";
import { useEffect, useRef, useState, type ReactNode } from "react";

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

/** Uma seção da página do produto: print da tela real, o problema e como o app resolve. */
export interface IntroShowcase {
  /** Caminho em /public, ex. "/demo/prints/simulacao.jpg". */
  img: string;
  alt: string;
  /** Rótulo curto em cima do título (ex. "Simulação de carga"). */
  tag: string;
  title: string;
  /** A dor que essa parte resolve, em uma ou duas frases. */
  problem: string;
  body: string;
  bullets: string[];
}

export interface IntroFeature {
  Icon: LucideIcon;
  title: string;
  body: string;
}

/** Uma legenda do vídeo: a partir de `at` segundos. */
export interface DemoCue {
  at: number;
  text: string;
}

export interface DemoVideo {
  /** Caminho em /public, ex. "/demo/habito.mp4". */
  src: string;
  poster: string;
  cues: DemoCue[];
}

const KEY = (id: string) => `sdl:intro:${id}`;

/**
 * Apresentação de um app: o que é, o que resolve, um vídeo de demonstração
 * gravado do app de verdade (com legendas), as funcionalidades e como começar. Depois do "Entendi", fica recolhida
 * numa linha (lembrado neste navegador) e abre de novo com um clique.
 */
export function AppIntro({
  app,
  start,
  openWithoutAccount = false,
  id,
  tone,
  name,
  headline,
  lead,
  points,
  showcase,
  features,
  steps,
  video,
  cta,
}: {
  app: AppId;
  /** O botão principal: onde começar a usar o app (ex. "/#comecar"). Sem conta, passa antes pelo login. */
  start: { label: string; href: string };
  /** O app funciona sem conta (mostra também "Testar sem conta"). */
  openWithoutAccount?: boolean;
  /** Chave para lembrar se a pessoa já viu (ex. "habito"). */
  id: string;
  tone: IntroTone;
  /** Nome do app, para a linha recolhida ("Como funciona o Hábito"). */
  name: string;
  headline: ReactNode;
  lead: ReactNode;
  points: IntroPoint[];
  /** As funcionalidades principais, cada uma com print, problema e solução. */
  showcase: IntroShowcase[];
  /** O resto do que o app faz, numa grade curta no fim. */
  features: IntroFeature[];
  steps: IntroStep[];
  video: DemoVideo;
  cta?: ReactNode;
}) {
  const t = TONE[tone];
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY(id)) === "visto") setOpen(false);
    } catch {}
    // voltou do login (ou clicou em começar): recolhe a apresentação e vai direto para o app
    if (window.location.hash === "#comecar") goStart();
  }, [id]);
  function goStart() {
    setOpen(false);
    try {
      localStorage.setItem(KEY(id), "visto");
    } catch {}
    requestAnimationFrame(() => document.getElementById("comecar")?.scrollIntoView({ block: "start" }));
  }
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

  const startBtn = <StartButtons app={app} start={start} tone={tone} openWithoutAccount={openWithoutAccount} onStart={start.href.endsWith("#comecar") ? goStart : undefined} />;
  if (!open)
    return (
      <div className={`panel mt-6 flex flex-wrap items-center gap-3 px-4 py-3 text-sm transition-colors ${t.hover}`}>
        <button onClick={reopen} className="group flex min-w-0 flex-1 items-center gap-3 text-left">
          <Play size={14} className={t.text} />
          <span className="text-muted group-hover:text-text">
            Como funciona {name}? <span className={t.text}>Ver a apresentação</span>
          </span>
          <ChevronDown size={14} className="text-muted" />
        </button>
        {startBtn}
      </div>
    );

  return (
    <section className={`panel pop-in mt-6 overflow-hidden ${t.glow}`}>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,640px)]">
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
          <div className="mt-1">{startBtn}</div>
        </div>
        <DemoPlayer tone={tone} video={video} />
      </div>

      {showcase.map((x, i) => (
        <Showcase key={x.title} x={x} i={i} tone={tone} />
      ))}

      {features.length > 0 && (
        <div className="border-t border-border p-5 sm:p-8">
          <div className={`hud-label ${t.text}`}>// e também</div>
          <ul className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, title, body }) => (
              <li key={title} className="flex gap-3">
                <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${t.border} bg-bg/60`}>
                  <Icon size={16} className={t.text} />
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{title}</span>
                  <span className="text-[13px] leading-relaxed text-muted">{body}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
          {startBtn}
          {cta}
          <button onClick={close} className="btn-ghost px-4 py-2 text-xs font-semibold uppercase tracking-wider">
            Entendi, esconder
          </button>
        </div>
      </div>
    </section>
  );
}

/** Uma seção da página do produto: print de um lado, texto do outro, alternando. */
function Showcase({ x, i, tone }: { x: IntroShowcase; i: number; tone: IntroTone }) {
  const t = TONE[tone];
  const flip = i % 2 === 1;
  return (
    <div className="border-t border-border p-5 sm:p-8">
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10">
        <a href={x.img} target="_blank" rel="noreferrer" title="Abrir o print em tamanho real" className={`group block overflow-hidden rounded-[10px] border ${t.border} bg-bg ${t.glow} ${flip ? "lg:order-2" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={x.img} alt={x.alt} loading="lazy" decoding="async" className="block w-full transition-transform duration-500 group-hover:scale-[1.015]" />
        </a>
        <div className={`flex flex-col gap-3 ${flip ? "lg:order-1" : ""}`}>
          <div className={`font-mono text-[11px] uppercase tracking-[0.18em] ${t.text}`}>
            {String(i + 1).padStart(2, "0")} · {x.tag}
          </div>
          <h3 className="font-display text-sm leading-relaxed sm:text-base">{x.title}</h3>
          <p className={`rounded-md border-l-2 ${t.border} bg-bg/50 px-3 py-2 text-[13px] leading-relaxed text-muted`}>
            <span className="font-semibold text-text">O problema: </span>
            {x.problem}
          </p>
          <p className="text-[15px] leading-relaxed text-muted">{x.body}</p>
          <ul className="flex flex-col gap-1.5">
            {x.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-sm">
                <Check size={15} className={`mt-0.5 shrink-0 ${t.text}`} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * "Começar": com conta vai direto para o app; sem conta, passa pelo login do Painel
 * e volta para cá. Apps que funcionam sem conta também oferecem "Testar sem conta".
 */
function StartButtons({ app, start, tone, openWithoutAccount, onStart }: { app: AppId; start: { label: string; href: string }; tone: IntroTone; openWithoutAccount: boolean; onStart?: () => void }) {
  const s = useSession();
  const t = TONE[tone];
  if (s === undefined) return <div className="h-9" />;
  if (s)
    return (
      <a href={start.href} onClick={onStart} className="btn-neon inline-flex items-center gap-2 px-5 py-2.5 text-xs">
        {start.label} ▶
      </a>
    );
  return (
    <div className="flex flex-wrap items-center gap-3">
      <a href={loginUrl(app, start.href)} className="btn-neon inline-flex items-center gap-2 px-5 py-2.5 text-xs">
        <LogIn size={14} /> Entrar e começar ▶
      </a>
      {openWithoutAccount && (
        <a href={start.href} onClick={onStart} className={`text-[13px] text-muted underline-offset-4 hover:underline ${t.hover}`}>
          ou testar sem conta
        </a>
      )}
    </div>
  );
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * O vídeo de demonstração: toca sozinho, sem som e em loop, com a legenda do
 * trecho atual embaixo. Pausa quando sai da tela; com "reduzir movimento"
 * ligado no sistema, só toca quando a pessoa aperta o play.
 */
function DemoPlayer({ tone, video }: { tone: IntroTone; video: DemoVideo }) {
  const t = TONE[tone];
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [playing, setPlaying] = useState(false);
  // a pessoa pausou: não volta a tocar sozinho ao rolar a página
  const userPaused = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) userPaused.current = true;
    // o vídeo pode carregar antes do React ligar os eventos
    if (v.readyState >= 1) setDur(v.duration);
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !userPaused.current) void v.play().catch(() => {});
        else if (!e?.isIntersecting) v.pause();
      },
      { threshold: 0.35 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  const cue = [...video.cues].reverse().find((c) => c.at <= time + 0.05) ?? video.cues[0];
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      void v.play();
    } else {
      userPaused.current = true;
      v.pause();
    }
  };
  const seek = (s: number) => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = s;
    setTime(s);
    if (v.paused) {
      userPaused.current = false;
      void v.play();
    }
  };
  const full = () => {
    const el = box.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.().catch(() => {});
  };

  return (
    <div ref={box} className={`flex flex-col self-start overflow-hidden rounded-[10px] border ${t.border} bg-bg`}>
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-down/70" />
        <span className="h-2 w-2 rounded-full bg-warn/70" />
        <span className="h-2 w-2 rounded-full bg-ok/70" />
        <span className="ml-2 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          <span className="hidden sm:inline">vídeo de </span>demonstração
        </span>
        <span className="ml-auto shrink-0 whitespace-nowrap font-mono text-[10px] text-muted">
          {clock(time)} / {clock(dur)}
        </span>
      </div>
      <div className="relative bg-black">
        <video
          ref={ref}
          src={video.src}
          poster={video.poster}
          muted
          loop
          playsInline
          preload="metadata"
          onClick={toggle}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          className="block aspect-[16/10] w-full cursor-pointer object-contain"
          aria-label="Vídeo de demonstração do app"
        />
        {!playing && (
          <button onClick={toggle} aria-label="Tocar" className="absolute inset-0 flex items-center justify-center bg-black/30">
            <span className={`flex h-14 w-14 items-center justify-center rounded-full border ${t.border} bg-bg/80 ${t.text}`}>
              <Play size={22} />
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-border px-3 py-2.5">
        <p key={cue?.at} className="pop-in min-h-[2.6em] text-[13px] leading-snug text-text">
          {cue?.text}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={toggle} aria-label={playing ? "Pausar" : "Tocar"} className={`shrink-0 ${t.text}`}>
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          {/* a barra é dividida nos trechos das legendas: clicar num trecho pula para ele */}
          <div className="flex h-3 flex-1 items-center gap-[3px]">
            {video.cues.map((c, i) => {
              const end = video.cues[i + 1]?.at ?? dur;
              const w = dur ? Math.max(0, end - c.at) : 1;
              const fill = dur ? Math.min(1, Math.max(0, (time - c.at) / Math.max(0.1, end - c.at))) : 0;
              return (
                <button key={c.at} onClick={() => seek(c.at)} title={c.text} aria-label={`Ir para: ${c.text}`} className="group relative h-full" style={{ flexGrow: w, flexBasis: 0 }}>
                  <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-border group-hover:h-1.5" />
                  <span className={`absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full ${t.bg} group-hover:h-1.5`} style={{ width: `${fill * 100}%` }} />
                </button>
              );
            })}
          </div>
          <button onClick={full} aria-label="Tela cheia" className="shrink-0 text-muted hover:text-text">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
