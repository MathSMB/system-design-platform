"use client";

import { AppIntro } from "@sdp/ui";
import { CalendarDays, Cpu, Flame, ListChecks, Repeat, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

export function HabitIntro() {
  return (
    <AppIntro
      id="habito"
      tone="ok"
      name="o Hábito"
      headline={
        <>
          Constância vira <span className="text-ok glow">uma máquina montada</span>, peça por peça.
        </>
      }
      lead="O difícil não é estudar um dia, é estudar todo dia sem perder o fio. O Hábito transforma a sua meta diária numa placa-mãe neon: cada dia cumprido instala uma peça, e dia perdido tem consequência, mas sem jogar tudo fora por um tropeço."
      points={[
        { Icon: Cpu, title: "Progresso que dá para ver", body: "15 peças, do processador ao RGB. Com a placa completa, cada dia vira overclock." },
        { Icon: ShieldCheck, title: "Tropeçar não zera", body: "2 failovers por semana. Sem eles, a máquina se desgasta, e o próximo dia cumprido conserta um nível." },
        { Icon: Zap, title: "Conta sozinho", body: "Respostas avaliadas, etapas do processo seletivo, desenhos de system design e os blocos da Central de estudos entram na meta sem você marcar." },
      ]}
      features={[
        { Icon: Cpu, title: "Placa-mãe neon com 15 peças", body: "Processador, memória DDR5, SSD Gen5, water cooler, VRM, placa de vídeo… até a iluminação RGB. Cada dia cumprido instala a próxima, com animação de encaixe e trilhas que acendem." },
        { Icon: Sparkles, title: "Overclock", body: "Com a placa completa, cada dia cumprido vira um ponto de overclock e as ventoinhas giram mais rápido." },
        { Icon: ShieldCheck, title: "Failover", body: "2 por semana: um dia perdido gasta um failover e não desgasta nada. Tropeçar uma vez não estraga a semana." },
        { Icon: Wrench, title: "Desgaste e conserto", body: "Sem failover, 6 níveis de desgaste: poeira, engasgo, superaquecimento, ventoinha parada, curto e vazamento. Cada dia cumprido conserta um." },
        { Icon: Flame, title: "Queima e recomeço", body: "No 6º nível a máquina queima com fogo no VRM, as peças saem e a montagem recomeça. A marca de queimado fica na placa." },
        { Icon: ListChecks, title: "Meta do dia do seu jeito", body: "Modelos prontos (leve, regular, intensa) ou itens seus: estudo livre que você marca, respostas, etapas, desenhos e o cronograma do dia." },
        { Icon: Zap, title: "Conta sozinho", body: "O que você faz no System Design, na Entrevista e nos Estudos chega pela API de eventos e marca a meta automaticamente." },
        { Icon: CalendarDays, title: "Calendário do último ano", body: "Cada dia com a cor do que aconteceu: peça instalada, conserto, failover, desgaste, overclock ou queima." },
        { Icon: Repeat, title: "Trocar a meta não reescreve o passado", body: "Cada dia é julgado com a meta que valia nele. A meta nova vale a partir de hoje." },
      ]}
      steps={[
        { title: "Crie o perfil", body: "No Painel: a vaga que você treina e a meta do dia." },
        { title: "Treine nos outros apps", body: "O que conta para a meta é marcado sozinho; o seu estudo livre você marca aqui." },
        { title: "Abra a placa-mãe", body: "A tela anima o que mudou desde a última visita: peça nova, conserto ou desgaste." },
        { title: "Não deixe queimar", body: "No 6º nível de desgaste a máquina queima e a montagem recomeça do zero." },
      ]}
      video={{ src: "/demo/habito.mp4", poster: "/demo/habito.jpg", cues: DEMO_CUES }}
    />
  );
}
