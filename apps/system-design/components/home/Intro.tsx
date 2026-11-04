"use client";

import { AppIntro } from "@sdp/ui";
import { Database, Flame, FlaskConical, Gauge, Server, Trophy, Users, Zap, type LucideIcon } from "lucide-react";

/** Um bloquinho do canvas na demonstração. */
function Node({ Icon, label, tone, show = true, hot = false }: { Icon: LucideIcon; label: string; tone: string; show?: boolean; hot?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 transition-all duration-500 ${show ? "scale-100 opacity-100" : "scale-75 opacity-0"}`}>
      <div className="relative">
        {hot && <Flame size={14} className="absolute -top-4 left-1/2 -translate-x-1/2 animate-pulse text-bad" />}
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 bg-panel transition-colors duration-500 ${hot ? "border-down text-down" : ""}`}
          style={hot ? { boxShadow: "0 0 14px var(--down)" } : { borderColor: `var(--${tone})`, color: `var(--${tone})`, boxShadow: `0 0 10px color-mix(in srgb, var(--${tone}) 40%, transparent)` }}
        >
          <Icon size={18} />
        </div>
      </div>
      <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{label}</span>
    </div>
  );
}

const Arrow = ({ show = true, bad = false }: { show?: boolean; bad?: boolean }) => (
  <span className={`mb-4 font-mono text-xs transition-opacity duration-500 ${show ? "opacity-100" : "opacity-0"} ${bad ? "text-down" : "text-accent"}`}>➤</span>
);

function Demo({ f }: { f: number }) {
  const ran = f >= 1;
  const cache = f >= 2;
  const fixed = f >= 3;
  const hot = ran && !fixed;
  return (
    <div className="flex h-full flex-col justify-center gap-6">
      <div className="flex items-end justify-center gap-3 pt-4">
        <Node Icon={Users} label="usuários" tone="text" />
        <Arrow />
        <Node Icon={Server} label="app" tone="ok" />
        <Arrow />
        <Node Icon={Zap} label="cache" tone="accent-2" show={cache} />
        <Arrow show={cache} />
        <Node Icon={Database} label="banco" tone="bad" hot={hot} />
      </div>
      <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
        {[
          ["req/s", ran ? "5.000" : "—", false],
          ["p99", !ran ? "—" : fixed ? "80 ms" : "2,4 s", hot],
          ["erros", !ran ? "—" : fixed ? "0%" : "31%", hot],
        ].map(([k, v, bad]) => (
          <div key={k as string} className={`rounded-md border px-2 py-1.5 transition-colors duration-500 ${bad ? "pulse-bad border-down text-down" : fixed && v !== "—" ? "border-ok/60 text-ok" : "border-border text-text"}`}>
            <div className="text-[9px] uppercase text-muted">{k}</div>
            <div className="text-sm">{v}</div>
          </div>
        ))}
      </div>
      {fixed && (
        <div className="pop-in flex items-center gap-1 self-center text-warn">
          {[0, 1, 2].map((i) => (
            <Trophy key={i} size={14} />
          ))}
          <span className="ml-1 text-[11px] text-muted">cumpriu o SLO</span>
        </div>
      )}
    </div>
  );
}

export function SdIntro() {
  return (
    <AppIntro
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
      steps={[
        { title: "Escolha o modo", body: "Estudo tem mentor e dicas. Entrevista técnica é sem ajuda, como no dia." },
        { title: "Desenhe no canvas", body: "Arraste usuários, load balancer, servidores, cache, filas e banco, e conecte." },
        { title: "Simule e veja quebrar", body: "Aplique a carga do enunciado ou derrube um componente e veja o efeito em cascata." },
        { title: "Corrija e explique", body: "Ajuste até cumprir o SLO e receba o feedback com o que dizer na entrevista." },
      ]}
      captions={[
        "Você desenha: usuários, app e banco.",
        "Simula 5.000 req/s: o banco não aguenta e o p99 vai a 2,4 s.",
        "Você coloca um cache na frente do banco.",
        "Simula de novo: p99 de 80 ms e zero erros. Agora é explicar o porquê.",
      ]}
      demo={(f) => <Demo f={f} />}
    />
  );
}
