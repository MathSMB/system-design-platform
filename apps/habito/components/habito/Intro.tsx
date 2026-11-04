"use client";

import { AppIntro, IntroCta, LBento, LBlock, LChecks, LChips, LHeading, LIconItem, LRow, LShot } from "@sdp/ui";
import {
  BrainCircuit,
  CalendarDays,
  Cpu,
  Flame,
  History,
  ListChecks,
  MessageSquareText,
  Repeat,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Wrench,
  Zap,
} from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

const P = "/demo/prints";

function HabitoLanding() {
  return (
    <>
      <IntroCta />

      <LRow
        text={
          <>
            <LHeading kicker="A placa-mãe" title="Cada dia cumprido instala uma peça" sub="Um número de dias seguidos não dá vontade de voltar amanhã. Uma máquina montando dá." />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={Cpu} title="15 peças" body="Do processador à iluminação RGB, cada uma com animação de encaixe." />
              <LIconItem Icon={Sparkles} title="Overclock" body="Com a placa completa, cada dia cumprido acelera as ventoinhas." />
              <LIconItem Icon={Trophy} title="Ofensiva e recorde" body="Marcos de 7, 30, 66 e 100 dias." />
            </ul>
          </>
        }
        media={<LShot src={`${P}/placa.jpg`} alt="A placa-mãe completa, com water cooler, placa de vídeo e RGB" />}
      />

      <LRow
        flip
        text={
          <>
            <LHeading kicker="Desgaste e conserto" title="Tropeçar tem consequência, mas não zera" sub="App que zera tudo no primeiro tropeço faz você desistir. Aqui, você conserta." />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={ShieldCheck} title="2 failovers por semana" body="O dia perdido gasta um failover, e nada quebra." />
              <LIconItem Icon={Flame} color="var(--bad)" title="Sem failover, a máquina se desgasta" body="Seis níveis, cada um visível na placa:" />
            </ul>
            <LChips
              items={[
                { text: "Poeira", color: "var(--muted)" },
                { text: "Engasgo", color: "var(--warn)" },
                { text: "Superaquecimento", color: "var(--warn)" },
                { text: "Ventoinha parada", color: "var(--bad)" },
                { text: "Curto", color: "var(--bad)" },
                { text: "Vazamento", color: "var(--bad)" },
              ]}
            />
            <LIconItem Icon={Wrench} title="O próximo dia cumprido conserta um nível" body="No 6º nível a máquina queima e a montagem recomeça." />
          </>
        }
        media={<LShot src={`${P}/desgaste.jpg`} alt="Placa com 4 níveis de desgaste: fogo, ventoinha parada e curto" />}
      />

      <LBlock>
        <LHeading center kicker="Meta do dia" title="A meta conta sozinha o que você fez nos outros apps" sub="Nada de marcar à mão tudo o que estudou. Só o estudo livre é com você." />
        <LBento
          items={[
            { Icon: MessageSquareText, name: "Entrevista", body: "Respostas avaliadas e etapas do processo seletivo." },
            { Icon: BrainCircuit, name: "System Design", body: "Casos de system design avaliados pela IA." },
            { Icon: CalendarDays, name: "Estudos", body: "Os blocos do cronograma de hoje." },
            { Icon: ListChecks, name: "Estudo livre", body: "O que você marca aqui, com um clique." },
          ]}
        />
        <div className="mx-auto mt-10 max-w-5xl">
          <LShot src={`${P}/meta.jpg`} alt="A meta de hoje com estudo livre e uma resposta avaliada pela IA" />
        </div>
      </LBlock>

      <LRow
        text={
          <>
            <LHeading kicker="Meta do seu jeito" title="Uma meta que cabe na sua fase" sub="Meta fixa demais quebra na semana corrida; fácil demais não leva a lugar nenhum." />
            <LChips items={[{ text: "Sugerida" }, { text: "Leve" }, { text: "Regular" }, { text: "Intensa" }, { text: "Do seu jeito" }]} />
            <LChecks items={["Modelos de 5 a 40 minutos por dia", "Até 8 itens, com 'todos' ou 'qualquer um' para cumprir", "Um perfil por vaga, cada um com a sua placa"]} />
            <LIconItem Icon={History} title="O passado não muda" body="Trocar a meta vale a partir de hoje." />
          </>
        }
        media={<LShot src={`${P}/editar-meta.jpg`} alt="Editor da meta com os modelos Sugerida, Leve, Regular, Intensa e Do seu jeito" />}
      />

      <LBlock>
        <LHeading center kicker="Calendário" title="Veja o ano inteiro de uma vez" sub="Os dias em que você sempre falha, os meses bons e os ruins, com a cor do que aconteceu na placa." />
        <div className="mx-auto mt-10 max-w-5xl">
          <LShot src={`${P}/calendario.jpg`} alt="Calendário do último ano com a cor de cada dia" />
        </div>
      </LBlock>

      <LBlock>
        <LHeading center kicker="E mais" title="Feito para durar meses" />
        <ul className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          <LIconItem Icon={Zap} title="Animação do que mudou" body="Ao abrir, a placa mostra a peça nova, o conserto ou o desgaste." />
          <LIconItem Icon={Repeat} title="Esqueceu de marcar?" body="Registre um dia que passou." />
          <LIconItem Icon={Target} title="Uma placa por vaga" body="Cada perfil tem a sua meta e a sua máquina." />
        </ul>
      </LBlock>

      <IntroCta title="Pronto para montar a sua máquina?" sub="O primeiro dia cumprido já instala o processador." />
    </>
  );
}

export function HabitIntro() {
  return (
    <AppIntro
      app="habito"
      start={{ label: "Ver a minha placa-mãe", href: "/#comecar" }}
      requireLogin
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
      video={{ src: "/demo/habito.mp4", poster: "/demo/habito.jpg", cues: DEMO_CUES }}
    >
      <HabitoLanding />
    </AppIntro>
  );
}
