import type { TourStep } from "./Tour";

/** Tour do canvas livre. Os alvos são os atributos data-tour da tela. */
export const CANVAS_TOUR: TourStep[] = [
  {
    target: "palette",
    title: "Componentes",
    body: "Aqui ficam as peças do sistema: usuários, load balancer, servidor, cache, CDN, banco, fila e serviço externo. Arraste para o canvas ou clique para adicionar.",
  },
  {
    target: "board",
    title: "O canvas",
    body: "Monte a arquitetura aqui. Para conectar, arraste da bolinha da direita de um componente até outro. As setinhas mostram para onde vão as requisições. Para apagar, selecione e aperte Delete.",
  },
  {
    target: "inspector",
    title: "Configure e derrube",
    body: "Clique num componente para mudar os números dele (usuários por dia, workers, hit rate do cache…). Também dá para programar a queda dele num segundo da simulação.",
  },
  {
    target: "simulate",
    title: "Simule",
    body: "Escolha a duração e aperte Simular. O motor roda as requisições uma a uma: aparece fogo no gargalo, setinhas vermelhas onde a requisição é barrada e o selo OFFLINE em quem caiu.",
  },
  {
    target: "tabs",
    title: "Resultado e avaliação",
    body: "Em Simulação você vê req/s, erros, latência p50 e p99 e um diagnóstico de onde quebrou. Em Avaliação, escreva sua explicação e peça a nota de uma banca de IA.",
  },
  {
    target: "trilha",
    title: "Trilha pronta",
    body: "Cenários prontos, do servidor único às réplicas de leitura e filas. Bom para explorar e para comparar com o seu desenho.",
  },
  {
    target: "designs",
    title: "Seus desenhos",
    body: "Salve o que montou para continuar depois.",
  },
  {
    target: "nav-treinos",
    title: "Hora de treinar",
    body: "Em Treinos, um mentor conduz cases passo a passo e ensina. Em Desafio, você recebe um problema sorteado, sem dica, como numa entrevista.",
  },
];
