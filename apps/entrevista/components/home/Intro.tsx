"use client";

import Link from "next/link";
import { AppIntro } from "@sdp/ui";
import { Briefcase, Building2, Coffee, FileSearch, History, MessageSquareText, Mic, Shuffle, Sparkles, Target } from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

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
      features={[
        { Icon: Building2, title: "Vaga e empresa", body: "Escolha área, stack (Java, Node, Python, .NET, Go…), senioridade e uma de 3 empresas, cada uma com cultura, etapas e salário diferentes." },
        { Icon: Briefcase, title: "7 etapas de verdade", body: "Triagem com filtro automático, RH, teste técnico, entrevista técnica, gestor, proposta com negociação e admissão." },
        { Icon: Shuffle, title: "Imprevistos de processo real", body: "Recrutador que some, contraproposta, oferta de nível abaixo, gestor que prefere outro perfil. Cada corrida sorteia os seus." },
        { Icon: Mic, title: "Responda falando ou digitando", body: "O microfone transcreve em tempo real (Chrome e Edge), com cronômetro de 2 minutos como numa call." },
        { Icon: MessageSquareText, title: "Entrevistador que conversa", body: "A IA responde no papel de quem entrevista e aprofunda quando a resposta fica rasa, sem revelar a nota." },
        { Icon: Sparkles, title: "Feedback de cada resposta", body: "Nível (júnior, pleno, sênior), nota, pontos fortes, o que faltou, como alguém do nível responderia e dicas de como falar." },
        { Icon: Coffee, title: "Treino de Java pleno", body: "Blocos de perguntas (Java core, Spring Boot, APIs REST, SQL e JPA, microsserviços, testes, Docker…) para treinar só a parte técnica, com a mesma avaliação." },
        { Icon: FileSearch, title: "Feedback geral", body: "No fim do processo, o veredito com o que pesou em cada etapa e o que estudar antes da próxima entrevista." },
        { Icon: History, title: "Histórico", body: "Todas as entrevistas salvas no seu perfil, com filtros, nota e cada resposta para rever. Cada uma conta na meta do Hábito." },
      ]}
      steps={[
        { title: "Escolha a vaga", body: "Área, stack, senioridade e o tipo de empresa." },
        { title: "Converse com a IA", body: "Cada etapa tem um entrevistador. Responda por voz ou texto." },
        { title: "Veja o que faltou", body: "O feedback aparece na hora, e você pode tentar de novo." },
        { title: "Receba o veredito", body: "Contratado ou eliminado, com feedback geral salvo no histórico." },
      ]}
      video={{ src: "/demo/entrevista.mp4", poster: "/demo/entrevista.jpg", cues: DEMO_CUES }}
      cta={
        <Link href="/processo-seletivo" className="btn-neon px-4 py-2 text-xs">
          Começar um processo ▶
        </Link>
      }
    />
  );
}
