"use client";

import { AppIntro, IntroCta, LBento, LBlock, LChecks, LChips, LHeading, LIconItem, LRow, LShot, LStat } from "@sdp/ui";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  FolderGit2,
  Gauge,
  GraduationCap,
  Layers,
  ListOrdered,
  MessageCircle,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

const P = "/demo/prints";

function EstudosLanding() {
  return (
    <>
      <IntroCta />

      <LBlock>
        <LHeading center kicker="Do anúncio à meta de hoje" title="Tudo o que você precisa para estudar com direção" sub="Seis peças que conversam entre si: o que a vaga pede vira o que você estuda nesta semana." />
        <LBento
          cols={3}
          items={[
            { Icon: Search, name: "Pesquisa das vagas", body: "A IA lê os anúncios reais do cargo que você quer." },
            { Icon: Gauge, name: "Pronto para a vaga", body: "Um número de 0 a 100% que sobe conforme você domina o que pedem." },
            { Icon: ListOrdered, name: "Lacunas", body: "O que mais falta, em ordem de prioridade." },
            { Icon: Layers, name: "Trilhas", body: "Pós, certificação, livro, curso e projeto num lugar só." },
            { Icon: FolderGit2, name: "Projetos", body: "Portfólio que pratica exatamente as suas lacunas." },
            { Icon: CalendarDays, name: "Cronograma", body: "Blocos curtos que cabem no tempo livre de cada dia." },
          ]}
        />
      </LBlock>

      <LRow
        text={
          <>
            <LHeading kicker="Pesquisa das vagas" title="Descubra o que o mercado pede, em números" sub="Cada curso diz que o seu tema é essencial. As vagas dizem o que contrata." />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={BarChart3} title="A % de vagas por habilidade" body="Com faixa salarial, perguntas comuns e as fontes." />
              <LIconItem Icon={CheckSquare} title="Marque o que você já sabe" body="Não sei, estudando ou domino: o % de prontidão se ajusta." />
              <LIconItem Icon={RefreshCw} title="Vale por 6 meses" body="E é refeita quando você pedir." />
            </ul>
          </>
        }
        media={<LShot src={`${P}/vaga.jpg`} alt="O que as vagas de Java pleno pedem, com a frequência de cada habilidade" />}
      />

      <LBlock>
        <LHeading center kicker="Exemplo: Java pleno" title="Saiba por onde começar" sub="A Central cruza a pesquisa com o que você marcou e mostra o que mais falta." />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
          <LStat label="Anúncios lidos" value="64" hint="vagas reais na web" />
          <LStat label="Faixa CLT (R$ mil)" value="7,5–11,5" hint="tirada dos próprios anúncios" />
          <LStat label="Lacunas" value="7" hint="em ordem de prioridade" color="var(--warn)" />
        </div>
        <div className="mx-auto mt-10 max-w-5xl">
          <LShot src={`${P}/lacunas.jpg`} alt="As lacunas para a vaga, em ordem de prioridade" />
        </div>
      </LBlock>

      <LRow
        flip
        text={
          <>
            <LHeading kicker="Trilhas" title="Tudo o que você já estuda, num lugar só" sub="Cada coisa vira uma trilha dividida em partes, com o tempo de cada sessão." />
            <LChips items={[{ text: "Pós" }, { text: "Certificação" }, { text: "Livro" }, { text: "Curso" }, { text: "Projeto" }, { text: "Outro" }]} />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={GraduationCap} title="Prazo opcional" body="Por exemplo, a data da prova da certificação." />
              <LIconItem Icon={BookOpen} title="Progresso que avança sozinho" body="Cada bloco marcado no cronograma move a trilha." />
            </ul>
          </>
        }
        media={<LShot src={`${P}/trilhas.jpg`} alt="Trilhas: livro, certificação e projeto com o progresso de cada um" />}
      />

      <LBlock>
        <LHeading center kicker="Projetos de portfólio" title="Um projeto que prova o que falta no currículo" sub="Nada de mais um to-do list: a IA sugere 3 projetos que praticam as suas lacunas." />
        <div className="mx-auto mt-10 max-w-5xl">
          <LShot src={`${P}/projetos.jpg`} alt="Três projetos de portfólio sugeridos a partir das lacunas" />
        </div>
      </LBlock>

      <LRow
        text={
          <>
            <LHeading kicker="Cronograma" title="Um plano que cabe na sua semana real" sub="Você diz quanto tempo tem em cada dia, e a IA encaixa as trilhas." />
            <LChecks items={["14 dias detalhados e um esboço das semanas seguintes", "Revisão espaçada de 2 e 7 dias", "Atrasou? Replaneja a partir de hoje", "No domingo, a Central lembra de replanejar"]} />
          </>
        }
        media={<LShot src={`${P}/cronograma.jpg`} alt="Cronograma da semana em blocos curtos, com o dia de hoje marcado" />}
      />

      <LRow
        flip
        wideMedia={false}
        text={
          <>
            <LHeading kicker="Conversa com a IA" title="Converse como com um colega de carreira" sub="Conte em texto livre o que está fazendo, e a trilha sai pronta." />
            <ul className="flex flex-col gap-5">
              <LIconItem Icon={MessageCircle} title="Sem formulário chato" body="A IA monta a trilha para você adicionar com um clique." />
              <LIconItem Icon={Search} title="Busca na web quando precisa" body="Por exemplo, a grade da sua pós." />
              <LIconItem Icon={Sparkles} title="Guarda os combinados" body="'Sábado não estudo' entra no cronograma." />
            </ul>
          </>
        }
        media={<LShot src={`${P}/conversa.jpg`} alt="Conversa com a IA montando a trilha da pós" maxH={520} />}
      />

      <LBlock>
        <LHeading center kicker="E mais" title="Ligada aos outros apps" />
        <ul className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
          <LIconItem Icon={Target} title="Treine a lacuna" body="Um atalho leva a habilidade para a Entrevista, com nota." />
          <LIconItem Icon={Zap} title="Conta no Hábito" body="Os blocos feitos marcam a meta do dia sozinhos." />
          <LIconItem Icon={RefreshCw} title="Sempre atualizada" body="Estudou ou marcou domino? As lacunas mudam na hora." />
        </ul>
      </LBlock>

      <IntroCta title="Pronto para estudar o que a vaga pede?" sub="Diga o cargo e a pesquisa começa." />
    </>
  );
}

export function StudyIntro() {
  return (
    <AppIntro
      app="estudos"
      start={{ label: "Abrir a minha central", href: "/#comecar" }}
      requireLogin
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
        { Icon: BarChart3, title: "O mercado em números", body: "A IA lê dezenas de anúncios reais e mostra a % de vagas que pede cada habilidade, com faixa salarial e fontes." },
        { Icon: Layers, title: "Tudo num lugar só", body: "Pós, certificação, livro, curso e projetos de portfólio viram trilhas, montadas conversando com a IA." },
        { Icon: CalendarDays, title: "Um plano que cabe na semana", body: "Blocos curtos com revisão espaçada, no tempo que você tem em cada dia, contando para a meta do Hábito." },
      ]}
      video={{ src: "/demo/estudos.mp4", poster: "/demo/estudos.jpg", cues: DEMO_CUES }}
    >
      <EstudosLanding />
    </AppIntro>
  );
}
