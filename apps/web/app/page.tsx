import Link from "next/link";
import { BookOpen, Briefcase, FlaskConical, GraduationCap, PenTool, UserRound } from "lucide-react";
import { COMPANIES, JAVA_PLENO } from "@sdp/hiring";
import { HeroFlow } from "@/components/home/HeroFlow";
import { RACE_INTERVIEWS } from "@/lib/concurrency/interviews";
import { RACE_LESSONS } from "@/lib/concurrency/lessons";
import { CASES } from "@/lib/training/cases";
import { CHALLENGES } from "@/lib/training/challenges";

const MODES = [
  {
    href: "/estudo",
    title: "Estudo",
    Icon: GraduationCap,
    tone: "accent",
    body: "Aulas com história, um sistema já quebrando e um mentor que explica no nível de entrevista. Você corrige, simula e vê o resultado. No fim: como falar na entrevista, tecnologias usadas hoje e o que ler.",
    areas: [
      ["/estudo/system-design", `System Design · ${CASES.length} aulas`],
      ["/estudo/concorrencia", `Concorrência e dados · ${RACE_LESSONS.length} aulas`],
    ],
  },
  {
    href: "/entrevista",
    title: "Entrevista técnica",
    Icon: UserRound,
    tone: "accent-2",
    body: "Um entrevistador sem dicas: requisitos, estimativa, desenho até cumprir o SLO e perguntas de aprofundamento. A nota vem em estrelas, com o gabarito comentado.",
    areas: [
      ["/entrevista/system-design", `System Design · ${CHALLENGES.length} problemas`],
      ["/entrevista/concorrencia", `Concorrência e dados · ${RACE_INTERVIEWS.length} bugs`],
      ["/entrevista/java", `Java Pleno · ${JAVA_PLENO.length} perguntas`],
    ],
  },
  {
    href: "/processo-seletivo",
    title: "Processo seletivo",
    Icon: Briefcase,
    tone: "bad",
    body: "Escolha a área, a stack e a senioridade e passe por um processo inteiro: triagem, RH, teste técnico, entrevista técnica, gestor, proposta e admissão. Tudo em conversa com a IA, com feedback de cada resposta e um feedback geral no fim.",
    areas: [["/processo-seletivo", `Do RH à contratação · ${COMPANIES.length} empresas`]],
  },
] as const;

/** Cor de cada card: ciano, magenta e laranja (o mesmo do foguinho do banco). */
const TONE = {
  accent: { hover: "hover:border-accent hover:shadow-[0_0_28px_rgba(34,228,255,0.3)]", text: "text-accent" },
  "accent-2": { hover: "hover:border-accent-2 hover:shadow-[0_0_28px_rgba(255,60,172,0.3)]", text: "text-accent-2" },
  bad: { hover: "hover:border-bad hover:shadow-[0_0_28px_rgba(255,154,60,0.35)]", text: "text-bad" },
} as const;

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-center justify-between gap-8">
        <div>
          <div className="hud-label">// treino de system design para entrevistas</div>
          <h1 className="mt-4 font-display text-2xl leading-[1.6] text-text sm:text-3xl sm:leading-[1.5]">
            Desenhe. Simule.
            <br />
            <span className="text-accent glow">Veja onde quebra.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">Escolha como quer treinar hoje.</p>
        </div>
        <HeroFlow />
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {MODES.map(({ href, title, Icon, tone, body, areas }) => (
          <div
            key={href}
            className={`panel group relative flex flex-col gap-4 p-7 transition-shadow ${TONE[tone].hover}`}
          >
            <Link href={href} className="absolute inset-0" aria-label={title} />
            <Icon size={42} className={TONE[tone].text} style={{ filter: `drop-shadow(0 0 10px var(--${tone}))` }} />
            <h2 className={`font-display text-lg leading-relaxed ${TONE[tone].text} glow`}>{title}</h2>
            <p className="text-sm leading-relaxed text-muted">{body}</p>
            <div className="relative mt-auto flex flex-col gap-1.5">
              {areas.map(([h, label]) => (
                <Link key={h} href={h} className={`btn-ghost flex items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wider`}>
                  {label} <span>▶</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="hud-label">Modo livre</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Link href="/canvas" className="panel group flex items-start gap-3 p-4 hover:border-accent">
            <PenTool size={20} className="mt-0.5 text-accent" />
            <div>
              <div className="font-semibold group-hover:text-accent">Canvas livre</div>
              <div className="text-sm text-muted">Monte qualquer arquitetura e simule. <span className="text-accent">Trilha 0 → 1M</span> e tour incluídos.</div>
            </div>
          </Link>
          <Link href="/concorrencia" className="panel group flex items-start gap-3 p-4 hover:border-accent-2">
            <FlaskConical size={20} className="mt-0.5 text-accent-2" />
            <div>
              <div className="font-semibold group-hover:text-accent-2">Laboratório de concorrência</div>
              <div className="text-sm text-muted">Todos os cenários, sem roteiro: avance na ordem que quiser.</div>
            </div>
          </Link>
          <Link href="/bibliografia" className="panel group flex items-start gap-3 p-4 hover:border-accent">
            <BookOpen size={20} className="mt-0.5 text-accent" />
            <div>
              <div className="font-semibold group-hover:text-accent">Bibliografia</div>
              <div className="text-sm text-muted">Livros, pessoas, newsletters e blogs para ir além das aulas.</div>
            </div>
          </Link>
        </div>
      </section>
    </main>
  );
}
