"use client";

import Link from "next/link";
import { AppIntro } from "@sdp/ui";
import { Briefcase, CheckCircle2, MessageSquareText, Target } from "lucide-react";

const STAGES = ["Triagem", "RH", "Técnica", "Gestor", "Proposta"];

function Bubble({ me, show, children }: { me?: boolean; show: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`max-w-[85%] rounded-lg border px-3 py-2 text-[12px] leading-snug transition-all duration-500 ${me ? "self-end border-accent/40 bg-accent/10" : "self-start border-border bg-panel-2"} ${show ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
    >
      {children}
    </div>
  );
}

function Demo({ f }: { f: number }) {
  // quadro 0-2: RH; 3: passou para a técnica; 4: proposta
  const at = f < 3 ? 1 : f === 3 ? 2 : 4;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-1">
        {STAGES.map((s, i) => (
          <div key={s} className="flex flex-1 flex-col items-center gap-1">
            <div className={`h-1.5 w-full rounded-full transition-colors duration-500 ${i < at ? "bg-ok/70" : i === at ? "bg-bad shadow-[0_0_6px_var(--bad)]" : "bg-border"}`} />
            <span className={`font-mono text-[9px] uppercase ${i === at ? "text-bad" : "text-muted"}`}>{s}</span>
          </div>
        ))}
      </div>
      {f < 4 ? (
        <div className="flex flex-1 flex-col gap-2">
          <Bubble show>
            <span className="font-semibold text-bad">Carla (RH):</span> Me conta um projeto em que você usou Spring Boot.
          </Bubble>
          <Bubble me show={f >= 1}>Fiz uma API de pedidos com Spring Boot e Postgres e reduzi o tempo de resposta usando cache…</Bubble>
          <div className={`rounded-lg border border-ok/40 bg-ok/5 px-3 py-2 text-[11px] transition-all duration-500 ${f >= 2 ? "opacity-100" : "opacity-0"}`}>
            <div className="flex items-center justify-between font-mono">
              <span className="text-ok">nível: pleno</span>
              <span className="text-warn">7,5 / 10</span>
            </div>
            <div className="mt-1 text-muted">Faltou: quanto o tempo caiu e como você mediu.</div>
          </div>
          {f === 3 && <div className="pop-in self-center font-mono text-[11px] text-ok">✓ passou no RH · próxima etapa: entrevista técnica</div>}
        </div>
      ) : (
        <div className="pop-in flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <CheckCircle2 size={34} className="text-ok" style={{ filter: "drop-shadow(0 0 8px var(--ok))" }} />
          <div className="font-display text-xs text-ok glow">CONTRATADO</div>
          <div className="font-mono text-[12px] text-text">Proposta: R$ 8.500 CLT</div>
          <div className="text-[11px] text-muted">+ feedback geral com os pontos para treinar</div>
        </div>
      )}
    </div>
  );
}

export function EntrevistaIntro() {
  return (
    <AppIntro
      id="entrevista"
      tone="bad"
      name="a Entrevista"
      headline={
        <>
          Treine a entrevista <span className="text-bad glow">antes</span> de ela valer a vaga.
        </>
      }
      lead="O nervosismo e a resposta vaga custam mais do que o conteúdo. Aqui você passa por um processo seletivo inteiro conversando com a IA, responde falando ou digitando, e descobre em cada resposta o que faltou para soar como a senioridade que você quer."
      points={[
        { Icon: Briefcase, title: "O processo inteiro", body: "Triagem, RH, teste técnico, entrevista técnica, gestor, proposta e admissão, com imprevistos como contraproposta e vaga de outro nível." },
        { Icon: MessageSquareText, title: "Feedback em cada resposta", body: "Nível que a resposta mostrou, nota, o que faltou e uma versão melhor para você comparar." },
        { Icon: Target, title: "Feito para a sua vaga", body: "Perguntas por área, stack e senioridade, baseadas no que as vagas reais pedem." },
      ]}
      steps={[
        { title: "Escolha a vaga", body: "Área, stack, senioridade e o tipo de empresa." },
        { title: "Converse com a IA", body: "Cada etapa tem um entrevistador. Responda por voz ou texto." },
        { title: "Veja o que faltou", body: "O feedback aparece na hora, e você pode tentar de novo." },
        { title: "Receba o veredito", body: "Contratado ou eliminado, com feedback geral salvo no histórico." },
      ]}
      captions={[
        "A recrutadora faz a pergunta da etapa de RH.",
        "Você responde falando ou digitando.",
        "A IA mostra o nível da resposta, a nota e o que faltou.",
        "Passou na etapa: o processo segue para a entrevista técnica.",
        "No fim, a proposta (ou o motivo da eliminação) e o feedback geral.",
      ]}
      demo={(f) => <Demo f={f} />}
      cta={
        <Link href="/processo-seletivo" className="btn-neon px-4 py-2 text-xs">
          Começar um processo ▶
        </Link>
      }
    />
  );
}
