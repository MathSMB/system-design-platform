"use client";

import { AppIntro } from "@sdp/ui";
import { Briefcase, Building2, History, MessageSquareText, Target, Zap } from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

export function EntrevistaIntro() {
  return (
    <AppIntro
      app="entrevista"
      start={{ label: "Começar a treinar", href: "/#comecar" }}
      openWithoutAccount
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
      showcase={[
        {
          img: "/demo/prints/empresa.jpg",
          alt: "Escolha da empresa: Tucano Bank, Órbita Consultoria e Serra Sistemas",
          tag: "Vaga e empresa",
          title: "Escolha a vaga que você quer de verdade",
          problem: "Lista de perguntas genérica não prepara para a vaga que você quer: um banco digital pergunta diferente de uma consultoria.",
          body: "Você escolhe área, stack, senioridade e uma de 3 empresas. Cada uma tem cultura, etapas, faixa salarial e estilo de entrevista diferentes, inspirados em relatos reais de candidatos.",
          bullets: ["Back-end, front-end, full stack, mobile, DevOps, dados e QA", "Java, Node, Python, .NET, Go e mais", "Salário e formato (CLT ou PJ) de cada empresa"],
        },
        {
          img: "/demo/prints/triagem.jpg",
          alt: "Triagem com o anúncio da vaga e o formulário de candidatura",
          tag: "Triagem",
          title: "Começa onde o processo começa: no formulário",
          problem: "Muita gente é eliminada antes de falar com alguém, por pretensão fora da faixa ou por não deixar claro o que já usou.",
          body: "A triagem mostra o anúncio completo e pede o que um formulário real pede. O filtro automático diz por que você passou ou foi eliminado.",
          bullets: ["Requisitos, diferenciais e benefícios da vaga", "Pretensão salarial comparada com a faixa da empresa", "O que pesou na decisão, item por item"],
        },
        {
          img: "/demo/prints/conversa.jpg",
          alt: "Conversa com a recrutadora: pergunta, resposta e réplica",
          tag: "Conversa com a IA",
          title: "Um entrevistador que responde, não um quiz",
          problem: "Treinar sozinho com uma lista de perguntas não reproduz o nervosismo de alguém reagindo ao que você disse.",
          body: "Cada etapa tem um entrevistador com nome e papel. Você responde falando ou digitando, e a IA reage no papel: comenta, aprofunda quando a resposta fica rasa e segue para a próxima.",
          bullets: ["Microfone com transcrição em tempo real e cronômetro de 2 minutos", "7 etapas: triagem, RH, teste, técnica, gestor, proposta e admissão", "Imprevistos sorteados: recrutador que some, contraproposta, vaga de outro nível"],
        },
        {
          img: "/demo/prints/feedback.jpg",
          alt: "Feedback de uma resposta: nível pleno, 7/10, pontos fortes e fracos",
          tag: "Feedback de cada resposta",
          title: "Saiba exatamente o que faltou para soar pleno",
          problem: "Depois de uma entrevista, ninguém te diz o que faltou. Você só recebe um \"seguimos com outro candidato\".",
          body: "Cada resposta recebe o nível que demonstrou (júnior, pleno ou sênior), uma nota, o que você acertou, o que faltou e como alguém do nível da vaga falaria a mesma coisa.",
          bullets: ["Resposta de referência em primeira pessoa, para comparar com a sua", "Dicas de como falar: por onde começar, ordem, o que evitar", "Feedback geral no fim do processo, com o que estudar antes da próxima"],
        },
        {
          img: "/demo/prints/java.jpg",
          alt: "Treino de Java pleno: 7 blocos de perguntas",
          tag: "Treino por stack",
          title: "Treine só a parte técnica, bloco por bloco",
          problem: "Às vezes você não quer um processo inteiro, só reforçar Spring ou JPA antes de uma entrevista marcada.",
          body: "O treino avulso tem blocos com as perguntas que as vagas mais cobram, com a mesma conversa e a mesma avaliação do processo seletivo.",
          bullets: ["Java core, Spring Boot, APIs REST, SQL e JPA, microsserviços, testes e Docker", "Quantas vagas pedem cada bloco", "Entrevista completa com 8 perguntas sorteadas"],
        },
      ]}
      features={[
        { Icon: History, title: "Histórico", body: "Todas as entrevistas salvas no seu perfil, com nota e cada resposta para rever." },
        { Icon: Zap, title: "Conta na meta do Hábito", body: "Cada resposta avaliada e cada etapa concluída marcam a meta do dia sozinhas." },
        { Icon: Building2, title: "Relatório final", body: "Contratado ou eliminado, com a nota de cada etapa e o motivo da decisão." },
      ]}
      steps={[
        { title: "Escolha a vaga", body: "Área, stack, senioridade e o tipo de empresa." },
        { title: "Converse com a IA", body: "Cada etapa tem um entrevistador. Responda por voz ou texto." },
        { title: "Veja o que faltou", body: "O feedback aparece na hora, e você pode tentar de novo." },
        { title: "Receba o veredito", body: "Contratado ou eliminado, com feedback geral salvo no histórico." },
      ]}
      video={{ src: "/demo/entrevista.mp4", poster: "/demo/entrevista.jpg", cues: DEMO_CUES }}
    />
  );
}
