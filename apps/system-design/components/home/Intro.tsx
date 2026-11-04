"use client";

import { AppIntro } from "@sdp/ui";
import { Bot, FlaskConical, Gauge, Keyboard, LibraryBig, Trophy } from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

export function SdIntro() {
  return (
    <AppIntro
      app="system-design"
      start={{ label: "Começar a treinar", href: "/#comecar" }}
      openWithoutAccount
      id="system-design"
      tone="accent"
      name="o System Design"
      headline={
        <>
          Aprenda system design <span className="text-accent glow">quebrando sistemas</span>, não decorando diagramas.
        </>
      }
      lead="Em entrevista, não basta saber que existe cache ou fila: você precisa explicar por que o sistema cai e como a sua escolha resolve. Aqui você monta a arquitetura, coloca carga de verdade e vê o número mudar."
      points={[
        { Icon: Gauge, title: "Simulação de verdade", body: "Cada componente é uma fila com workers e tempo de serviço. Você vê req/s, latência p99, erros e onde a fila estourou." },
        { Icon: FlaskConical, title: "Concorrência que dá para ver", body: "Duas transações passo a passo, com locks e intercalações. O ingresso vendido duas vezes acontece na sua frente." },
        { Icon: Trophy, title: "No ritmo da entrevista", body: "Requisitos, estimativa, desenho e aprofundamento. A IA avalia como dois entrevistadores e dá nota em estrelas." },
      ]}
      showcase={[
        {
          img: "/demo/prints/simulacao.jpg",
          alt: "Canvas com o cache derrubado e o banco pegando fogo",
          tag: "Simulação de carga",
          title: "Coloque carga de verdade e veja onde quebra",
          problem: "Em entrevista você fala \"coloco um cache\" e o entrevistador pergunta: e se o cache cair? Sem nunca ter visto isso acontecer, a resposta fica decorada.",
          body: "Você monta a arquitetura no canvas e aplica a carga do enunciado. Cada componente é uma fila com workers e tempo de serviço, então o número que aparece é consequência do desenho, não um chute.",
          bullets: ["Req/s, erros, p50 e p99 a cada segundo, na linha do tempo", "\"Onde quebrou\" explica o gargalo em português (ex. avalanche de cache)", "Derrube um componente no meio da simulação e veja o efeito em cascata"],
        },
        {
          img: "/demo/prints/cache.jpg",
          alt: "O mesmo desenho com cache saudável: zero erros e p99 de 104 ms",
          tag: "Comparar soluções",
          title: "Mude uma peça e compare os números",
          problem: "Saber que réplica, fila ou cache \"ajudam\" não basta: a pergunta é quanto ajudam e qual é o custo.",
          body: "Ajuste workers, hit rate, réplicas ou coloque uma fila e simule de novo. A diferença aparece em números que você pode citar na entrevista.",
          bullets: ["8 componentes: usuários, LB, servidor, cache, CDN, banco com réplicas, fila e serviço externo", "Trilha pronta de 5 desenhos para comparar, do servidor único à escrita assíncrona", "Salve os seus desenhos e volte depois"],
        },
        {
          img: "/demo/prints/aula.jpg",
          alt: "Aula guiada com o mentor contando a história e a primeira pergunta",
          tag: "Modo Estudo",
          title: "Aulas com um mentor que pede um clique de cada vez",
          problem: "Livro de system design ensina o diagrama pronto. Você lê, concorda e esquece, porque nunca precisou decidir nada.",
          body: "Cada aula começa com uma história (o app de receitas que viralizou), faz uma pergunta antes de cada decisão e só libera o próximo passo depois que você testa no canvas.",
          bullets: ["12 aulas, de 0 a 1 milhão de usuários até retry storm e hash de senha", "Perguntas já vêm explicadas: você entende o porquê da resposta certa", "Vídeo e leituras recomendadas em cada aula"],
        },
        {
          img: "/demo/prints/desafio.jpg",
          alt: "Entrevista técnica: Catálogo da Black Friday com o relógio rodando",
          tag: "Modo Entrevista técnica",
          title: "Treine como no dia: sem dica e com relógio",
          problem: "Na entrevista de verdade ninguém te dá a próxima pista. Treinar sempre com ajuda dá uma falsa segurança.",
          body: "Você recebe o enunciado, faz as perguntas de requisito, estima o pico, desenha até cumprir o SLO e responde o aprofundamento. No fim, nota em 5 estrelas e o gabarito comentado.",
          bullets: ["9 problemas: Black Friday, placar da Copa, feed, ingressos, pagamentos, encurtador, streaming, Drive…", "Estimativa certa é dentro de 20% do pico real", "O desenho só vale se você simulou a carga do enunciado"],
        },
        {
          img: "/demo/prints/concorrencia.jpg",
          alt: "Laboratório de concorrência: duas compras do último ingresso, lado a lado",
          tag: "Concorrência e dados",
          title: "O bug de concorrência acontecendo na sua frente",
          problem: "\"Race condition\" é fácil de definir e difícil de enxergar. Sem ver a intercalação, lock pessimista e otimista viram só nomes.",
          body: "Duas transações aparecem lado a lado e você avança cada uma passo a passo. Com \"Testar todas as ordens possíveis\", o laboratório prova que existe uma ordem que quebra a regra.",
          bullets: ["11 aulas: lost update, locks, write skew, deadlock, cache velho, Pix duplo, Therac-25…", "Linha do tempo com cada SELECT e UPDATE e o estado do banco", "Parte 2 de cada aula: aplique a correção e prove que funciona"],
        },
        {
          img: "/demo/prints/bug.jpg",
          alt: "Entrevista de bug de produção: o relato dos ingressos vendidos a mais",
          tag: "Bugs de produção",
          title: "Diagnostique um incidente real",
          problem: "Entrevista de pleno e sênior costuma ter \"aconteceu isso em produção, o que você faz?\". É raro treinar isso antes.",
          body: "Você lê o relato, escolhe o diagnóstico e a correção e prova no laboratório. Cada alternativa errada vem com o motivo.",
          bullets: ["8 incidentes: ingressos a mais, plantão vazio, deadlock, cashback em dobro, Pix duplo…", "3 estrelas, uma por pergunta certa, com gabarito comentado", "Link direto para a aula que explica o conceito"],
        },
      ]}
      features={[
        { Icon: Bot, title: "Avaliação pela IA", body: "Dois entrevistadores avaliam o desenho e as suas explicações, com nota, pontos fortes e o que faltou." },
        { Icon: LibraryBig, title: "Glossário e bibliografia", body: 'Cada termo tem um "?" com explicação simples, e há livros e artigos para aprofundar.' },
        { Icon: Keyboard, title: "Feito para mexer rápido", body: "Desfazer, copiar e colar com conexões, duplicar, seleção em retângulo e Ctrl+Enter para simular." },
      ]}
      steps={[
        { title: "Escolha o modo", body: "Estudo tem mentor e dicas. Entrevista técnica é sem ajuda, como no dia." },
        { title: "Desenhe no canvas", body: "Arraste usuários, load balancer, servidores, cache, filas e banco, e conecte." },
        { title: "Simule e veja quebrar", body: "Aplique a carga do enunciado ou derrube um componente e veja o efeito em cascata." },
        { title: "Corrija e explique", body: "Ajuste até cumprir o SLO e receba o feedback com o que dizer na entrevista." },
      ]}
      video={{ src: "/demo/system-design.mp4", poster: "/demo/system-design.jpg", cues: DEMO_CUES }}
    />
  );
}
