"use client";

import { AppIntro, IntroCta, LBento, LBlock, LChecks, LChips, LHeading, LIconItem, LRow, LShot } from "@sdp/ui";
import { CalendarDays, Code2, Compass, FolderSearch, GitBranch, Hand, HelpCircle, ListOrdered, MousePointerClick, Play, Turtle, Wrench, Zap } from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

const P = "/demo/prints";

function PairLanding() {
  return (
    <>
      <IntroCta />

      <LBlock>
        <LHeading center kicker="Como um sênior do seu lado" title="Aprender fazendo, sem pular o fundamento" sub="O mentor conversa com você o tempo todo e explica cada coisa como se fosse o seu primeiro emprego." />
        <LBento
          cols={3}
          items={[
            { Icon: Hand, name: "Um passo por vez", body: "Ele só segue quando você disser que pode continuar." },
            { Icon: Wrench, name: "Ambiente do zero", body: "IDE, JDK, variáveis de ambiente, terminal: onde clicar e por quê." },
            { Icon: GitBranch, name: "Git de verdade", body: "init, commit, push, branch e pull request, com o que cada um muda." },
            { Icon: Code2, name: "Código linha por linha", body: "Ele sugere, você digita, e cada linha tem a sua explicação." },
            { Icon: HelpCircle, name: "Qualquer dúvida", body: "\"Como funciona o Git?\" Ele para, explica com calma e volta ao passo." },
            { Icon: FolderSearch, name: "Confere com você", body: "Lê a pasta do projeto e o GitHub para ver se deu certo." },
          ]}
        />
      </LBlock>

      <LRow
        text={
          <>
            <LHeading kicker="O ritmo" title="Faça, confira, e só então continue" sub="Cada passo diz o que fazer, por que fazer e como saber que deu certo." />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={ListOrdered} title="Instruções numeradas" body="Onde clicar, o que digitar e o caminho exato, no Windows." />
              <LIconItem Icon={Play} title="Pode continuar" body="Terminou? Um clique e ele confirma o que foi feito e segue." />
              <LIconItem Icon={Turtle} title="Explica mais devagar" body="Outras palavras, uma analogia e um exemplo menor." />
            </ul>
          </>
        }
        media={<LShot src={`${P}/passo.jpg`} alt="O mentor explicando como configurar o JAVA_HOME no Windows, esperando o pode continuar" />}
      />

      <LRow
        flip
        text={
          <>
            <LHeading kicker="Código" title="Clique numa linha e entenda o porquê" sub="Nada de copiar e colar sem saber o que faz." />
            <LChecks items={["Cada arquivo com o caminho e o nome", "Clique na linha: ele explica cada parte dela", "Boas práticas com o motivo, não como regra solta", "Você digita: é assim que fixa"]} />
          </>
        }
        media={<LShot src={`${P}/linha.jpg`} alt="Um controller do Spring: clique em qualquer linha para o mentor explicar" />}
      />

      <LBlock>
        <LHeading center kicker="O caminho" title="Você sabe onde vai chegar" sub="Ele monta o roteiro do ambiente até o projeto publicado, e a barra mostra em que passo você está." />
        <div className="mx-auto mt-10 max-w-5xl">
          <LShot src={`${P}/roteiro.jpg`} alt="O roteiro completo do projeto, com os passos feitos riscados e o atual em destaque" />
        </div>
      </LBlock>

      <LRow
        text={
          <>
            <LHeading kicker="Conversas" title="Pare hoje, continue amanhã" sub="As conversas ficam guardadas por dia. Ao voltar, o mentor lembra onde vocês pararam." />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={CalendarDays} title="Hoje, ontem, semana passada" body="Clique numa conversa e retome do mesmo passo." />
              <LIconItem Icon={Zap} title="Memória que economiza" body="Vai para a IA o resumo da conversa e as últimas mensagens, não o histórico inteiro." />
            </ul>
          </>
        }
        media={<LShot src={`${P}/conversas.jpg`} alt="A lista de conversas agrupadas por dia" maxH={520} />}
      />

      <LRow
        flip
        text={
          <>
            <LHeading kicker="Se quiser" title="Ligado aos seus Estudos" sub="Escolha um projeto ou uma trilha dos Estudos e o mentor já começa sabendo do que se trata." />
            <LChips items={[{ text: "Passos do projeto" }, { text: "Repositório no GitHub" }, { text: "O que você já domina" }, { text: "Últimos commits" }]} />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={Compass} title="Opcional" body="Sem trilha, é uma conversa livre: qualquer coisa que você queira aprender construindo." />
              <LIconItem Icon={MousePointerClick} title="Conta no Hábito" body="Cada passo concluído marca avanço no projeto na meta do dia." />
            </ul>
          </>
        }
        media={<LShot src={`${P}/nova.jpg`} alt="Começando uma conversa ligada a um projeto dos Estudos e à pasta do computador" />}
      />

      <IntroCta title="Pronto para programar com alguém do lado?" sub="Conte o que quer construir e o mentor começa pelo primeiro passo." />
    </>
  );
}

export function PairIntro() {
  return (
    <AppIntro
      app="pair"
      start={{ label: "Começar a programar", href: "/#comecar" }}
      requireLogin
      id="pair"
      tone="warn"
      name="o Pair Programming"
      headline={
        <>
          Tutorial pula etapa. <span className="text-warn glow">O seu mentor, não.</span>
        </>
      }
      lead="Vídeo e tutorial assumem que você já sabe configurar o ambiente, usar o Git e ler o código. Aqui um mentor de IA programa do seu lado como um sênior faria com um júnior: um passo de cada vez, explicando o porquê de cada linha e esperando você dizer que pode continuar."
      points={[
        { Icon: Hand, title: "No seu ritmo", body: "Um passo por mensagem, com como conferir que deu certo. Ele só segue quando você mandar." },
        { Icon: Code2, title: "Linha por linha", body: "Ambiente, Git e código explicados do fundamento, e qualquer linha clicada vira explicação." },
        { Icon: FolderSearch, title: "Confere de verdade", body: "Lê a pasta do seu projeto e o GitHub para ver o que você fez, sem mexer em nada." },
      ]}
      video={{ src: "/demo/pair.mp4", poster: "/demo/pair.jpg", cues: DEMO_CUES }}
    >
      <PairLanding />
    </AppIntro>
  );
}
