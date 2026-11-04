"use client";

import { AppIntro } from "@sdp/ui";
import { BookOpen, Bot, Boxes, Bug, FlaskConical, Gauge, Keyboard, LibraryBig, Lock, Swords, Trophy } from "lucide-react";
import { DEMO_CUES } from "../demo-cues";

export function SdIntro() {
  return (
    <AppIntro
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
      features={[
        { Icon: Boxes, title: "Canvas com 8 componentes", body: "Usuários, load balancer, servidor, cache, CDN, banco com réplicas, fila e serviço externo. Cada um com workers, tempo, fila, hit rate e retries ajustáveis." },
        { Icon: Gauge, title: "Simulação de carga", body: "Aplica o DAU e o pico do enunciado e mostra req/s, p99, erros, o gargalo e a utilização de cada componente. Dá para derrubar um nó e ver a cascata." },
        { Icon: BookOpen, title: "Modo Estudo com mentor", body: "Aulas guiadas: o mentor conta a história, pede um clique de cada vez e explica o resultado, com perguntas que já vêm explicadas." },
        { Icon: Swords, title: "Modo Entrevista técnica", body: "9 problemas (Black Friday, placar da Copa, feed, ingressos, pagamentos, encurtador, streaming, Drive…), sem dica, com relógio e nota em 5 estrelas." },
        { Icon: Lock, title: "Laboratório de concorrência", body: "11 aulas: lost update, lock pessimista e otimista, write skew, deadlock, cache velho, mensagem duplicada, Pix duplo e o caso Therac-25." },
        { Icon: Bug, title: "Entrevista de bugs de produção", body: "8 relatos reais: você diagnostica, escolhe a correção e prova no laboratório testando todas as ordens possíveis." },
        { Icon: Bot, title: "Avaliação pela IA", body: "Dois entrevistadores avaliam o desenho e as suas explicações, com nota, pontos fortes, o que faltou e as perguntas que viriam a seguir." },
        { Icon: LibraryBig, title: "Glossário e bibliografia", body: "Cada termo tem um \"?\" que abre a explicação em linguagem simples, com livros e artigos para aprofundar." },
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
