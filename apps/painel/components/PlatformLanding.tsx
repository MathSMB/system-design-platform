"use client";

import { LBlock, LHeading, LIconItem, appUrl, type AppId } from "@sdp/ui";
import { ArrowDown, ArrowRight, Briefcase, Compass, Cpu, KeyRound, LogIn, Network, Repeat, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import Link from "next/link";

/** Classes fixas por cor (o Tailwind só gera classes que aparecem inteiras no código). */
const TONE = {
  accent: { text: "text-accent", border: "hover:border-accent", glow: "rgba(34,228,255,0.35)" },
  bad: { text: "text-bad", border: "hover:border-bad", glow: "rgba(255,154,60,0.35)" },
  "accent-2": { text: "text-accent-2", border: "hover:border-accent-2", glow: "rgba(255,60,172,0.35)" },
  ok: { text: "text-ok", border: "hover:border-ok", glow: "rgba(57,255,143,0.35)" },
} as const;

const APPS: { id: AppId; name: string; Icon: LucideIcon; tone: keyof typeof TONE; role: string; pitch: string; bullets: string[] }[] = [
  {
    id: "estudos",
    name: "Estudos",
    Icon: Compass,
    tone: "accent-2",
    role: "Saber o que estudar",
    pitch: "A IA lê as vagas reais do cargo que você quer, mostra o que falta e monta um cronograma que cabe na sua semana.",
    bullets: ["% de vagas que pede cada habilidade", "Lacunas em ordem de prioridade", "Trilhas, projetos e cronograma"],
  },
  {
    id: "system-design",
    name: "System Design",
    Icon: Network,
    tone: "accent",
    role: "Aprender fazendo",
    pitch: "Monte a arquitetura com peças de verdade, jogue carga e veja onde o sistema quebra, em tempo real.",
    bullets: ["Aulas com um sistema já quebrando", "Entrevista técnica com nota", "Concorrência e bugs de produção"],
  },
  {
    id: "entrevista",
    name: "Entrevista",
    Icon: Briefcase,
    tone: "bad",
    role: "Treinar para a vaga",
    pitch: "Um processo seletivo inteiro, da triagem à proposta, conversando com a IA. Cada resposta volta avaliada.",
    bullets: ["7 etapas e imprevistos", "Responda falando, com relógio", "Nível, nota e o que faltou"],
  },
  {
    id: "habito",
    name: "Hábito",
    Icon: Cpu,
    tone: "ok",
    role: "Não parar",
    pitch: "A sua meta do dia vira uma placa-mãe neon: cada dia cumprido instala uma peça. Tudo o que você faz nos outros apps conta sozinho.",
    bullets: ["15 peças e overclock", "Failover: tropeçar não zera", "Calendário do ano inteiro"],
  },
];

const FLOW = [
  { tone: "accent-2", app: "Estudos", text: "descobre o que a vaga pede e o que falta em você" },
  { tone: "accent", app: "System Design", text: "aprende arquitetura quebrando e consertando sistemas" },
  { tone: "bad", app: "Entrevista", text: "treina o processo seletivo e recebe nota em cada resposta" },
  { tone: "ok", app: "Hábito", text: "tudo isso marca a meta do dia, sem você anotar nada" },
] as const;

function Cta({ label = "Criar conta ou entrar" }: { label?: string }) {
  return (
    <Link href="/conta" className="btn-neon inline-flex items-center gap-2 px-9 py-4 text-sm">
      <LogIn size={17} /> {label} ▶
    </Link>
  );
}

/** A página da plataforma inteira (o logo leva para cá): os quatro apps e como se completam. */
export function PlatformLanding() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="panel overflow-hidden">
        {/* topo */}
        <div className="grid items-center gap-10 px-5 py-14 sm:px-10 sm:py-20 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="flex flex-col gap-6">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">// system design lab</span>
            <h1 className="font-display text-2xl leading-[1.5] sm:text-3xl">
              Da vaga que você quer <span className="text-accent glow">à proposta na mão.</span>
            </h1>
            <p className="text-lg text-muted">
              Quatro apps que trabalham juntos: um diz o que estudar, outro ensina na prática, outro treina a entrevista e o último garante que você não pare. Uma conta só para todos.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Cta />
              <a href="#apps" className="text-sm text-muted underline-offset-4 hover:text-text hover:underline">
                conhecer os apps ↓
              </a>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {APPS.map((a) => (
              <a key={a.id} href={appUrl(a.id)} className={`group relative overflow-hidden rounded-lg border border-border transition-colors ${TONE[a.tone].border}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/demo/apps/${a.id}.jpg`} alt={`O app ${a.name}`} className="aspect-[16/10] w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" />
                <span className={`absolute bottom-0 left-0 right-0 flex items-center gap-1.5 bg-bg/85 px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${TONE[a.tone].text}`}>
                  <a.Icon size={13} /> {a.name}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* os quatro apps */}
        <div id="apps" className="scroll-mt-20">
          <LBlock>
            <LHeading center kicker="Os quatro apps" title="Cada um faz uma parte da sua preparação" sub="Clique em qualquer um para ver a apresentação completa dele." />
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {APPS.map((a) => (
                <a key={a.id} href={appUrl(a.id)} className={`group flex flex-col gap-4 rounded-xl border border-border bg-bg/40 p-6 transition-all ${TONE[a.tone].border}`}>
                  <div className="flex items-center gap-4">
                    <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-current ${TONE[a.tone].text}`} style={{ boxShadow: `0 0 22px ${TONE[a.tone].glow}` }}>
                      <a.Icon size={28} />
                    </span>
                    <div className="flex flex-col">
                      <span className={`font-mono text-[11px] uppercase tracking-[0.16em] ${TONE[a.tone].text}`}>{a.role}</span>
                      <span className="font-display text-base leading-relaxed">{a.name}</span>
                    </div>
                  </div>
                  <p className="text-[15px] text-muted">{a.pitch}</p>
                  <ul className="flex flex-wrap gap-2">
                    {a.bullets.map((b) => (
                      <li key={b} className="rounded-full border border-border px-3 py-1 text-[12px] text-muted">
                        {b}
                      </li>
                    ))}
                  </ul>
                  <span className={`mt-auto flex items-center gap-1.5 font-mono text-xs ${TONE[a.tone].text}`}>
                    Conhecer o {a.name} <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </span>
                </a>
              ))}
            </div>
          </LBlock>
        </div>

        {/* como se completam */}
        <LBlock>
          <LHeading center kicker="Juntos" title="Como os quatro viram uma preparação completa" sub="Cada app alimenta o próximo, e o que você erra volta como prioridade." />
          <ol className="mx-auto mt-10 flex max-w-2xl flex-col items-stretch">
            {FLOW.map((f, i) => (
              <li key={f.app} className="flex flex-col items-center">
                <div className="flex w-full items-center gap-4 rounded-xl border border-border bg-bg/40 px-5 py-4">
                  <span className={`font-display text-lg ${TONE[f.tone].text}`}>{i + 1}</span>
                  <p className="text-[15px]">
                    No <span className={`font-semibold ${TONE[f.tone].text}`}>{f.app}</span>, você {f.text}.
                  </p>
                </div>
                {i < FLOW.length - 1 && <ArrowDown size={20} className="my-2 text-muted" />}
              </li>
            ))}
          </ol>
          <div className="mx-auto mt-6 flex max-w-2xl items-start gap-3 rounded-xl border border-dashed border-accent-2/60 px-5 py-4 text-[15px]">
            <Repeat size={20} className="mt-0.5 shrink-0 text-accent-2" />
            <p>
              <span className="font-semibold text-accent-2">E o ciclo fecha:</span> a habilidade que tirou nota baixa na Entrevista sobe nas lacunas dos Estudos e entra no seu cronograma.
            </p>
          </div>
        </LBlock>

        {/* uma conta */}
        <LBlock>
          <LHeading center kicker="Uma conta" title="Entre uma vez, use os quatro" />
          <ul className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
            <LIconItem Icon={KeyRound} title="Login único" body="Entre com GitHub, Google ou e-mail e já está dentro dos quatro apps." />
            <LIconItem Icon={Sparkles} title="Um painel com tudo" body="A meta do dia, os seus perfis e o que aconteceu em cada app." />
            <LIconItem Icon={ShieldCheck} title="No seu computador" body="Roda localmente, com a IA do seu Claude Code. Seus dados ficam com você." />
          </ul>
        </LBlock>

        <div className="flex flex-col items-center gap-4 border-t border-border px-5 py-14 text-center sm:py-20">
          <h2 className="max-w-2xl font-display text-base leading-relaxed sm:text-xl">Pronto para treinar para a vaga que você quer?</h2>
          <p className="max-w-xl text-base text-muted sm:text-lg">Crie a conta em 1 minuto e comece pelo seu painel.</p>
          <Cta />
        </div>
      </div>
    </main>
  );
}
