import Link from "next/link";
import { Database, Network, type LucideIcon } from "lucide-react";

export interface Area {
  href: string;
  title: string;
  body: string;
  count: string;
  Icon: LucideIcon;
  tone: "accent" | "accent-2";
}

export const areaCards = (mode: "estudo" | "entrevista", counts: { sd: number; race: number }): Area[] => [
  {
    href: `/${mode}/system-design`,
    title: "System Design",
    body:
      mode === "estudo"
        ? "Escala, cache, filas, réplicas, microsserviços. Cada aula começa com um sistema já quebrando: você entende o porquê, corrige no canvas e simula."
        : "O entrevistador passa o enunciado. Você pergunta, estima, desenha até cumprir o SLO e responde o aprofundamento.",
    count: mode === "estudo" ? `${counts.sd} aulas` : `${counts.sd} problemas`,
    Icon: Network,
    tone: "accent",
  },
  {
    href: `/${mode}/concorrencia`,
    title: "Concorrência e dados",
    body:
      mode === "estudo"
        ? "Race conditions, locks, idempotência. O mentor narra cada passo, pergunta antes do clique e mostra o dado ficando errado."
        : "O entrevistador conta um bug de produção. Você diagnostica, escolhe a correção e prova testando todas as ordens.",
    count: mode === "estudo" ? `${counts.race} aulas` : `${counts.race} bugs`,
    Icon: Database,
    tone: "accent-2",
  },
];

export function AreaPicker({ areas }: { areas: Area[] }) {
  return (
    <div className={`mt-8 grid gap-4 ${areas.length > 2 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
      {areas.map(({ href, title, body, count, Icon, tone }) => (
        <Link
          key={href}
          href={href}
          className={`panel group flex flex-col gap-3 p-6 transition-shadow ${tone === "accent" ? "hover:border-accent hover:shadow-[0_0_24px_rgba(34,228,255,0.3)]" : "hover:border-accent-2 hover:shadow-[0_0_24px_rgba(255,60,172,0.3)]"}`}
        >
          <Icon size={34} className={tone === "accent" ? "text-accent" : "text-accent-2"} style={{ filter: `drop-shadow(0 0 8px var(--${tone}))` }} />
          <div className={`font-display text-sm leading-relaxed ${tone === "accent" ? "group-hover:text-accent" : "group-hover:text-accent-2"}`}>{title}</div>
          <p className="text-sm text-muted">{body}</p>
          <span className="mt-auto font-mono text-xs text-muted">{count} →</span>
        </Link>
      ))}
    </div>
  );
}
