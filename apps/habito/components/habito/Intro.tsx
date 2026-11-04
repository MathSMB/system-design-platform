"use client";

import { AppIntro } from "@sdp/ui";
import { Cpu, Repeat, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

export function HabitIntro() {
  return (
    <AppIntro
      app="habito"
      start={{ label: "Ver a minha placa-mãe", href: "/#comecar" }}
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
      showcase={[
        {
          img: "/demo/prints/placa.jpg",
          alt: "A placa-mãe completa, com water cooler, placa de vídeo e RGB",
          tag: "A placa-mãe",
          title: "Cada dia cumprido instala uma peça",
          problem: "Contador de dias seguidos é abstrato: um número não dá vontade de voltar amanhã.",
          body: "A sua constância vira uma placa-mãe neon montada peça por peça: processador, memória, SSD, water cooler, VRM, placa de vídeo, até a iluminação RGB. A tela anima o que mudou desde a última visita.",
          bullets: ["15 peças, cada uma com animação de encaixe e trilhas que acendem", "Com a placa completa, cada dia vira overclock", "Ofensiva, recorde e marcos de 7, 30, 66 e 100 dias"],
        },
        {
          img: "/demo/prints/desgaste.jpg",
          alt: "Placa com 4 níveis de desgaste: fogo, ventoinha parada e curto",
          tag: "Desgaste e conserto",
          title: "Dia perdido tem consequência, mas não zera tudo",
          problem: "App de hábito que zera tudo no primeiro tropeço faz você desistir. E um que não cobra nada não muda nada.",
          body: "Você tem 2 failovers por semana para dias perdidos. Sem failover, a máquina se desgasta: poeira, engasgo, superaquecimento, ventoinha parada, curto e vazamento. Cada dia cumprido conserta um nível.",
          bullets: ["6 níveis de desgaste, cada um visível na placa", "No 6º nível a máquina queima e a montagem recomeça", "A marca de queimado fica, para lembrar"],
        },
        {
          img: "/demo/prints/meta.jpg",
          alt: "A meta de hoje com estudo livre e uma resposta avaliada pela IA",
          tag: "Meta do dia",
          title: "A meta conta sozinha o que você fez nos outros apps",
          problem: "Marcar à mão tudo o que estudou é trabalho a mais, e você acaba esquecendo de marcar.",
          body: "A meta junta o que você marca (estudo livre) com o que conta sozinho: respostas avaliadas na Entrevista, etapas de processo, desenhos do System Design e os blocos da Central de estudos.",
          bullets: ["\"Todos os itens\" ou \"qualquer um\" para cumprir", "O que vem dos outros apps chega pela API de eventos", "Marque um dia que esqueceu de registrar"],
        },
        {
          img: "/demo/prints/editar-meta.jpg",
          alt: "Editor da meta com os modelos Sugerida, Leve, Regular, Intensa e Do seu jeito",
          tag: "Meta do seu jeito",
          title: "Uma meta que cabe na sua fase",
          problem: "Meta fixa demais quebra na semana corrida; meta fácil demais não leva a lugar nenhum.",
          body: "Escolha um modelo pronto ou monte a sua com até 8 itens. Trocar a meta não reescreve o passado: cada dia é julgado com a meta que valia nele.",
          bullets: ["Modelos com o tempo estimado (de 5 a 40 min)", "Itens seus, da plataforma ou o cronograma do dia", "Um perfil por vaga, cada um com a sua placa"],
        },
        {
          img: "/demo/prints/calendario.jpg",
          alt: "Calendário do último ano com a cor de cada dia",
          tag: "Calendário",
          title: "Veja o ano inteiro de uma vez",
          problem: "Sem histórico, você não percebe o padrão: os dias da semana em que sempre falha, os meses bons e os ruins.",
          body: "O calendário mostra cada dia do último ano com a cor do que aconteceu na placa.",
          bullets: ["Peça instalada, conserto, failover, desgaste e queima", "Passe o mouse num dia para ver o estado e a peça instalada"],
        },
      ]}
      features={[
        { Icon: Sparkles, title: "Overclock", body: "Com as 15 peças instaladas, cada dia cumprido vira um ponto de overclock e as ventoinhas giram mais rápido." },
        { Icon: ShieldCheck, title: "Failover", body: "2 por semana: o dia perdido gasta um failover e nada quebra." },
        { Icon: Repeat, title: "O passado não muda", body: "Trocar a meta vale a partir de hoje; os dias anteriores continuam com a meta antiga." },
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
