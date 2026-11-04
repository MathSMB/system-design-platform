"use client";

import { AppIntro } from "@sdp/ui";
import { BarChart3, CalendarDays, CheckSquare, FolderGit2, Gauge, Layers, MessageCircle, RefreshCw, Search, Target } from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

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
      features={[
        { Icon: Search, title: "Pesquisa das vagas", body: "Você escreve o cargo e a IA busca anúncios na web em segundo plano: habilidades com a % de vagas que pedem, faixa CLT, perguntas comuns e fontes. Vale por 6 meses." },
        { Icon: Gauge, title: "O quanto você está pronto", body: "Marque cada habilidade como não sei, estudando ou domino. O % de prontidão pesa o que as vagas mais pedem." },
        { Icon: Target, title: "O que mais falta", body: "As lacunas em ordem de prioridade, com atalho para treinar a habilidade numa entrevista com nota." },
        { Icon: Layers, title: "Trilhas", body: "Pós (matérias), certificação (módulos), livro (capítulos), curso (aulas) e projeto (entregas), com importância, frequência na semana e prazo." },
        { Icon: FolderGit2, title: "Projetos de portfólio", body: "A IA sugere 3 projetos que praticam exatamente as suas lacunas, com entregas e semanas. Escolher um vira trilha." },
        { Icon: CalendarDays, title: "Cronograma dia a dia", body: "14 dias em blocos curtos dentro do seu tempo livre, com revisão espaçada, treinos com nota e folga para imprevistos." },
        { Icon: CheckSquare, title: "Conta na meta do Hábito", body: "Marcar os blocos do dia avança as trilhas e pode virar a meta diária da placa-mãe." },
        { Icon: MessageCircle, title: "Conversa com a IA", body: "Conte da sua pós, do livro ou da prova: ela monta a trilha, guarda combinados (\"sábado não estudo\") e refaz o cronograma." },
        { Icon: RefreshCw, title: "Replanejar sem culpa", body: "Atrasou? Replaneje a partir de hoje; o que já passou não muda. No domingo a central lembra de replanejar." },
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
