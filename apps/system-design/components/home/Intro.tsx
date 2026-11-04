"use client";

import { AppIntro, IntroCta } from "@sdp/ui";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Check,
  Database,
  FlaskConical,
  Gauge,
  Globe,
  GraduationCap,
  Inbox,
  Keyboard,
  Network,
  Plug,
  Search,
  Server,
  Trophy,
  UserRound,
  Users,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { DEMO_CUES } from "../demo-cues";

const P = "/demo/prints";

/** Os 8 componentes do canvas, com a cor de cada um no app. */
const PARTS: { Icon: LucideIcon; name: string; body: string; color: string }[] = [
  { Icon: Users, name: "Usuários", body: "A carga: quantos são, o pico e quanto escrevem.", color: "#e6f1ff" },
  { Icon: Network, name: "Load balancer", body: "Divide o tráfego entre os servidores.", color: "#b18cff" },
  { Icon: Server, name: "Servidor", body: "Workers, tempo de resposta e fila.", color: "#22e4ff" },
  { Icon: Zap, name: "Cache", body: "Responde rápido e alivia o banco.", color: "#ff3cac" },
  { Icon: Globe, name: "CDN", body: "Entrega o conteúdo perto do usuário.", color: "#4d9dff" },
  { Icon: Database, name: "Banco de dados", body: "Com réplicas e atraso de replicação.", color: "#ffb547" },
  { Icon: Inbox, name: "Fila", body: "Segura o pico e processa depois.", color: "#39ff8f" },
  { Icon: Plug, name: "Serviço externo", body: "A API lenta que você não controla.", color: "#9fb4ff" },
];

/** Bloco de seção: espaço generoso e largura de leitura. */
function Block({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`border-t border-border px-5 py-14 sm:px-10 sm:py-20 ${className}`}>{children}</div>;
}

/** Rótulo + título + uma linha, no padrão de landing page. */
function Heading({ kicker, title, sub, center = false }: { kicker: string; title: ReactNode; sub?: ReactNode; center?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${center ? "mx-auto max-w-2xl items-center text-center" : ""}`}>
      <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{kicker}</span>
      <h3 className="font-display text-lg leading-relaxed sm:text-2xl sm:leading-relaxed">{title}</h3>
      {sub && <p className="text-base leading-relaxed text-muted sm:text-lg">{sub}</p>}
    </div>
  );
}

/** Item com ícone em caixinha neon: o jeito de listar sem virar parágrafo. */
function IconItem({ Icon, title, body, color = "var(--accent)" }: { Icon: LucideIcon; title: string; body?: string; color?: string }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-bg/70" style={{ borderColor: `color-mix(in srgb, ${color} 55%, transparent)`, color, boxShadow: `0 0 14px color-mix(in srgb, ${color} 25%, transparent)` }}>
        <Icon size={19} />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-semibold">{title}</span>
        {body && <span className="text-[15px] leading-relaxed text-muted">{body}</span>}
      </div>
    </li>
  );
}

/** Print com moldura neon e etiquetas apontando o que importa na tela. */
function Shot({ src, alt, notes = [], color = "var(--accent)" }: { src: string; alt: string; notes?: { x: number; y: number; text: string; tone: string; up?: boolean; left?: boolean }[]; color?: string }) {
  return (
    <figure className="relative overflow-hidden rounded-xl border bg-bg" style={{ borderColor: `color-mix(in srgb, ${color} 45%, transparent)`, boxShadow: `0 0 40px color-mix(in srgb, ${color} 14%, transparent)` }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" decoding="async" className="block w-full" />
      {notes.map((n) => (
        <span key={n.text} className="pointer-events-none absolute" style={{ left: `${n.x}%`, top: `${n.y}%` }}>
          <span className="absolute -left-1.5 -top-1.5 h-3 w-3 animate-ping rounded-full" style={{ background: n.tone }} />
          <span className="absolute -left-1.5 -top-1.5 h-3 w-3 rounded-full ring-2 ring-bg" style={{ background: n.tone }} />
          <span
            className={`absolute left-0 hidden whitespace-nowrap sm:block ${n.left ? "-translate-x-[95%]" : n.x > 80 ? "-translate-x-[88%]" : "-translate-x-1/2"} ${n.up ? "bottom-3" : "top-3"} rounded-md border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider sm:text-[11px]`}
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
function Stat({ label, value, hint, bad = false }: { label: string; value: string; hint: string; bad?: boolean }) {
  return (
    <div className={`rounded-xl border bg-bg/60 p-4 ${bad ? "border-down/70 shadow-[0_0_18px_rgba(255,77,109,0.18)]" : "border-border"}`}>
      <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold sm:text-3xl ${bad ? "text-down" : "text-accent"}`}>{value}</div>
      <div className="mt-1 text-[13px] text-muted">{hint}</div>
    </div>
  );
}

function SdLanding() {
  return (
    <>
      <IntroCta />

      {/* 1. Os componentes (bento) */}
      <Block>
        <Heading center kicker="Monte" title="8 peças de verdade. Arraste e conecte." sub="As mesmas peças que aparecem nas entrevistas de system design, cada uma com os parâmetros que mudam o resultado." />
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {PARTS.map(({ Icon, name, body, color }) => (
            <li key={name} className="group flex flex-col gap-3 rounded-xl border border-border bg-bg/50 p-4 transition-all duration-200 hover:-translate-y-1 sm:p-5" style={{ ["--c" as string]: color }}>
              <span className="flex h-12 w-12 items-center justify-center rounded-xl border-2 bg-bg" style={{ borderColor: color, color, boxShadow: `0 0 16px color-mix(in srgb, ${color} 35%, transparent)` }}>
                <Icon size={22} />
              </span>
              <span className="text-base font-semibold">{name}</span>
              <span className="text-[13px] leading-relaxed text-muted sm:text-sm">{body}</span>
            </li>
          ))}
        </ul>
      </Block>

      {/* 2. Sobrecarga em tempo real: texto à esquerda, print à direita */}
      <Block>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col gap-6">
            <Heading kicker="Em tempo real" title="Veja onde o sistema sobrecarrega" sub="Aperte Simular e o tráfego passa pelas peças. A cor mostra na hora quem está aguentando e quem está caindo." />
            <ul className="flex flex-col gap-5">
              <IconItem Icon={Check} color="var(--ok)" title="Verde: aguentando bem" body="A peça tem folga para o pico." />
              <IconItem Icon={AlertTriangle} color="var(--warn)" title="Em chamas: no limite" body="Perto de 100% ocupada, a fila cresce e a latência explode." />
              <IconItem Icon={Zap} color="var(--down)" title="Vermelho: falhando" body="Peça fora do ar ou requisições sendo recusadas." />
            </ul>
          </div>
          <Shot
            src={`${P}/canvas-quebrando.jpg`}
            alt="Canvas com o cache fora do ar e o banco em chamas"
            notes={[
              { x: 69.1, y: 33, text: "Cache caiu", tone: "var(--down)", left: true },
              { x: 91, y: 33, text: "Banco em chamas", tone: "var(--warn)" },
              { x: 58.1, y: 55, text: "Erros voltando", tone: "var(--down)" },
            ]}
          />
        </div>
      </Block>

      {/* 3. Métricas: print à esquerda, números à direita */}
      <Block>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
          <div className="order-2 flex flex-col gap-3 lg:order-1">
            <Shot src={`${P}/grafico.jpg`} alt="Linha do tempo: requisições, erros e p99 a cada segundo" />
            <p className="text-center text-[13px] text-muted">No segundo 20 o cache cai: os erros (vermelho) e o p99 (azul) disparam.</p>
          </div>
          <div className="order-1 flex flex-col gap-6 lg:order-2">
            <Heading kicker="Métricas" title="Acompanhe tudo pelo gráfico" sub="Enquanto simula, os números da entrevista aparecem prontos para você citar." />
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Req/s" value="5.753" hint="requisições por segundo" />
              <Stat label="Erros" value="27,99%" hint="das requisições falharam" bad />
              <Stat label="p50" value="311 ms" hint="metade respondeu até aqui" />
              <Stat label="p99" value="412 ms" hint="99% respondeu até aqui" />
            </div>
          </div>
        </div>
      </Block>

      {/* 4. Diagnóstico: texto à esquerda, print à direita */}
      <Block>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)]">
          <div className="flex flex-col gap-6">
            <Heading kicker="Diagnóstico" title="Descubra por que quebrou" sub="O painel Onde quebrou explica em português o que aconteceu, como um colega sênior do lado." />
            <ul className="flex flex-col gap-5">
              <IconItem Icon={Search} title="Qual peça é o gargalo" body="Com a utilização, a fila e quantas requisições foram recusadas." />
              <IconItem Icon={AlertTriangle} color="var(--warn)" title="O nome do problema" body="Avalanche de cache, retry storm, fila sem limite…" />
              <IconItem Icon={Wrench} color="var(--ok)" title="O que fazer" body="Cache, réplicas de leitura, fila ou sharding, com o porquê." />
            </ul>
          </div>
          <Shot src={`${P}/onde-quebrou.jpg`} alt="Painel Onde quebrou explicando a avalanche de cache" />
        </div>
      </Block>

      {/* 5. Antes e depois */}
      <Block>
        <Heading center kicker="Corrija" title="Mude uma peça e veja o número mudar" sub="O mesmo sistema, com o cache fora do ar e funcionando." />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { src: "canvas-quebrando", tag: "Cache fora do ar", err: "27,99%", p99: "412 ms", bad: true },
            { src: "canvas-ok", tag: "Cache funcionando", err: "0%", p99: "104 ms", bad: false },
          ].map((x) => (
            <div key={x.src} className={`overflow-hidden rounded-xl border bg-bg/60 ${x.bad ? "border-down/60" : "border-ok/60"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`${P}/${x.src}.jpg`} alt={x.tag} loading="lazy" className="block w-full" />
              <div className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
                <span className={`font-mono text-xs font-semibold uppercase tracking-[0.16em] ${x.bad ? "text-down" : "text-ok"}`}>{x.tag}</span>
                <div className="flex gap-5 text-right">
                  <div>
                    <div className={`font-mono text-2xl font-semibold ${x.bad ? "text-down" : "text-ok"}`}>{x.err}</div>
                    <div className="text-[12px] text-muted">de erros</div>
                  </div>
                  <div>
                    <div className={`font-mono text-2xl font-semibold ${x.bad ? "text-down" : "text-ok"}`}>{x.p99}</div>
                    <div className="text-[12px] text-muted">p99</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* 6. Dois modos */}
      <Block>
        <Heading center kicker="Dois modos" title="Aprenda com mentor. Treine como no dia." />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {[
            { Icon: GraduationCap, color: "var(--accent)", name: "Estudo", img: "aula", line: "Aulas com história e um mentor que pede um clique de cada vez.", items: ["12 aulas, do primeiro servidor ao milhão de usuários", "Perguntas que já vêm explicadas", "Vídeo e leituras recomendadas"] },
            { Icon: UserRound, color: "var(--accent-2)", name: "Entrevista técnica", img: "desafio", line: "Sem dica, com relógio e nota em estrelas no fim.", items: ["9 problemas: Black Friday, Copa, ingressos, pagamentos…", "Requisitos, estimativa, desenho e aprofundamento", "Gabarito comentado no fim"] },
          ].map(({ Icon, color, name, img, line, items }) => (
            <div key={name} className="flex flex-col overflow-hidden rounded-xl border bg-bg/60" style={{ borderColor: `color-mix(in srgb, ${color} 50%, transparent)` }}>
              <div className="h-48 overflow-hidden border-b border-border sm:h-56">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`${P}/${img}.jpg`} alt={name} loading="lazy" className="block w-full object-cover object-left-top" />
              </div>
              <div className="flex flex-col gap-4 p-6">
                <div className="flex items-center gap-3">
                  <Icon size={26} style={{ color, filter: `drop-shadow(0 0 8px ${color})` }} />
                  <span className="font-display text-base" style={{ color }}>
                    {name}
                  </span>
                </div>
                <p className="text-base text-muted">{line}</p>
                <ul className="flex flex-col gap-2">
                  {items.map((i) => (
                    <li key={i} className="flex gap-2 text-[15px]">
                      <Check size={17} className="mt-0.5 shrink-0" style={{ color }} />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </Block>

      {/* 7. Concorrência: texto à esquerda, print à direita */}
      <Block>
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          <div className="flex flex-col gap-6">
            <Heading kicker="Concorrência e dados" title="Veja o bug de concorrência acontecer" sub="Dois compradores, um ingresso. Você avança cada transação e vê a venda dupla na sua frente." />
            <ul className="flex flex-col gap-5">
              <IconItem Icon={FlaskConical} color="var(--accent-2)" title="Passo a passo, lado a lado" body="Cada SELECT e UPDATE na linha do tempo." />
              <IconItem Icon={Gauge} color="var(--accent-2)" title="Todas as ordens possíveis" body="Um clique prova se a correção aguenta qualquer intercalação." />
              <IconItem Icon={Trophy} color="var(--accent-2)" title="11 aulas e 8 bugs reais" body="Lock pessimista e otimista, deadlock, Pix duplo, Therac-25…" />
            </ul>
          </div>
          <Shot src={`${P}/concorrencia-lab.jpg`} alt="Laboratório de concorrência mostrando a venda dupla" color="var(--accent-2)" />
        </div>
      </Block>

      {/* 8. E mais */}
      <Block>
        <Heading center kicker="E mais" title="Tudo para chegar seguro na entrevista" />
        <ul className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          <IconItem Icon={Bot} title="Avaliação pela IA" body="Dois entrevistadores dão nota ao desenho e às suas respostas." />
          <IconItem Icon={BookOpen} title="Glossário com ?" body="Cada termo explicado em linguagem simples." />
          <IconItem Icon={Keyboard} title="Rápido de mexer" body="Desfazer, copiar e colar, duplicar e Ctrl+Enter para simular." />
        </ul>
      </Block>

      <IntroCta title="Pronto para ver onde o seu sistema quebra?" sub="Monte, simule e corrija. Do primeiro servidor ao milhão de usuários." />
    </>
  );
}

export function SdIntro() {
  return (
    <AppIntro
      app="system-design"
      start={{ label: "Começar a treinar", href: "/#comecar" }}
      requireLogin
      id="system-design"
      tone="accent"
      name="o System Design"
      headline={
        <>
          Aprenda system design <span className="text-accent glow">quebrando sistemas</span>, não decorando diagramas.
        </>
      }
      lead="Em entrevista, não basta saber que existe cache ou fila: você precisa explicar por que o sistema cai e como a sua escolha resolve. Aqui você monta a arquitetura, coloca carga de verdade e vê o número mudar."
      points={[
        { Icon: Gauge, title: "Simulação de verdade", body: "Cada componente é uma fila com workers e tempo de serviço. Você vê req/s, latência p99, erros e onde a fila estourou." },
        { Icon: FlaskConical, title: "Concorrência que dá para ver", body: "Duas transações passo a passo, com locks e intercalações. O ingresso vendido duas vezes acontece na sua frente." },
        { Icon: Trophy, title: "No ritmo da entrevista", body: "Requisitos, estimativa, desenho e aprofundamento. A IA avalia como dois entrevistadores e dá nota em estrelas." },
      ]}
      video={{ src: "/demo/system-design.mp4", poster: "/demo/system-design.jpg", cues: DEMO_CUES }}
    >
      <SdLanding />
    </AppIntro>
  );
}
