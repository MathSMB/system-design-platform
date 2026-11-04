"use client";

import { APP_LIST, appUrl, type AppId } from "./apps";
import { useSession } from "./useSession";

/** Classes fixas por cor (o Tailwind só gera classes que aparecem inteiras no código). */
const TONE = {
  text: { text: "text-text", hover: "hover:text-text" },
  accent: { text: "text-accent", hover: "hover:text-accent" },
  "accent-2": { text: "text-accent-2", hover: "hover:text-accent-2" },
  bad: { text: "text-bad", hover: "hover:text-bad" },
  ok: { text: "text-ok", hover: "hover:text-ok" },
} as const;

/**
 * Logo e os apps no topo. O Painel só aparece para quem entrou: sem conta,
 * o caminho para ele é o botão "Entrar".
 */
export function AppsNav({ current }: { current: AppId }) {
  const s = useSession();
  const logged = !!s;
  const apps = APP_LIST.filter((a) => a.id !== "painel" || logged);
  return (
    <>
      <a href={appUrl("painel")} title="System Design Lab: os quatro apps" className="flex shrink-0 items-center gap-2 font-display text-[11px] text-accent glow">
        <span className="text-accent-2">&gt;</span>
        <span className="hidden lg:inline">SYSTEM_DESIGN_LAB</span>
        <span className="lg:hidden">SDL</span>
        <span className="cursor-blink">_</span>
      </a>
      <nav className="no-scrollbar flex min-w-0 flex-1 gap-4 overflow-x-auto whitespace-nowrap text-xs font-semibold uppercase tracking-[0.1em] text-muted">
        {apps.map((a) =>
          a.id === current ? (
            <a key={a.id} href="/" aria-current="page" className={`relative ${TONE[a.color].text} glow`}>
              {a.title}
            </a>
          ) : (
            <a key={a.id} href={appUrl(a.id)} className={`transition-colors ${TONE[a.color].hover}`}>
              {a.title}
            </a>
          ),
        )}
      </nav>
    </>
  );
}
