"use client";

import { AppIntro } from "@sdp/ui";
import { BarChart3, CalendarDays, CheckSquare, Gauge, Layers, RefreshCw } from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

export function StudyIntro() {
  return (
    <AppIntro
      app="estudos"
      start={{ label: "Abrir a minha central", href: "/#comecar" }}
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
      showcase={[
        {
          img: "/demo/prints/vaga.jpg",
          alt: "O que as vagas de Java pleno pedem, com a frequência de cada habilidade",
          tag: "Pesquisa das vagas",
          title: "Descubra o que o mercado pede, em números",
          problem: "Cada curso diz que o seu tema é essencial. Sem olhar as vagas, você estuda o que está na moda, não o que contrata.",
          body: "Você escreve o cargo e a IA lê os anúncios reais na web, em segundo plano. Volta com a % de vagas que pede cada habilidade, a faixa salarial, as perguntas comuns e as fontes.",
          bullets: ["Marque cada habilidade como não sei, estudando ou domino", "O % de pronto para a vaga pesa o que mais aparece", "A pesquisa vale por 6 meses e é refeita quando você pedir"],
        },
        {
          img: "/demo/prints/lacunas.jpg",
          alt: "As lacunas para a vaga, em ordem de prioridade",
          tag: "O que mais falta",
          title: "Saiba por onde começar",
          problem: "Com tudo para estudar, é fácil gastar semanas no que já sabe ou no que quase nenhuma vaga pede.",
          body: "A Central cruza a pesquisa com o que você marcou e mostra o que mais falta, em ordem. O cronograma dá prioridade a essas lacunas.",
          bullets: ["Ordem pela frequência nas vagas", "Atalho para treinar a habilidade numa entrevista com nota", "Atualiza sozinho quando você estuda ou marca como domino"],
        },
        {
          img: "/demo/prints/trilhas.jpg",
          alt: "Trilhas: livro, certificação e projeto com o progresso de cada um",
          tag: "Trilhas",
          title: "Tudo o que você já estuda, num lugar só",
          problem: "Pós, livro, certificação e projeto ficam espalhados em apps e anotações, e nenhum leva em conta o tempo dos outros.",
          body: "Cada coisa vira uma trilha dividida em partes (matérias, capítulos, módulos, entregas), com importância, quantas vezes por semana entra e o tempo de cada sessão.",
          bullets: ["6 tipos: pós, certificação, livro, curso, projeto e outro", "Prazo opcional (ex. a data da prova)", "Progresso que avança quando você marca os blocos"],
        },
        {
          img: "/demo/prints/projetos.jpg",
          alt: "Três projetos de portfólio sugeridos a partir das lacunas",
          tag: "Projetos de portfólio",
          title: "Um projeto que prova o que falta no currículo",
          problem: "Projeto de portfólio genérico (mais um to-do list) não mostra nada do que a vaga pede.",
          body: "A IA sugere 3 projetos que praticam exatamente as suas lacunas, com as entregas e o tempo estimado. Escolher um transforma o projeto em trilha.",
          bullets: ["Cada projeto diz quais habilidades pratica", "Entregas em ordem, prontas para o cronograma", "Peça outros se nenhum agradar"],
        },
        {
          img: "/demo/prints/cronograma.jpg",
          alt: "Cronograma da semana em blocos curtos, com o dia de hoje marcado",
          tag: "Cronograma",
          title: "Um plano que cabe na sua semana real",
          problem: "Plano de estudos que ignora a sua rotina dura uma semana. Depois do primeiro atraso, vira culpa.",
          body: "Você diz quanto tempo livre tem em cada dia e a IA encaixa as trilhas em blocos curtos, com revisão espaçada, treinos com nota e folga para imprevistos. Atrasou? Replaneja a partir de hoje.",
          bullets: ["14 dias detalhados e um esboço das semanas seguintes", "Revisão espaçada de 2 e 7 dias", "Cumprir os blocos do dia pode ser a sua meta no Hábito"],
        },
        {
          img: "/demo/prints/conversa.jpg",
          alt: "Conversa com a IA montando a trilha da pós",
          tag: "Conversa com a IA",
          title: "Converse como com um colega de carreira",
          problem: "Formulário para cadastrar pós, livro e prova é chato, e ninguém preenche direito.",
          body: "Você conta em texto livre o que está fazendo e a IA monta a trilha para você adicionar com um clique. Ela também guarda combinados (\"sábado não estudo\") e refaz o cronograma.",
          bullets: ["Busca na web quando precisa (ex. a grade da sua pós)", "Sugestões prontas para começar a conversa", "Os combinados aparecem no cronograma"],
        },
      ]}
      features={[
        { Icon: Gauge, title: "Pronto para a vaga", body: "Um número de 0 a 100% que sobe conforme você domina o que as vagas pedem." },
        { Icon: CheckSquare, title: "Conta na meta do Hábito", body: "Os blocos feitos marcam a meta do dia e avançam as trilhas." },
        { Icon: RefreshCw, title: "Lembrete de replanejar", body: "No domingo, ou quando o cronograma está acabando, a Central avisa." },
      ]}
      steps={[
        { title: "Diga o cargo", body: "A IA pesquisa as vagas em segundo plano (vale por 6 meses)." },
        { title: "Marque o que já sabe", body: "Não sei, estudando ou domino: o % de prontidão se ajusta." },
        { title: "Monte as trilhas", body: "Junte o que já estuda e escolha um projeto que cobre o que falta." },
        { title: "Siga o cronograma", body: "Marque os blocos do dia. Replaneje quando a semana mudar." },
      ]}
      video={{ src: "/demo/estudos.mp4", poster: "/demo/estudos.jpg", cues: DEMO_CUES }}
    />
  );
}
