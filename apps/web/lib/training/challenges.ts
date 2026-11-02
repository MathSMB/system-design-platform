import type { Challenge, Choice } from "./types";

const q = (title: string, body: string, choices: Choice[], lesson: string) => ({ type: "choice" as const, title, body, choices, lesson });
const c = (text: string, why: string, correct = false): Choice => ({ text, why, correct });

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
    ask: [
      q("Primeira pergunta", "Entrevistador: \"Catálogo de uma loja na Black Friday.\" O que você pergunta primeiro?", [
        c("Qual a proporção de leitura e escrita, e qual é o pico em relação à média?", "Isso define cache, réplicas e quantas máquinas.", true),
        c("Vamos usar Kafka?", "Ferramenta antes do requisito: o entrevistador anota que você pulou a etapa."),
        c("Qual framework o time usa?", "Não muda a arquitetura de alto nível."),
      ], "Requisito não funcional vira número; o número decide o desenho."),
    ],
    followUps: [
      q("Preço velho", "O preço muda no meio da promoção e alguns clientes ainda veem o antigo. O que você responde?", [
        c("Apagar a chave no cache quando o preço muda, TTL curto como rede de segurança, e o checkout confere o preço no banco", "Isso: o cache serve a vitrine; a fonte da verdade decide a cobrança.", true),
        c("Desligar o cache durante a promoção", "O banco não aguenta a Black Friday sem cache."),
        c("Aumentar o TTL para o cache ficar mais estável", "Aumenta o tempo com preço velho."),
      ], "Cache-aside: grava no banco e apaga a chave; o valor que vale dinheiro vem da fonte da verdade."),
      q("Cache caiu", "E se o Redis cair no pico?", [
        c("Cache redundante (réplica/cluster) e limitar o que chega ao banco (rate limit ou circuit breaker)", "Isso: evita a avalanche e protege o banco se ela acontecer.", true),
        c("O banco assume, ele é rápido", "Ele foi dimensionado para os misses, não para 100% das leituras."),
        c("Aumentar o timeout dos usuários", "Mais requisições presas, fila maior."),
      ], "Avalanche de cache: o banco recebe de uma vez tudo o que o cache segurava."),
    ],
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
    ask: [
      q("O que mais pesa?", "Entrevistador: \"Placar ao vivo da Copa.\" Qual requisito você confirma porque ele muda o desenho?", [
        c("Leitura muito maior que escrita, e um pico gigante e sincronizado a cada gol", "Isso: é um problema de distribuição (fan-out), não de gravação.", true),
        c("Quantos jogadores tem cada time", "Não muda a arquitetura."),
        c("Se o placar precisa de transação ACID", "Um gol por vez não é o desafio."),
      ], "1 gol vira milhões de mensagens: o custo está em entregar, não em gravar."),
    ],
    followUps: [
      q("Sem refresh", "Os torcedores ficam dando refresh. Como entregar o gol sem polling?", [
        c("SSE ou WebSocket: o servidor empurra o evento; o recurso escasso passa a ser conexões abertas", "Isso. 10 milhões de conexões pedem centenas de servidores de push.", true),
        c("Polling a cada 100 ms", "Multiplica as requisições por 10."),
        c("E-mail a cada gol", "Lento e caro."),
      ], "Push troca requisições repetidas por conexões persistentes."),
      q("Reconexão em massa", "Um servidor de push cai e 100 mil clientes reconectam ao mesmo tempo. O que fazer?", [
        c("Reconexão com backoff e jitter, e Last-Event-ID para não perder o gol que saiu no meio", "Isso: espalha a reconexão e retoma do último evento.", true),
        c("Reconectar imediatamente", "Thundering herd: todos batem juntos nos servidores restantes."),
        c("Não fazer nada", "O torcedor perde o gol."),
      ], "Thundering herd se resolve espalhando no tempo (jitter)."),
    ],
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
    ask: [
      q("Consistência", "Entrevistador: \"Feed de rede social.\" Qual requisito de consistência você confirma?", [
        c("Quem publica precisa ver o próprio post na hora; os outros podem ver em alguns segundos", "Isso: read-your-writes, e consistência eventual para o resto.", true),
        c("Todo mundo precisa ver o post no mesmo instante", "Caro e desnecessário para um feed."),
        c("Nenhum: feed pode demorar horas", "O autor não vendo o próprio post é bug percebido."),
      ], "Pergunte qual consistência o produto precisa, em vez de assumir a mais forte."),
    ],
    followUps: [
      q("Celebridade", "Uma conta tem 50 milhões de seguidores. Fan-out na escrita (copiar o post para o feed de cada seguidor)?", [
        c("Híbrido: fan-out na escrita para a maioria; posts de celebridades são buscados na hora da leitura", "Isso: evita 50 milhões de escritas por post.", true),
        c("Sempre na escrita", "Um post vira 50 milhões de gravações."),
        c("Sempre na leitura", "Cada abertura de feed vira consulta a centenas de contas."),
      ], "É o trade-off clássico de feed (push x pull)."),
      q("Post sumido", "Com réplicas, o autor publica e o post não aparece ao recarregar. Correção?", [
        c("Ler do primário por alguns segundos depois de escrever", "Isso: read-your-writes.", true),
        c("Mais réplicas", "Não diminui o atraso."),
        c("Replicação síncrona em todas", "Deixa toda escrita lenta e frágil."),
      ], "A janela precisa cobrir o replication lag."),
    ],
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
    ask: [
      q("O provedor", "Entrevistador: \"Mandar o e-mail de confirmação de cada compra.\" O que você pergunta?", [
        c("Qual a vazão e a latência do provedor, e se o e-mail pode chegar alguns segundos depois", "Isso: decide se a chamada pode sair do caminho do checkout.", true),
        c("Qual o layout do e-mail", "Não muda a arquitetura."),
        c("Se dá para usar SMTP próprio", "Detalhe de implementação; a pergunta é de tempo e capacidade."),
      ], "Se o usuário não precisa esperar, a chamada lenta vai para uma fila."),
    ],
    followUps: [
      q("E-mail em dobro", "A fila entrega a mesma mensagem duas vezes. O que acontece?", [
        c("O cliente recebe dois e-mails, a menos que o consumidor seja idempotente (registra o id da mensagem)", "Isso: at-least-once exige idempotência.", true),
        c("Nada: filas entregam exatamente uma vez", "Na prática, entregam pelo menos uma vez."),
        c("O provedor de e-mail detecta", "Ele não sabe que é o mesmo pedido."),
      ], "Consumidor idempotente: chave única do pedido ou da mensagem."),
      q("Provedor fora", "O provedor fica fora por 1 hora. E os e-mails?", [
        c("Ficam na fila, com retry e backoff; os que falham sempre vão para uma DLQ; monitorar o tamanho da fila", "Isso: o checkout segue funcionando e nada se perde.", true),
        c("O checkout para até ele voltar", "É exatamente o que a fila evita."),
        c("Descartar os e-mails", "O cliente fica sem confirmação."),
      ], "A fila absorve a indisponibilidade; o alarme é o tamanho dela."),
    ],
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
    ask: [
      q("Inegociável", "Entrevistador: \"Venda de ingressos de um show.\" Qual requisito é inegociável?", [
        c("Nunca vender o mesmo assento para duas pessoas", "Isso: é a regra que guia o desenho da compra.", true),
        c("Mostrar o mapa em menos de 50 ms", "Importante, mas negociável."),
        c("Aceitar todos os cartões", "Requisito de negócio, não de arquitetura."),
      ], "Identifique a invariante antes de desenhar."),
    ],
    followUps: [
      q("Mesmo assento", "Dois fãs clicam no mesmo assento ao mesmo tempo. Como você garante?", [
        c("Reserva com SET NX PX no Redis e, na compra, UPDATE condicional (WHERE status = 'disponível') no banco", "Isso: atômico na reserva e garantia final no banco.", true),
        c("GET no Redis e, se estiver livre, SET", "Dois comandos: os dois veem livre."),
        c("Transação ACID resolve sozinha", "Em Read Committed, sem condição no UPDATE, ainda há lost update."),
      ], "Conferir e gravar no mesmo comando."),
      q("10 milhões", "10 milhões de pessoas para 50 mil ingressos. O que fazer na abertura?", [
        c("Fila de espera virtual: admite em lotes, com posição aleatória", "Isso: um gargalo proposital que protege o sistema e é justo.", true),
        c("Escalar para 10 milhões de usuários simultâneos", "Caro, e a maioria vai sair sem ingresso de qualquer jeito."),
        c("Quem chegar primeiro leva", "Favorece bots e quem está mais perto do servidor."),
      ], "Queue-it e Cloudflare Waiting Room fazem isso."),
    ],
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
    ask: [
      q("Repetição", "Entrevistador: \"API de pagamentos para lojistas.\" O que você pergunta sobre falhas?", [
        c("O lojista pode repetir a mesma requisição depois de um timeout? Então precisamos de chave de idempotência", "Isso: em pagamento, repetir sem cuidado é cobrar duas vezes.", true),
        c("Qual banco de dados usar", "Vem depois dos requisitos."),
        c("Se pode cair de vez em quando", "Pergunta vaga; o ponto é o que acontece com a repetição."),
      ], "Idempotência é requisito de API de pagamento."),
    ],
    followUps: [
      q("Cobrança dupla", "O lojista manda o mesmo pagamento duas vezes por timeout. Como não cobrar duas vezes?", [
        c("Idempotency-Key com UNIQUE, gravada na mesma transação do pagamento; a repetição devolve a resposta original", "Isso: é como a Stripe faz.", true),
        c("Conferir se já existe um pagamento igual antes de inserir", "Conferir e inserir são dois passos: corrida."),
        c("Pedir para o lojista não repetir", "Timeout acontece; ele vai repetir."),
      ], "A chave única transforma repetição em leitura."),
      q("Dinheiro", "Por que não guardar o valor em float?", [
        c("Float não representa 0,1 exatamente; use inteiro em centavos ou decimal", "Isso: 0,1 + 0,2 ≠ 0,3 em float.", true),
        c("Float ocupa muito espaço", "O problema é precisão, não espaço."),
        c("Não tem problema", "Tem: os centavos somem nos arredondamentos."),
      ], "Dinheiro é inteiro na menor unidade ou decimal com escala fixa."),
    ],
  },
  {
    id: "encurtador-de-url",
    title: "Encurtador de URL",
    brief: "Projete um encurtador de URL, como o bit.ly: recebe uma URL longa e devolve um código curto que redireciona.",
    requirements: [
      "Criar o link curto e redirecionar (10% escrita, 90% leitura)",
      "10 milhões de usuários ativos no dia, 100 requisições cada",
      "Pico de 1,2× a média (tráfego global, bem distribuído)",
      "p99 abaixo de 200 ms e menos de 1% de erros",
    ],
    load: { dailyActiveUsers: 10_000_000, requestsPerUserPerDay: 100, peakFactor: 1.2, writeRatio: 0.1 },
    slo: { p99Ms: 200, errorRate: 0.01 },
    ask: [
      q("O que muda o desenho", "Entrevistador: \"Projete um encurtador de URL.\" O que você pergunta?", [
        c("Quantas URLs novas por dia, e quantos acessos para cada URL criada", "Isso: dá escritas/s, leituras/s e armazenamento.", true),
        c("Se o código pode ter emoji", "Detalhe; a pergunta de escala vem antes."),
        c("Se pode usar MongoDB", "Banco vem depois das contas."),
      ], "No vídeo do Renato: 100 milhões de URLs por dia e 10 leituras por escrita."),
    ],
    followUps: [
      q("Tamanho do código", "Em base62, quantos caracteres para 365 bilhões de URLs (10 anos)?", [
        c("7", "62⁷ ≈ 3,5 trilhões: cabe com folga.", true),
        c("6", "62⁶ ≈ 56,8 bilhões: não cabe."),
        c("10", "Cabe, mas não é curto."),
      ], "Faça a conta na frente do entrevistador."),
      q("Sem colisão", "Como gerar o código sem colisão, com vários servidores?", [
        c("Cada servidor pega uma faixa de IDs (ou Snowflake) e converte para base62", "Isso: único e sem consultar ninguém a cada link.", true),
        c("INCR no Redis com Sentinel", "Com replicação assíncrona, o failover pode repetir IDs."),
        c("Hash MD5 da URL, primeiros 7 caracteres", "Colide; precisa tratar a colisão com insert condicional."),
      ], "Faixas de IDs, Snowflake, ou aleatório com INSERT condicional."),
    ],
  },
  {
    id: "streaming-de-video",
    title: "Streaming de vídeo (YouTube)",
    brief: "Milhões de pessoas dando play ao mesmo tempo. Cada vídeo é servido em pedaços de poucos segundos, e cada pedaço é uma requisição.",
    requirements: [
      "Assistir vídeos (leitura pura: os pedaços já estão prontos)",
      "5 milhões de usuários ativos no dia, 100 pedaços cada",
      "Pico de 3× a média à noite",
      "p99 abaixo de 150 ms e menos de 0,5% de erros",
    ],
    load: { dailyActiveUsers: 5_000_000, requestsPerUserPerDay: 100, peakFactor: 3, writeRatio: 0 },
    slo: { p99Ms: 150, errorRate: 0.005 },
    ask: [
      q("Escalas diferentes", "Entrevistador: \"Projete o YouTube.\" O que você esclarece primeiro?", [
        c("Upload e visualização têm escalas muito diferentes: quantas visualizações por upload, e vamos focar em qual?", "Isso: são dois sistemas, e o entrevistador quer que você escolha o escopo.", true),
        c("Qual codec usar", "Detalhe que vem depois."),
        c("Se os comentários são em tempo real", "Fora do núcleo do problema."),
      ], "Delimite o escopo: em 45 minutos não dá para desenhar tudo."),
    ],
    followUps: [
      q("Upload grande", "Um usuário sobe um vídeo de 4 GB. O arquivo passa pelo servidor da API?", [
        c("Não: URL pré-assinada, e o upload vai direto para o object storage em partes (multipart)", "Isso: a API não prende workers com binário.", true),
        c("Sim, com timeout maior", "Prende workers por minutos e gera 413/504."),
        c("Sim, mas comprimindo antes", "O vídeo já é comprimido."),
      ], "Com o limite de 10.000 partes do S3, 256 GB exigem partes de ~26 MB ou mais."),
      q("Por que pedaços?", "Por que o vídeo é quebrado em pedaços de alguns segundos (HLS/DASH)?", [
        c("A CDN cacheia pedaços, o play começa rápido e a qualidade muda conforme a rede (bitrate adaptativo)", "Isso.", true),
        c("Para economizar disco", "Ocupa até mais (várias qualidades)."),
        c("Por causa do banco de dados", "Os pedaços ficam no object storage, não no banco."),
      ], "Streaming adaptativo + CDN é o que segura a escala de leitura."),
    ],
  },
  {
    id: "drive-sincronizacao",
    title: "Sincronização do Drive",
    brief: "Os arquivos de cada usuário sincronizam entre computador e celular. Cada cliente pergunta \"mudou alguma coisa?\" de tempos em tempos.",
    requirements: [
      "Listar mudanças e baixar metadados (5% escrita: arquivo novo ou alterado)",
      "2 milhões de usuários ativos no dia, 100 consultas cada",
      "Pico de 3× a média no horário comercial",
      "p99 abaixo de 250 ms e menos de 1% de erros",
    ],
    load: { dailyActiveUsers: 2_000_000, requestsPerUserPerDay: 100, peakFactor: 3, writeRatio: 0.05 },
    slo: { p99Ms: 250, errorRate: 0.01 },
    ask: [
      q("Volume de escrita", "Entrevistador: \"Projete a sincronização do Google Drive.\" O que você pergunta?", [
        c("Quantos arquivos mudam por usuário por dia e o tamanho médio, e com que frequência o cliente consulta", "Isso: separa o tráfego de metadados do de arquivos.", true),
        c("Se usamos Cassandra", "No vídeo do Renato, ~35 escritas/s não justificam Cassandra: escolha pelos números."),
        c("Qual a cor da interface", "Fora do escopo."),
      ], "Metadados (banco) e conteúdo (object storage) escalam de formas diferentes."),
    ],
    followUps: [
      q("Mudanças perdidas", "O cliente pede \"mudanças desde 10:00:00\". O que pode dar errado?", [
        c("Uma transação com horário anterior pode confirmar depois da consulta e ser pulada para sempre", "Isso: use um log de mudanças na ordem de commit (cursor), não o relógio.", true),
        c("Nada, o relógio do servidor é confiável", "O problema não é o relógio: é a ordem de commit."),
        c("Só fica lento", "Pior: perde mudanças em silêncio."),
      ], "Cursor por timestamp e sequence atribuída antes do commit têm o mesmo problema."),
      q("Arquivo grande", "Um arquivo de 2 GB muda 1 byte. Reenvia tudo?", [
        c("Não: divide em blocos com hash e envia só os que mudaram; blocos iguais são deduplicados", "Isso: é como Dropbox e Drive economizam banda.", true),
        c("Sim, é mais simples", "2 GB por byte alterado."),
        c("Comprime e reenvia", "Ainda reenvia tudo."),
      ], "Chunking + hash de conteúdo."),
    ],
  },
];

export function randomChallenge(exceptId?: string) {
  const pool = CHALLENGES.filter((c) => c.id !== exceptId);
  return pool[Math.floor(Math.random() * pool.length)]!;
}
