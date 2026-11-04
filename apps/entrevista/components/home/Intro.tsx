"use client";

import { AppIntro, IntroCta, LBento, LBlock, LChecks, LHeading, LIconItem, LRow, LShot } from "@sdp/ui";
import {
  BadgeCheck,
  BadgeDollarSign,
  Briefcase,
  Building2,
  Code2,
  Coffee,
  FileSearch,
  History,
  Lightbulb,
  MessageSquareText,
  Mic,
  Repeat,
  Shuffle,
  Sparkles,
  Target,
  ThumbsDown,
  ThumbsUp,
  Timer,
  UserRound,
  Users,
  Zap,
} from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

const P = "/demo/prints";

function EntrevistaLanding() {
  return (
    <>
      <IntroCta />

      <LBlock>
        <LHeading center kicker="O processo inteiro" title="7 etapas, do formulário à admissão" sub="Como num processo seletivo de verdade, cada etapa tem quem entrevista, o que avalia e o que pode dar errado." />
        <LBento
          items={[
            { Icon: FileSearch, name: "Triagem", body: "Formulário e filtro automático, antes de alguém ler o currículo." },
            { Icon: MessageSquareText, name: "RH", body: "Trajetória, motivação e pretensão, com a recrutadora." },
            { Icon: Code2, name: "Teste técnico", body: "Revisão de código e desafio da stack." },
            { Icon: Target, name: "Entrevista técnica", body: "Perguntas com contexto de trabalho, sem decoreba." },
            { Icon: Users, name: "Gestor", body: "Comportamento, conflitos e como você decide." },
            { Icon: BadgeDollarSign, name: "Proposta", body: "Salário, CLT ou PJ, e a negociação." },
            { Icon: BadgeCheck, name: "Admissão", body: "Documentos e o primeiro dia." },
            { Icon: Shuffle, name: "Imprevistos", body: "Recrutador some, contraproposta, vaga de outro nível…", color: "var(--accent-2)" },
          ]}
        />
      </LBlock>

      <LRow
        text={
          <>
            <LHeading kicker="A sua vaga" title="Escolha a vaga que você quer de verdade" sub="Banco digital não entrevista igual a consultoria. Escolha a empresa e treine para o formato dela." />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={Briefcase} title="Área, stack e senioridade" body="Back-end, front-end, DevOps, dados, mobile e QA; Java, Node, Python, .NET, Go…" />
              <LIconItem Icon={Building2} title="3 empresas, 3 culturas" body="Cada uma com etapas, faixa salarial e estilo de entrevista próprios." />
            </ul>
          </>
        }
        media={<LShot src={`${P}/empresa-cards.jpg`} alt="As três empresas para escolher: Tucano Bank, Órbita Consultoria e Serra Sistemas" />}
      />

      <LRow
        flip
        text={
          <>
            <LHeading kicker="Conversa" title="Um entrevistador que responde, não um quiz" sub="Você fala ou digita, e a IA reage no papel de quem entrevista." />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={Mic} title="Responda falando" body="O microfone transcreve em tempo real, como numa call." />
              <LIconItem Icon={Timer} title="2 minutos por resposta" body="O mesmo relógio da entrevista de verdade." />
              <LIconItem Icon={Repeat} title="Aprofunda quando fica raso" body="Se a resposta for vaga, vem a pergunta seguinte em cima dela." />
            </ul>
          </>
        }
        media={<LShot src={`${P}/conversa.jpg`} alt="Conversa com a recrutadora: pergunta, resposta e réplica" notes={[{ x: 22, y: 81, text: "A IA responde no papel", tone: "var(--bad)" }]} />}
      />

      <LRow
        text={
          <>
            <LHeading kicker="Feedback" title="Saiba exatamente o que faltou" sub="Depois de uma entrevista real, ninguém te conta. Aqui, cada resposta volta avaliada." />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={Sparkles} title="O nível da sua resposta" body="Júnior, pleno ou sênior, com nota de 0 a 10." />
              <LIconItem Icon={ThumbsUp} color="var(--ok)" title="O que você acertou" />
              <LIconItem Icon={ThumbsDown} color="var(--warn)" title="O que faltou" />
              <LIconItem Icon={Lightbulb} title="Como alguém do nível falaria" body="Uma resposta de referência e dicas de como falar." />
            </ul>
          </>
        }
        media={
          <LShot
            src={`${P}/feedback-card.jpg`}
            alt="Feedback de uma resposta: nível pleno, 7 de 10, pontos fortes e fracos"
            notes={[
              { x: 30, y: 4, text: "Nível e nota", tone: "var(--ok)" },
              { x: 60, y: 61, text: "Resposta de referência", tone: "var(--accent)" },
            ]}
          />
        }
      />

      <LRow
        flip
        text={
          <>
            <LHeading kicker="Treino por stack" title="Só a parte técnica, bloco por bloco" sub="Tem uma entrevista marcada? Reforce o que as vagas mais cobram." />
            <LChecks items={["Java core, Spring Boot, APIs REST, SQL e JPA, microsserviços, testes e Docker", "Quantas vagas pedem cada bloco", "Entrevista completa com 8 perguntas sorteadas"]} />
          </>
        }
        media={<LShot src={`${P}/java.jpg`} alt="Treino de Java pleno com os blocos de perguntas" maxH={460} />}
      />

      <LBlock>
        <LHeading center kicker="E mais" title="Tudo salvo, tudo contando" />
        <ul className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          <LIconItem Icon={History} title="Histórico" body="Cada entrevista com nota e respostas para rever." />
          <LIconItem Icon={UserRound} title="Feedback geral" body="O veredito da etapa e o que estudar antes da próxima." />
          <LIconItem Icon={Zap} title="Conta no Hábito" body="Respostas e etapas marcam a meta do dia sozinhas." />
        </ul>
      </LBlock>

      <IntroCta title="Pronto para a próxima entrevista?" sub="Treine aqui antes de ela valer a vaga." />
    </>
  );
}

export function EntrevistaIntro() {
  return (
    <AppIntro
      app="entrevista"
      start={{ label: "Começar a treinar", href: "/#comecar" }}
      requireLogin
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
        { Icon: Coffee, title: "Feito para a sua vaga", body: "Perguntas por área, stack e senioridade, baseadas no que as vagas reais pedem." },
      ]}
      video={{ src: "/demo/entrevista.mp4", poster: "/demo/entrevista.jpg", cues: DEMO_CUES }}
    >
      <EntrevistaLanding />
    </AppIntro>
  );
}
