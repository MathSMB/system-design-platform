"use client";

import { Check, type LucideIcon } from "lucide-react";
import { useContext, type ReactNode } from "react";
import { IntroCtx } from "./AppIntro";

/**
 * Peças da landing page de cada app (dentro de <AppIntro>): blocos com espaço
 * generoso, título curto com uma linha embaixo, itens com ícone, prints com
 * etiquetas e números grandes. A cor vem do app (tom da apresentação).
 */
const useTone = () => `var(--${useContext(IntroCtx)?.tone ?? "accent"})`;

/** Uma seção: borda em cima e bastante espaço. */
export function LBlock({ children }: { children: ReactNode }) {
  return <div className="border-t border-border px-5 py-14 sm:px-10 sm:py-20">{children}</div>;
}

/** Rótulo, título curto e uma linha. */
export function LHeading({ kicker, title, sub, center = false }: { kicker: string; title: ReactNode; sub?: ReactNode; center?: boolean }) {
  const c = useTone();
  return (
    <div className={`flex flex-col gap-3 ${center ? "mx-auto max-w-2xl items-center text-center" : ""}`}>
      <span className="font-mono text-xs uppercase tracking-[0.2em]" style={{ color: c }}>
        {kicker}
      </span>
      <h3 className="font-display text-lg leading-relaxed sm:text-2xl sm:leading-relaxed">{title}</h3>
      {sub && <p className="text-base leading-relaxed text-muted sm:text-lg">{sub}</p>}
    </div>
  );
}

/** Item com ícone numa caixinha neon. */
export function LIconItem({ Icon, title, body, color }: { Icon: LucideIcon; title: string; body?: string; color?: string }) {
  const t = useTone();
  const c = color ?? t;
  return (
    <li className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-bg/70" style={{ borderColor: `color-mix(in srgb, ${c} 55%, transparent)`, color: c, boxShadow: `0 0 14px color-mix(in srgb, ${c} 25%, transparent)` }}>
        <Icon size={19} />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-semibold">{title}</span>
        {body && <span className="text-[15px] leading-relaxed text-muted">{body}</span>}
      </div>
    </li>
  );
}

export interface LNote {
  /** Posição do ponto, em % da imagem. */
  x: number;
  y: number;
  text: string;
  tone: string;
  /** Etiqueta acima do ponto (padrão: abaixo). */
  up?: boolean;
  /** Etiqueta à esquerda do ponto. */
  left?: boolean;
}

/** Print com moldura neon e etiquetas apontando o que importa (as etiquetas somem no celular). */
export function LShot({ src, alt, notes = [], color, maxH }: { src: string; alt: string; notes?: LNote[]; color?: string; maxH?: number }) {
  const t = useTone();
  const c = color ?? t;
  return (
    <figure className="relative overflow-hidden rounded-xl border bg-bg" style={{ borderColor: `color-mix(in srgb, ${c} 45%, transparent)`, boxShadow: `0 0 40px color-mix(in srgb, ${c} 14%, transparent)` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="block w-full object-cover object-top" style={maxH ? { maxHeight: maxH } : undefined} />
      {notes.map((n) => (
        <span key={n.text} className="pointer-events-none absolute" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
          <span className="absolute -left-1.5 -top-1.5 h-3 w-3 animate-ping rounded-full" style={{ background: n.tone }} />
          <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full ring-2 ring-bg" style={{ background: n.tone }} />
          <span
            className={`absolute left-0 hidden whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider sm:block sm:text-[11px] ${n.left ? "-translate-x-[95%]" : n.x > 80 ? "-translate-x-[88%]" : n.x < 20 ? "-translate-x-[10%]" : "-translate-x-1/2"} ${n.up ? "bottom-3" : "top-3"}`}
            style={{ borderColor: n.tone, color: n.tone, background: "color-mix(in srgb, var(--bg) 88%, transparent)" }}
          >
            {n.text}
          </span>
        </span>
      ))}
    </figure>
  );
}

/** Um número grande com a explicação embaixo. */
export function LStat({ label, value, hint, color }: { label: string; value: string; hint: string; color?: string }) {
  const t = useTone();
  const c = color ?? t;
  return (
    <div className="rounded-xl border bg-bg/60 p-4" style={{ borderColor: `color-mix(in srgb, ${c} 40%, var(--border))` }}>
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold sm:text-3xl" style={{ color: c }}>
        {value}
      </div>
      <div className="mt-1 text-[13px] text-muted">{hint}</div>
    </div>
  );
}

/** Grade de cards com ícone grande (estilo bento): uma capacidade por card. */
export function LBento({ items, cols = 4 }: { items: { Icon: LucideIcon; name: string; body: string; color?: string }[]; cols?: 3 | 4 }) {
  const t = useTone();
  return (
    <ul className={`mt-10 grid grid-cols-2 gap-3 sm:gap-4 ${cols === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
      {items.map(({ Icon, name, body, color }) => {
        const c = color ?? t;
        return (
          <li key={name} className="flex flex-col gap-3 rounded-xl border border-border bg-bg/50 p-4 transition-transform duration-200 hover:-translate-y-1 sm:p-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 bg-bg" style={{ borderColor: c, color: c, boxShadow: `0 0 16px color-mix(in srgb, ${c} 35%, transparent)` }}>
              <Icon size={22} />
            </span>
            <span className="text-base font-semibold">{name}</span>
            <span className="text-[13px] leading-relaxed text-muted sm:text-sm">{body}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Texto de um lado e imagem do outro; `flip` inverte no computador. */
export function LRow({ text, media, flip = false, wideMedia = true }: { text: ReactNode; media: ReactNode; flip?: boolean; wideMedia?: boolean }) {
  const cols = wideMedia ? (flip ? "lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]" : "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]") : "lg:grid-cols-2";
  return (
    <LBlock>
      <div className={`grid items-center gap-10 ${cols}`}>
        <div className={`flex flex-col gap-6 ${flip ? "lg:order-2" : ""}`}>{text}</div>
        <div className={flip ? "lg:order-1" : ""}>{media}</div>
      </div>
    </LBlock>
  );
}

/** Lista de ✓ curtinha. */
export function LChecks({ items }: { items: string[] }) {
  const t = useTone();
  return (
    <ul className="flex flex-col gap-2">
      {items.map((i) => (
        <li key={i} className="flex gap-2 text-[15px]">
          <Check size={17} className="mt-0.5 shrink-0" style={{ color: t }} />
          {i}
        </li>
      ))}
    </ul>
  );
}

/** Chips coloridos (ex. os níveis de desgaste, os modelos de meta). */
export function LChips({ items }: { items: { text: string; color?: string }[] }) {
  const t = useTone();
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ text, color }) => {
        const c = color ?? t;
        return (
          <span key={text} className="rounded-full border px-3 py-1 font-mono text-[12px]" style={{ borderColor: `color-mix(in srgb, ${c} 60%, transparent)`, color: c }}>
            {text}
          </span>
        );
      })}
    </div>
  );
}
