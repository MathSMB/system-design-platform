import Link from "next/link";
import { PlayCircle } from "lucide-react";

const LEVEL_COLOR = { básico: "text-ok", intermediário: "text-warn", avançado: "text-accent-2" } as const;

export interface Item {
  href: string;
  title: string;
  summary: string;
  level?: keyof typeof LEVEL_COLOR;
  meta?: string;
  video?: string;
}

/** Grade de aulas ou problemas, numerados como fases. */
export function LessonList({ items, tag, tone = "accent" }: { items: Item[]; tag: string; tone?: "accent" | "accent-2" }) {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      {items.map((c, i) => (
        <Link
          key={c.href}
          href={c.href}
          className={`panel group flex flex-col gap-2 p-4 transition-shadow ${tone === "accent" ? "hover:border-accent hover:shadow-[0_0_18px_rgba(34,228,255,0.25)]" : "hover:border-accent-2 hover:shadow-[0_0_18px_rgba(255,60,172,0.25)]"}`}
        >
          <div className="flex items-center justify-between">
            <span className={`font-display text-[10px] ${tone === "accent" ? "text-accent-2" : "text-accent"}`}>
              {tag} {String(i + 1).padStart(2, "0")}
            </span>
            {c.level && <span className={`font-mono text-[10px] uppercase ${LEVEL_COLOR[c.level]}`}>{c.level}</span>}
          </div>
          <div className={`font-semibold ${tone === "accent" ? "group-hover:text-accent" : "group-hover:text-accent-2"}`}>{c.title}</div>
          <div className="text-sm text-muted">{c.summary}</div>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1 text-xs text-muted">
            <span>{c.meta}</span>
            {c.video && (
              <span className="flex items-center gap-1 text-right">
                <PlayCircle size={12} /> {c.video}
              </span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
