"use client";

import { AppIntro } from "@sdp/ui";
import { BarChart3, CalendarDays, Layers } from "lucide-react";

const SKILLS: [string, number, 0 | 1 | 2][] = [
  ["Spring Boot", 92, 2],
  ["SQL", 83, 1],
  ["Docker", 71, 0],
  ["Kafka", 46, 0],
];
const STATUS = ["não sei", "estudando", "domino"];
const STATUS_COLOR = ["text-down", "text-warn", "text-ok"];
const WEEK: [string, string, string][] = [
  ["seg", "Docker · cap. 2", "25 min"],
  ["ter", "Spring Boot · revisão", "15 min"],
  ["qua", "Pós · Arquitetura", "40 min"],
  ["qui", "Kafka · intro", "25 min"],
];

function Demo({ f }: { f: number }) {
  if (f === 0)
    return (
      <div className="flex h-full flex-col justify-center gap-3">
        <div className="rounded-md border border-border bg-[#0a0e1a] px-3 py-2 font-mono text-[12px]">
          Desenvolvedor Java Pleno<span className="cursor-blink text-accent-2">_</span>
        </div>
        <div className="font-mono text-[11px] text-muted">lendo anúncios reais… 24 vagas encontradas</div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-border">
          <div className="loading-bar absolute inset-y-0 w-1/3 rounded-full bg-accent-2" />
        </div>
      </div>
    );
  if (f <= 2)
    return (
      <div className="flex h-full flex-col gap-2">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted">o que as vagas pedem</div>
        {SKILLS.map(([s, p, st], i) => (
          <div key={s} className="flex items-center gap-2 text-[12px]">
            <span className="w-20 shrink-0">{s}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-accent-2 shadow-[0_0_6px_var(--accent-2)] transition-all duration-700" style={{ width: `${p}%`, transitionDelay: `${i * 120}ms` }} />
            </div>
            <span className="w-8 text-right font-mono text-[11px] text-muted">{p}%</span>
            <span className={`w-16 text-right font-mono text-[10px] ${STATUS_COLOR[st]}`}>{STATUS[st]}</span>
          </div>
        ))}
        {f === 2 && (
          <div className="pop-in mt-2 flex items-center justify-between rounded-md border border-accent-2/40 px-3 py-2 text-[12px]">
            <span>
              Pronto para a vaga: <span className="font-mono text-accent-2">58%</span>
            </span>
            <span className="text-muted">falta: Docker, Kafka</span>
          </div>
        )}
      </div>
    );
  return (
    <div className="flex h-full flex-col gap-2">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted">seu cronograma · semana 1</div>
      {WEEK.map(([d, t, m], i) => {
        const done = f === 4 && i === 0;
        return (
          <div key={d} className={`pop-in flex items-center gap-3 rounded-md border px-3 py-1.5 text-[12px] ${done ? "border-ok/60" : "border-border"}`} style={{ animationDelay: `${i * 120}ms` }}>
            <span className="w-8 font-mono text-[10px] uppercase text-muted">{d}</span>
            <span className="flex-1">{t}</span>
            <span className="font-mono text-[10px] text-muted">{m}</span>
            <span className={done ? "text-ok" : "text-border"}>{done ? "✓" : "○"}</span>
          </div>
        );
      })}
      {f === 4 && <div className="pop-in mt-1 self-center font-mono text-[11px] text-ok">blocos de hoje feitos → meta do dia cumprida no Hábito</div>}
    </div>
  );
}

export function StudyIntro() {
  return (
    <AppIntro
      id="estudos"
      tone="accent-2"
      name="a Central de estudos"
      headline={
        <>
          Pare de estudar no escuro: <span className="text-accent-2 glow">estude o que a vaga pede.</span>
        </>
      }
      lead="Curso, pós, livro e projeto paralelo disputam o mesmo tempo livre, e é fácil passar meses estudando o que nenhuma vaga cobra. A Central lê as vagas reais do cargo que você quer, mostra o que falta e transforma tudo num cronograma que cabe na sua semana."
      points={[
        { Icon: BarChart3, title: "O mercado em números", body: "A IA lê de 15 a 30 anúncios reais e mostra a % de vagas que pede cada habilidade, com faixa salarial e fontes." },
        { Icon: Layers, title: "Tudo num lugar só", body: "Pós, certificação, livro, curso e projetos de portfólio viram trilhas, montadas conversando com a IA." },
        { Icon: CalendarDays, title: "Um plano que cabe na semana", body: "Blocos curtos com revisão espaçada, no tempo que você tem em cada dia, contando para a meta do Hábito." },
      ]}
      steps={[
        { title: "Diga o cargo", body: "A IA pesquisa as vagas em segundo plano (vale por 6 meses)." },
        { title: "Marque o que já sabe", body: "Não sei, estudando ou domino: o % de prontidão se ajusta." },
        { title: "Monte as trilhas", body: "Junte o que já estuda e escolha um projeto que cobre o que falta." },
        { title: "Siga o cronograma", body: "Marque os blocos do dia. Replaneje quando a semana mudar." },
      ]}
      captions={[
        "Você escreve o cargo e a IA lê as vagas reais.",
        "Ela mostra o que as vagas pedem, e você marca o que já sabe.",
        "Você vê o quanto está pronto e o que mais falta.",
        "A IA monta o cronograma da semana em blocos curtos.",
        "Bloco feito: conta para a meta do dia na placa-mãe.",
      ]}
      demo={(f) => <Demo f={f} />}
    />
  );
}
