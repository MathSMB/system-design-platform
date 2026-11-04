import Link from "next/link";
import type { ReactNode } from "react";
import { AccountChip } from "./Account";
import { AppsNav } from "./AppsNav";
import { APP_LIST, type AppId } from "./apps";

/** Classes fixas por cor (o Tailwind só gera classes que aparecem inteiras no código). */
const TONE = {
  text: { text: "text-text", hover: "hover:text-text", line: "bg-text" },
  accent: { text: "text-accent", hover: "hover:text-accent", line: "bg-accent" },
  "accent-2": { text: "text-accent-2", hover: "hover:text-accent-2", line: "bg-accent-2" },
  bad: { text: "text-bad", hover: "hover:text-bad", line: "bg-bad" },
  ok: { text: "text-ok", hover: "hover:text-ok", line: "bg-ok" },
  warn: { text: "text-warn", hover: "hover:text-warn", line: "bg-warn" },
} as const;
export type Tone = keyof typeof TONE;

export interface NavItem {
  href: string;
  label: string;
  /** Cor do hover (padrão: a cor do app). */
  tone?: Tone;
  /** Atributo para o tour do System Design. */
  tour?: string;
}

/**
 * Cabeçalho comum a todos os apps.
 * Linha 1: logo, os apps (o atual aceso na sua cor), a conta e um espaço extra (ex. "Saber mais").
 * Linha 2: as páginas do app atual.
 */
export function AppHeader({ current, nav = [], extra }: { current: AppId; nav?: NavItem[]; extra?: ReactNode }) {
  const app = APP_LIST.find((a) => a.id === current)!;
  return (
    <header className="relative border-b border-border bg-bg/80 backdrop-blur">
      <div className="flex h-12 items-center gap-3 px-4">
        <AppsNav current={current} />
        <AccountChip current={current} />
        {extra}
      </div>
      {nav.length > 0 && (
        <nav className="no-scrollbar flex h-9 items-center gap-4 overflow-x-auto whitespace-nowrap border-t border-border/60 px-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[app.color].line} shadow-[0_0_6px_currentColor]`} />
          {nav.map((n) => (
            <Link key={n.href} href={n.href} data-tour={n.tour} className={`transition-colors ${TONE[n.tone ?? app.color].hover}`}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
      {/* linha neon sob o cabeçalho */}
      <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-[linear-gradient(90deg,transparent,var(--accent)_30%,var(--accent-2)_70%,transparent)] opacity-60" />
    </header>
  );
}
