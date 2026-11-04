import Link from "next/link";
import { Briefcase, Coffee, History, Network, type LucideIcon } from "lucide-react";
import { COMPANIES, JAVA_PLENO, STACKS } from "@sdp/hiring";
import { appUrl } from "@sdp/ui";
import { EntrevistaIntro } from "@/components/home/Intro";

interface Card {
  href: string;
  title: string;
  body: string;
  count: string;
  Icon: LucideIcon;
  tone: "bad" | "accent-2" | "accent";
}

/** Classes fixas por cor (o Tailwind só gera classes que aparecem inteiras no código). */
const TONE = {
  bad: { text: "text-bad", hover: "hover:border-bad hover:shadow-[0_0_24px_rgba(255,154,60,0.35)]", group: "group-hover:text-bad" },
  "accent-2": { text: "text-accent-2", hover: "hover:border-accent-2 hover:shadow-[0_0_24px_rgba(255,60,172,0.3)]", group: "group-hover:text-accent-2" },
  accent: { text: "text-accent", hover: "hover:border-accent hover:shadow-[0_0_24px_rgba(34,228,255,0.3)]", group: "group-hover:text-accent" },
} as const;

const CARDS: Card[] = [
  {
    href: "/processo-seletivo",
    title: "Processo seletivo",
    body: "Escolha a área, a stack e a senioridade e passe por um processo inteiro: triagem, RH, teste técnico, entrevista técnica, gestor, proposta e admissão. Tudo em conversa com a IA.",
    count: `${STACKS.length} stacks · ${COMPANIES.length} empresas`,
    Icon: Briefcase,
    tone: "bad",
  },
  {
    href: "/java",
    title: "Treino Java",
    body: "Perguntas reais de entrevista Java, por nível. Responda falando, compare com a resposta de pleno e descubra seu nível.",
    count: `Pleno · ${JAVA_PLENO.length} perguntas`,
    Icon: Coffee,
    tone: "accent-2",
  },
  {
    href: "/historico",
    title: "Histórico",
    body: "Todas as entrevistas que você fez, com cada resposta, o feedback dela e o feedback geral.",
    count: "Suas entrevistas",
    Icon: History,
    tone: "accent",
  },
];

export default function Entrevista() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-bad">
        <Briefcase size={14} /> Entrevista
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Do RH à <span className="text-bad glow">contratação.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">Treine a entrevista inteira ou só a parte técnica da sua stack. A IA avalia cada resposta e, no fim, dá um feedback geral.</p>
      <EntrevistaIntro />
      <h2 className="hud-label mt-10 !text-bad">Escolha o treino</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        {CARDS.map(({ href, title, body, count, Icon, tone }) => (
          <Link key={href} href={href} className={`panel group flex flex-col gap-3 p-6 transition-shadow ${TONE[tone].hover}`}>
            <Icon size={34} className={TONE[tone].text} style={{ filter: `drop-shadow(0 0 8px var(--${tone}))` }} />
            <div className={`font-display text-sm leading-relaxed ${TONE[tone].group}`}>{title}</div>
            <p className="text-sm text-muted">{body}</p>
            <span className="mt-auto font-mono text-xs text-muted">{count} →</span>
          </Link>
        ))}
      </div>
      <a href={appUrl("system-design", "/entrevista")} className="panel group mt-6 flex items-start gap-3 p-4 hover:border-accent">
        <Network size={20} className="mt-0.5 text-accent" />
        <div>
          <div className="font-semibold group-hover:text-accent">Entrevista de system design e concorrência</div>
          <div className="text-sm text-muted">Fica no app System Design: desenhe até cumprir o SLO ou diagnostique o bug de produção.</div>
        </div>
      </a>
    </main>
  );
}
