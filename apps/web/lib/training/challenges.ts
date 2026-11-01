import type { Challenge } from "./types";

/** Desafios do modo sorteado: só o enunciado, sem dica. A carga já vem no nó Usuários. */
export const CHALLENGES: Challenge[] = [
  {
    id: "black-friday-catalogo",
    title: "Catálogo da Black Friday",
    brief: "Uma loja online vai receber o maior pico do ano. A página de produto não pode cair nem ficar lenta.",
    requirements: [
      "Listar produtos e ver detalhes (95% leitura, 5% escrita: carrinho e avaliações)",
      "2 milhões de usuários ativos no dia, 30 requisições cada",
      "Pico de 8× a média durante as ofertas",
      "p99 abaixo de 300 ms e menos de 1% de erros",
    ],
    load: { dailyActiveUsers: 2_000_000, requestsPerUserPerDay: 30, peakFactor: 8, writeRatio: 0.05 },
    slo: { p99Ms: 300, errorRate: 0.01 },
  },
  {
    id: "placar-copa",
    title: "Placar ao vivo da Copa",
    brief: "Durante o jogo, milhões de torcedores atualizam o placar o tempo todo. Gol é raro; leitura é constante.",
    requirements: [
      "Consultar placar e lances do jogo (99% leitura)",
      "4 milhões de usuários ativos no dia, 30 requisições cada",
      "Pico de 6× a média durante as partidas",
      "p99 abaixo de 200 ms e menos de 0,5% de erros",
    ],
    load: { dailyActiveUsers: 4_000_000, requestsPerUserPerDay: 30, peakFactor: 6, writeRatio: 0.01 },
    slo: { p99Ms: 200, errorRate: 0.005 },
  },
  {
    id: "feed-rede-social",
    title: "Feed de rede social",
    brief: "Os usuários abrem o feed várias vezes por dia e publicam de vez em quando. Quem publica precisa ver o próprio post.",
    requirements: [
      "Ler o feed e publicar posts (10% escrita)",
      "3 milhões de usuários ativos no dia, 40 requisições cada",
      "Pico de 5× a média à noite",
      "p99 abaixo de 250 ms e menos de 1% de erros",
    ],
    load: { dailyActiveUsers: 3_000_000, requestsPerUserPerDay: 40, peakFactor: 5, writeRatio: 0.1 },
    slo: { p99Ms: 250, errorRate: 0.01 },
  },
  {
    id: "confirmacao-pedido",
    title: "E-mail de confirmação de pedido",
    brief: "Toda compra dispara um e-mail por um provedor externo lento (300 ms por e-mail e no máximo 50 conexões). O checkout não pode esperar por ele.",
    requirements: [
      "Finalizar a compra e enviar o e-mail de confirmação",
      "50 mil usuários ativos no dia, 10 requisições cada",
      "Pico de 10× a média",
      "Use o Provedor de e-mail que já está no canvas (não dá para mudar os parâmetros dele)",
      "p99 abaixo de 150 ms e menos de 1% de erros",
    ],
    load: { dailyActiveUsers: 50_000, requestsPerUserPerDay: 10, peakFactor: 10, writeRatio: 0.5 },
    slo: { p99Ms: 150, errorRate: 0.01 },
    mustHave: [{ kind: "external", label: "Provedor de e-mail", params: { workers: 50, serviceTimeMs: 300, queueCapacity: 500, errorRate: 0.01 } }],
  },
  {
    id: "ingressos-show",
    title: "Venda de ingressos de um show",
    brief: "Os ingressos abrem às 10h e todo mundo entra ao mesmo tempo para ver os lugares disponíveis.",
    requirements: [
      "Ver mapa de assentos e reservar (20% escrita)",
      "1 milhão de usuários ativos no dia, 50 requisições cada",
      "Pico de 10× a média na abertura",
      "p99 abaixo de 400 ms e menos de 2% de erros",
    ],
    load: { dailyActiveUsers: 1_000_000, requestsPerUserPerDay: 50, peakFactor: 10, writeRatio: 0.2 },
    slo: { p99Ms: 400, errorRate: 0.02 },
  },
  {
    id: "api-pagamentos",
    title: "API de pagamentos",
    brief: "Uma fintech processa pagamentos de lojistas. Cada pagamento grava no banco; não dá para perder nenhum.",
    requirements: [
      "Criar pagamento e consultar status (40% escrita)",
      "800 mil usuários ativos no dia, 25 requisições cada",
      "Pico de 6× a média no horário comercial",
      "p99 abaixo de 300 ms e menos de 0,5% de erros",
    ],
    load: { dailyActiveUsers: 800_000, requestsPerUserPerDay: 25, peakFactor: 6, writeRatio: 0.4 },
    slo: { p99Ms: 300, errorRate: 0.005 },
  },
];

export function randomChallenge(exceptId?: string) {
  const pool = CHALLENGES.filter((c) => c.id !== exceptId);
  return pool[Math.floor(Math.random() * pool.length)]!;
}
