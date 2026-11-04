import { all, linked, ofKind, SIMULATE } from "./checks";
import { build, edge, metric, metricBefore, nodeById, param, users, yt } from "./graph";
import type { GuidedCase } from "./types";

const ms = (x: number) => `${Math.round(x).toLocaleString("pt-BR")} ms`;
const hot = (s?: string) => s === "bad" || s === "down";

/** Aula: algoritmos de load balancer com servidores desiguais. */
export const LB_CASE: GuidedCase = {
  id: "balanceamento-desigual",
  title: "Load balancer: round robin ou least connections?",
  summary: "Um servidor mais lento atrás do LB pega fogo enquanto os outros estão folgados. Ache o motivo e troque o algoritmo.",
  level: "básico",
  video: { id: "hhy6EDDjy-o", title: "Load Balancing a fundo" },
  story:
    "Uma startup de delivery roda a API em 3 servidores atrás de um load balancer. Na semana passada, um deles foi trocado por uma máquina antiga emprestada de outro time, 3 vezes mais lenta. Desde então, parte dos pedidos demora muito e alguns falham, mas o painel mostra os outros dois servidores quase ociosos.",
  start: build(
    [
      users({ dailyActiveUsers: 1_000_000, requestsPerUserPerDay: 20, peakFactor: 8 }),
      { id: "lb", kind: "loadBalancer", label: "Load balancer", params: { algorithm: "roundRobin" } },
      { id: "s1", kind: "server", label: "Servidor 1" },
      { id: "s2", kind: "server", label: "Servidor 2" },
      { id: "old", kind: "server", label: "Servidor antigo", params: { serviceTimeMs: 60 } },
      { id: "db", kind: "database", label: "Postgres" },
    ],
    [
      ["users", "lb"],
      ["lb", "s1"],
      ["lb", "s2"],
      ["lb", "old"],
      ["s1", "db"],
      ["s2", "db"],
      ["old", "db"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "Ache o servidor em chamas",
      body: "O desenho já está montado como em produção. Rode a simulação e olhe cada servidor.",
      tasks: ["▶ Simular", "Compare a ocupação dos três servidores"],
      check: (b) => all([!!b.result, SIMULATE], [hot(metric(b, "old")?.status), "O Servidor antigo deveria estar sobrecarregado. Confira se o LB está em Round robin."]),
      lesson:
        "Os dois servidores novos trabalham por volta de 40%, e o antigo passou de 100%. O LB está em round robin: entrega uma requisição para cada servidor, em rodízio, sem olhar se ele está dando conta.",
    },
    {
      type: "choice",
      title: "Por que só o antigo?",
      body: "Se o round robin divide igualmente, por que só um servidor pegou fogo?",
      choices: [
        { text: "Ele recebe mais requisições que os outros", why: "Não: no round robin cada servidor recebe 1/3 das requisições." },
        { text: "Recebe a mesma quantidade, mas cada uma leva 3× mais tempo", correct: true, why: "Isso. Mesma chegada, um terço da capacidade." },
        { text: "O banco responde mais devagar só para ele", why: "O banco é o mesmo para os três e está folgado." },
      ],
      lesson:
        "Capacidade = workers ÷ tempo de serviço. Os novos: 32 ÷ 0,02 s = 1.600 req/s. O antigo: 32 ÷ 0,06 s ≈ 533 req/s. No pico chegam ~1.850 req/s; o round robin manda ~620 para cada um, e o antigo passa do limite.",
    },
    {
      type: "number",
      title: "Falta máquina?",
      body: "Somando os três servidores, quantas requisições por segundo o sistema aguenta?",
      answer: 1600 + 1600 + 533,
      tolerance: 0.05,
      unit: "req/s",
      lesson: "≈ 3.733 req/s para um pico de ~1.850. Sobra capacidade. O problema é como o tráfego é dividido, não a quantidade de máquinas.",
    },
    {
      type: "build",
      title: "Troque o algoritmo",
      body: "Clique no Load balancer e escolha \"Menos requisições em andamento\" (least outstanding requests, primo do least connections).",
      tasks: ["Algoritmo do LB = Menos requisições em andamento", "▶ Simular com erros abaixo de 1%"],
      check: (b) =>
        all(
          [nodeById(b, "lb")?.data.params.algorithm === "leastOutstanding", "Mude o algoritmo do Load balancer para \"Menos requisições em andamento\"."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.01, "Ainda há mais de 1% de erros. Confira se os três servidores continuam ligados ao LB."],
        ),
      lesson:
        "O LB passa a mandar cada requisição para quem tem menos requisições abertas. O servidor lento acumula requisições em andamento e, sozinho, passa a receber menos. Nenhum peso foi configurado.",
    },
    {
      type: "choice",
      title: "E o weighted round robin?",
      body: "Outra correção seria dar peso 3 aos servidores novos e 1 ao antigo. Quando o peso fixo funciona pior que o least connections?",
      choices: [
        {
          text: "Quando as requisições têm duração muito variada (relatório pesado e leitura rápida misturados)",
          correct: true,
          why: "Isso. O peso é fixo e não percebe que um servidor ficou cheio de requisições lentas.",
        },
        { text: "Quando os servidores têm capacidades diferentes", why: "É justamente o caso em que o peso ajuda, se a diferença for conhecida e estável." },
        { text: "Nunca, os dois são equivalentes", why: "O peso é decidido antes; o least connections reage ao que está acontecendo." },
      ],
      lesson:
        "Peso estático serve para diferença conhecida (máquina maior). Para carga imprevisível, algoritmos que olham o estado atual se adaptam. LBs modernos (Envoy, por exemplo) sorteiam dois servidores e escolhem o menos ocupado: é o \"power of two choices\", que evita consultar todos.",
    },
    {
      type: "choice",
      title: "O carrinho que some",
      body: "O carrinho de compras fica na memória do servidor. Com o LB espalhando as requisições, o usuário perde o carrinho. O que você propõe?",
      choices: [
        { text: "Sticky session: prender o usuário a um servidor", why: "Funciona, mas desbalanceia a carga e o usuário perde a sessão se aquele servidor cair." },
        { text: "Servidores stateless: sessão num Redis compartilhado (ou num token assinado)", correct: true, why: "Isso. Qualquer servidor atende qualquer usuário." },
        { text: "Voltar para um servidor só", why: "Volta o ponto único de falha e o teto de capacidade." },
      ],
      lesson:
        "Servidor stateless é o que permite escalar na horizontal e trocar máquina sem o usuário perceber. Junto com isso, o LB precisa de health check para tirar da rotação quem não responde.",
    },
  ],
  talk: [
    "Round robin assume servidores iguais e requisições de custo parecido; com máquinas diferentes, a mais fraca satura primeiro.",
    "Least connections se adapta sozinho a um servidor lento; weighted round robin precisa de peso configurado e não percebe mudanças.",
    "Health check tira da rotação quem caiu, e sessão fora do servidor (Redis ou JWT) deixa trocar de servidor sem perder estado.",
  ],
  tech: ["NGINX (least_conn)", "HAProxy (leastconn)", "AWS ALB (least outstanding requests)", "Envoy (least request)", "Kubernetes Service"],
  study: [
    yt("hhy6EDDjy-o", "Load Balancing a fundo"),
    { title: "HTTP load balancing", by: "Documentação do NGINX", url: "https://nginx.org/en/docs/http/load_balancing.html" },
    { title: "Site Reliability Engineering, cap. 20: Load Balancing in the Datacenter", by: "Google", url: "https://sre.google/sre-book/load-balancing-datacenter/" },
    { title: "The Power of Two Choices in Randomized Load Balancing", by: "Michael Mitzenmacher (2001)", note: "O paper por trás do \"sorteia dois e escolhe o melhor\"." },
  ],
};

/** Aula: N+1 queries. */
export const N_PLUS_ONE_CASE: GuidedCase = {
  id: "n-mais-um",
  title: "N+1 queries: a tela que derruba o banco",
  summary: "Uma listagem que faz uma query por item. Conte as queries, ache o gargalo e corrija com uma busca só.",
  level: "básico",
  story:
    "A tela \"Meus pedidos\" de um app lista os 20 últimos pedidos. O ORM busca a lista (1 query) e depois, para cada pedido, busca o produto (mais 20 queries). Em desenvolvimento, com 3 pedidos de teste, era instantâneo. Em produção, o banco vive no vermelho e ninguém mudou nada.",
  start: build(
    [
      users({ dailyActiveUsers: 1_000_000, requestsPerUserPerDay: 20, peakFactor: 5, writeRatio: 0 }),
      { id: "lb", kind: "loadBalancer", label: "Load balancer" },
      { id: "s1", kind: "server", label: "Servidor 1" },
      { id: "s2", kind: "server", label: "Servidor 2" },
      { id: "s3", kind: "server", label: "Servidor 3" },
      { id: "db", kind: "database", label: "Postgres", params: { serviceTimeMs: 63 } },
    ],
    [
      ["users", "lb"],
      ["lb", "s1"],
      ["lb", "s2"],
      ["lb", "s3"],
      ["s1", "db"],
      ["s2", "db"],
      ["s3", "db"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "Onde está o gargalo?",
      body: "Rode a simulação. Os servidores estão folgados; olhe o banco.",
      tasks: ["▶ Simular"],
      check: (b) => all([!!b.result, SIMULATE], [hot(metric(b, "db")?.status), "O Postgres deveria estar sobrecarregado. Confira o tempo de serviço dele (63 ms)."]),
      lesson:
        "O banco está acima do limite. No simulador, o tempo de serviço do banco (63 ms) representa todas as queries de uma requisição: 21 queries de ~3 ms cada.",
    },
    {
      type: "number",
      title: "Quantas queries por segundo?",
      body: "No pico chegam ~1.157 telas por segundo, e cada tela faz 1 + 20 queries. Quantas queries por segundo o banco recebe?",
      answer: 1157 * 21,
      tolerance: 0.1,
      unit: "queries/s",
      lesson: "~24 mil queries por segundo para servir ~1.160 telas. Além do tempo de execução, cada ida ao banco paga rede e ocupa uma conexão do pool.",
    },
    {
      type: "choice",
      title: "Como corrigir?",
      body: "Qual é a correção certa para o N+1?",
      choices: [
        { text: "Colocar cache em cada query de produto", why: "Alivia, mas mantém as 21 idas (agora ao cache) e esconde o problema." },
        { text: "Buscar tudo de uma vez: JOIN, ou WHERE produto_id IN (...)", correct: true, why: "Isso. De 21 queries para 1 ou 2." },
        { text: "Adicionar réplicas de leitura", why: "Você pagaria mais máquinas para fazer trabalho desnecessário." },
      ],
      lesson:
        "No ORM isso se chama eager loading: include no Prisma, JOIN FETCH no JPA, includes no Rails, select_related/prefetch_related no Django. Em GraphQL, o DataLoader agrupa as buscas de cada item numa só.",
    },
    {
      type: "build",
      title: "Aplique a correção",
      body: "Com a lista e os produtos em 2 queries, cada tela custa ~6 ms de banco. Clique no Postgres e mude o tempo de serviço para 6.",
      tasks: ["Tempo de serviço do Postgres = 6 ms", "▶ Simular"],
      check: (b) =>
        all(
          [param(b, "db", "serviceTimeMs") <= 10, "Mude o tempo de serviço do Postgres para 6 ms."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.01, "Ainda há erros. Confira se os três servidores estão ligados ao Postgres."],
        ),
      lesson: "O banco caiu para uma fração da ocupação, sem nenhuma máquina nova. Antipadrões como esse (a Microsoft chama de Chatty I/O) aparecem só com volume real de dados.",
    },
    {
      type: "choice",
      title: "Como achar em produção?",
      body: "Como você descobre um N+1 antes que ele derrube o banco?",
      choices: [
        { text: "Contando queries por requisição: tracing, log de SQL em desenvolvimento e pg_stat_statements", correct: true, why: "Isso. A pista é o número de queries crescer com o tamanho da lista." },
        { text: "Olhando só a CPU dos servidores", why: "Os servidores estavam folgados: o custo aparece no banco." },
        { text: "Testando com poucos dados em desenvolvimento", why: "Foi assim que o bug passou: com 3 pedidos, 4 queries não doem." },
      ],
      lesson: "Teste com volume parecido com o de produção e acompanhe queries por requisição no APM. Um alerta simples: \"mais de 10 queries numa requisição\".",
    },
  ],
  talk: [
    "N+1 é quando a quantidade de queries cresce com o tamanho da lista: 1 para a lista e mais 1 por item.",
    "A correção é buscar em lote (JOIN ou IN) ou usar eager loading no ORM; cache só esconde.",
    "Para achar: contar queries por requisição no tracing e testar com volume real.",
  ],
  tech: ["pg_stat_statements", "OpenTelemetry / APM", "DataLoader (GraphQL)", "Prisma include", "JPA JOIN FETCH"],
  study: [
    { title: "Antipadrão Chatty I/O", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/antipatterns/chatty-io/" },
    { title: "Antipadrões de desempenho para aplicativos de nuvem", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/antipatterns/", note: "Lista citada no roadmap do Renato Augusto no Miro." },
    { title: "DataLoader", by: "GraphQL Foundation", url: "https://github.com/graphql/dataloader" },
  ],
};

/** Aula: réplica não é CQRS. */
export const CQRS_CASE: GuidedCase = {
  id: "replica-nao-e-cqrs",
  title: "Réplica não é CQRS",
  summary: "Réplicas não deixam uma consulta pesada mais rápida. Monte um modelo de leitura e veja o p99 despencar.",
  level: "intermediário",
  video: { id: "8Z8JAtEEan0", title: "CQRS" },
  story:
    "A tela \"Detalhes do pedido\" de um marketplace junta pedido, itens, produtos, vendedor, pagamento, entrega e nota fiscal: 8 tabelas com JOIN, ~120 ms por consulta. O time colocou réplicas de leitura, o banco ficou com folga, e a tela continua lenta.",
  start: build(
    [
      users({ dailyActiveUsers: 500_000, requestsPerUserPerDay: 20, peakFactor: 4, writeRatio: 0 }),
      { id: "lb", kind: "loadBalancer", label: "Load balancer" },
      { id: "s1", kind: "server", label: "API 1" },
      { id: "s2", kind: "server", label: "API 2" },
      { id: "db", kind: "database", label: "Postgres", params: { serviceTimeMs: 120, readReplicas: 2 } },
    ],
    [
      ["users", "lb"],
      ["lb", "s1"],
      ["lb", "s2"],
      ["s1", "db"],
      ["s2", "db"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "Folga no banco, tela lenta",
      body: "Rode a simulação e compare a ocupação das réplicas com o p99. A meta do time é p99 abaixo de 200 ms.",
      tasks: ["▶ Simular", "Olhe o p99 nos resultados"],
      check: (b) => all([!!b.result, SIMULATE], [(b.result?.latency.p99Ms ?? 0) > 200, "O p99 deveria passar de 200 ms. Confira o tempo de serviço do Postgres (120 ms)."]),
      lesson: "As réplicas estão longe de 100%, e mesmo assim o p99 passa de meio segundo. Não é fila: é o tempo de cada consulta, e a cauda dela.",
    },
    {
      type: "choice",
      title: "Mais réplicas resolvem?",
      body: "O time quer dobrar as réplicas. O p99 cai?",
      choices: [
        { text: "Sim, o dobro de réplicas, metade do tempo", why: "Réplica divide a fila, não o tempo de execução de uma consulta." },
        { text: "Não: a fila já é pequena, e cada consulta continua levando ~120 ms", correct: true, why: "Isso. A lentidão está na consulta, não na falta de máquina." },
        { text: "Sim, se a replicação for síncrona", why: "Replicação síncrona deixa a escrita mais lenta; a leitura não muda." },
      ],
      lesson: "A analogia do Renato: alargar a rodovia não faz o caminhão de 80 km/h correr mais. Réplica escala vazão (mais consultas ao mesmo tempo), não latência de uma consulta.",
    },
    {
      type: "build",
      title: "Prove com 6 réplicas",
      body: "Clique no Postgres, coloque 6 réplicas de leitura e simule.",
      tasks: ["Réplicas de leitura = 6", "▶ Simular"],
      check: (b) => all([param(b, "db", "readReplicas") >= 6, "Coloque 6 réplicas de leitura no Postgres."], [!!b.result, SIMULATE]),
      lesson: "A ocupação das réplicas caiu bastante, e o p99 quase não mudou. Volte para 2 réplicas se quiser: o próximo passo não depende delas.",
    },
    {
      type: "choice",
      title: "O que é CQRS?",
      body: "Qual é a ideia central do CQRS?",
      choices: [
        { text: "Ter obrigatoriamente dois bancos e dois serviços", why: "Essa é a versão mais pesada. A definição original é mais simples." },
        { text: "Separar o modelo de leitura do de escrita: guardar a tela já montada, atualizada quando o pedido muda", correct: true, why: "Isso. A leitura vira buscar um documento pronto." },
        { text: "Trocar o Postgres por um banco NoSQL", why: "Trocar o banco não muda o formato da consulta." },
      ],
      lesson:
        "CQRS (Greg Young, a partir do CQS de Bertrand Meyer) é usar modelos diferentes para comando e consulta. Pode ser uma materialized view, uma tabela desnormalizada atualizada na mesma transação, ou um banco de leitura alimentado por CDC (Debezium + Kafka).",
    },
    {
      type: "build",
      title: "Monte o modelo de leitura",
      solution: "As APIs ligam no Cache, e o Cache liga no Postgres: API → Cache → Postgres. Clique no Cache e coloque hit rate 1. Apague as setas diretas API → Postgres. As leituras param no Cache (a tela pronta) e só as escritas chegam ao banco.",
      body: "No simulador, use um Cache como modelo de leitura: toda leitura encontra a tela pronta (hit rate 1) e as escritas passam por ele até o Postgres.",
      tasks: [
        "Adicione um Cache entre as APIs e o Postgres (API → Cache → Postgres)",
        "Hit rate do Cache = 1",
        "Apague as conexões diretas API → Postgres",
        "▶ Simular com p99 abaixo de 200 ms",
      ],
      check: (b) => {
        const cache = ofKind(b, "cache")[0];
        return all(
          [!!cache, "Adicione um Cache para fazer o papel do modelo de leitura."],
          [linked(b, "server", "cache") && linked(b, "cache", "database"), "Ligue API → Cache → Postgres."],
          [!linked(b, "server", "database"), "As APIs ainda estão ligadas direto no Postgres. Apague essas conexões."],
          [Number(cache?.data.params.hitRate ?? 0) >= 0.99, "Coloque o hit rate do Cache em 1: a tela já está montada."],
          [!!b.result, SIMULATE],
          [(b.result?.latency.p99Ms ?? 1e9) < 200, `p99 em ${ms(b.result?.latency.p99Ms ?? 0)}. Confira as conexões.`],
        );
      },
      lesson:
        "O p99 despencou: a leitura virou buscar um documento pela chave. O custo foi para a escrita, que agora também atualiza o modelo de leitura, e ele fica alguns milissegundos atrasado (consistência eventual). Quem acabou de escrever precisa ver o que escreveu: devolva o objeto na resposta ou leia do lado de escrita por alguns segundos.",
    },
    {
      type: "choice",
      title: "E o relatório do financeiro?",
      body: "O financeiro quer o faturamento por cidade e categoria dos últimos 90 dias. Usa o mesmo caminho?",
      choices: [
        { text: "Sim, é só mais um modelo de leitura", why: "Agregar milhões de linhas é outro problema: análise, não tela de produto." },
        { text: "Não: é análise (OLAP). Os dados vão para um data warehouse via CDC ou ETL", correct: true, why: "Isso. Banco colunar foi feito para agregação." },
        { text: "Roda no primário de madrugada", why: "Relatório que trava o banco transacional é exatamente o que se quer evitar." },
      ],
      lesson: "OLTP (transações do dia a dia) e OLAP (análise) pedem ferramentas diferentes: BigQuery, Redshift, ClickHouse ou Snowflake para o segundo. CQRS é parente, mas a ferramenta é outra.",
    },
  ],
  talk: [
    "Réplica de leitura escala vazão; não deixa uma consulta pesada mais rápida.",
    "CQRS separa o modelo de leitura: a tela fica pré-montada e desnormalizada, e a fonte da verdade continua no banco de escrita.",
    "O preço é consistência eventual e um pipeline (CDC ou outbox) para manter o modelo de leitura atualizado.",
  ],
  tech: ["PostgreSQL materialized view", "Debezium (CDC)", "Apache Kafka", "MongoDB", "Elasticsearch"],
  study: [
    yt("8Z8JAtEEan0", "CQRS"),
    { title: "CQRS", by: "Martin Fowler", url: "https://martinfowler.com/bliki/CQRS.html" },
    { title: "Padrão CQRS", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/patterns/cqrs" },
    { title: "Designing Data-Intensive Applications, caps. 3 e 11", by: "Martin Kleppmann", note: "Armazenamento orientado a leitura e fluxos de dados derivados." },
  ],
};

/** Aula: fila absorvendo pico (queue-based load leveling). */
export const QUEUE_CASE: GuidedCase = {
  id: "fila-no-pico",
  title: "Fila para aguentar o pico da Black Friday",
  summary: "O pagamento aguenta 400 pedidos/s e o pico chega a 600. Ponha uma fila no meio e veja quando ela salva e quando não.",
  level: "intermediário",
  video: { id: "8xFBQc1A4B8", title: "Arquitetura orientada a eventos" },
  story:
    "À meia-noite da Black Friday, um e-commerce recebe 600 pedidos por segundo durante uns 20 segundos; no resto do tempo são 100. O checkout chama o serviço de pagamentos direto, e ele processa no máximo 400 por segundo. Todo ano, à meia-noite, os clientes veem erro.",
  start: build(
    [
      users({ dailyActiveUsers: 864_000, requestsPerUserPerDay: 10, peakFactor: 6, pattern: "spike", writeRatio: 1 }),
      { id: "checkout", kind: "server", label: "Checkout" },
      { id: "pay", kind: "external", label: "Pagamentos", params: { workers: 40, serviceTimeMs: 100, queueCapacity: 200, errorRate: 0 } },
    ],
    [
      ["users", "checkout"],
      ["checkout", "pay"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "Meia-noite",
      body: "Os Usuários estão no padrão \"média com pico no meio\": 100 pedidos/s, com 600/s no terço do meio da simulação. Rode e olhe o gráfico.",
      tasks: ["▶ Simular", "Repare quando os erros aparecem no gráfico"],
      check: (b) => all([!!b.result, SIMULATE], [(b.result?.errorRate ?? 0) > 0.02, "Deveria haver erros no pico. Confira se o padrão dos Usuários é \"Média com pico no meio\"."]),
      lesson: "Os erros aparecem só no meio, durante o pico: chegam 600 pedidos/s e o pagamento processa 400/s. A fila interna dele (200 lugares) enche em menos de um segundo e o resto é rejeitado.",
    },
    {
      type: "number",
      title: "Quanto sobra?",
      body: "Durante os 20 s de pico chegam 600 pedidos/s e saem 400/s. Quantos pedidos sobram ao fim do pico?",
      answer: (600 - 400) * 20,
      tolerance: 0.1,
      unit: "pedidos",
      lesson: "4.000 pedidos. Se eles esperassem numa fila, depois do pico chegam só 100/s e sobram 300/s de capacidade: a fila esvazia em ~13 s.",
    },
    {
      type: "build",
      title: "Coloque uma fila",
      solution: "Checkout → Fila → Pagamentos. Apague a seta direta Checkout → Pagamentos. Clique na Fila e coloque 40 consumidores: cada pagamento leva ~100 ms, então 40 consumidores entregam até ~400 por segundo, o máximo que o provedor aguenta (40 conexões) e bem acima da média de 100 pedidos/s. No pico a fila acumula; depois ela esvazia.",
      body: "O checkout grava o pedido na fila e responde na hora; consumidores tiram da fila e chamam o pagamento no ritmo dele.",
      tasks: [
        "Adicione uma Fila: Checkout → Fila → Pagamentos",
        "Apague a conexão direta Checkout → Pagamentos",
        "Coloque 40 consumidores na Fila (um para cada conexão do Pagamentos)",
        "▶ Simular com erros abaixo de 1%",
      ],
      check: (b) => {
        const q = ofKind(b, "queue")[0];
        return all(
          [!!q, "Adicione uma Fila."],
          [linked(b, "server", "queue") && linked(b, "queue", "external"), "Ligue Checkout → Fila → Pagamentos."],
          [!edge(b, "checkout", "pay"), "Apague a conexão direta Checkout → Pagamentos."],
          [Number(q?.data.params.consumers ?? 0) >= 40, `A fila tem ${Number(q?.data.params.consumers ?? 0)} consumidores: só ${Number(q?.data.params.consumers ?? 0) * 10} pedidos/s chegam ao pagamento e a fila nunca esvazia. Use 40.`],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.01, "Ainda há erros. Confira as conexões."],
        );
      },
      lesson:
        "O checkout responde na hora (\"pedido recebido\") e o pagamento trabalha no ritmo dele. A fila acumula no pico e esvazia depois. É o padrão Queue-Based Load Leveling.",
    },
    {
      type: "choice",
      title: "E se o pico durasse a noite toda?",
      body: "Imagine 600 pedidos/s durante horas, com os mesmos 400/s de pagamento.",
      choices: [
        { text: "A fila segura, é para isso que ela existe", why: "Ela só guarda o excesso; se o excesso não para de chegar, ela enche." },
        { text: "A fila cresce até encher e volta a rejeitar: falta capacidade no consumidor", correct: true, why: "Isso. Fila amortece pico, não cria capacidade." },
        { text: "Basta aumentar o tamanho da fila", why: "Só adia o problema, e cada pedido espera mais para ser cobrado." },
      ],
      lesson:
        "A conta é a mesma do servidor: utilização média ρ = chegada média ÷ capacidade precisa ficar abaixo de 1. Na prática, escala-se o consumidor pelo tamanho da fila (consumer lag), com KEDA ou autoscaling.",
    },
    {
      type: "choice",
      title: "O cliente precisa saber",
      body: "Agora o checkout responde antes de cobrar. O que muda para o cliente e para o código?",
      choices: [
        {
          text: "O pedido fica \"pendente\" e o app acompanha o status; e o consumidor precisa aguentar receber o mesmo pedido duas vezes",
          correct: true,
          why: "Isso. Resposta 202 + status, e consumidor idempotente.",
        },
        { text: "Nada muda, o pagamento sempre aprova", why: "Pagamento recusa; o cliente precisa ser avisado depois." },
        { text: "Melhor voltar a chamar o pagamento direto", why: "Volta o erro na meia-noite." },
      ],
      lesson:
        "Filas entregam pelo menos uma vez (at-least-once): se o consumidor cai antes de confirmar, a mensagem volta. Sem chave de idempotência, a cobrança sai duas vezes. Há uma aula disso em Concorrência e dados.",
    },
  ],
  talk: [
    "Fila desacopla o ritmo de quem produz do ritmo de quem consome: o pico vira espera, não erro.",
    "Ela só salva se a capacidade do consumidor for maior que a chegada média (ρ < 1); senão cresce até encher.",
    "O cliente recebe 202 com status pendente, e o consumidor precisa ser idempotente porque a entrega é at-least-once.",
  ],
  tech: ["Apache Kafka", "RabbitMQ", "Amazon SQS", "Google Pub/Sub", "KEDA"],
  study: [
    yt("8xFBQc1A4B8", "Arquitetura orientada a eventos"),
    { title: "Padrão Nivelamento de Carga Baseado em Fila", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/patterns/queue-based-load-leveling" },
    { title: "Designing Data-Intensive Applications, cap. 11", by: "Martin Kleppmann", note: "Processamento de streams e filas de mensagens." },
  ],
};

/** Aula: cadeia de microsserviços (latência soma, disponibilidade multiplica). */
export const MICRO_CASE: GuidedCase = {
  id: "cadeia-de-microsservicos",
  title: "Microsserviços: a conta que ninguém faz",
  summary: "Quatro serviços chamados em cadeia: a latência soma, a disponibilidade multiplica e um serviço caído derruba todos.",
  level: "intermediário",
  video: { id: "JXeJUfBCg4U", title: "Microsserviços: a maior armadilha" },
  story:
    "Uma fintech quebrou o monolito em microsserviços. Agora o checkout passa por API → Pedidos → Antifraude → Pagamentos, um chamando o outro por HTTP. Cada serviço sozinho é rápido, mas o checkout ficou mais lento, e no dia em que o Antifraude caiu ninguém conseguiu comprar.",
  start: build(
    [
      users({ dailyActiveUsers: 500_000, requestsPerUserPerDay: 20, peakFactor: 4 }),
      { id: "api", kind: "server", label: "API", params: { serviceTimeMs: 10 } },
      { id: "orders", kind: "server", label: "Pedidos", params: { serviceTimeMs: 15 } },
      { id: "fraud", kind: "server", label: "Antifraude", params: { serviceTimeMs: 30 } },
      { id: "payments", kind: "server", label: "Pagamentos", params: { serviceTimeMs: 20 } },
      { id: "db", kind: "database", label: "Postgres" },
    ],
    [
      ["users", "api"],
      ["api", "orders"],
      ["orders", "fraud"],
      ["fraud", "payments"],
      ["payments", "db"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "A latência da cadeia",
      body: "Rode a simulação e olhe a latência. Nenhum serviço está sobrecarregado.",
      tasks: ["▶ Simular", "Compare o p50 com a soma dos tempos de serviço (10 + 15 + 30 + 20 + 15 ms)"],
      check: (b) => all([!!b.result, SIMULATE]),
      lesson:
        "Cada salto soma tempo de serviço, rede e espera. A mediana fica perto da soma (~90 ms), e o p99 vai bem além, porque basta um dos cinco ter uma resposta lenta para a requisição inteira ficar lenta. Num monolito, essas etapas seriam chamadas de função no mesmo processo.",
    },
    {
      type: "number",
      title: "Disponibilidade em série",
      body: "Cada um dos 4 serviços tem 99,9% de disponibilidade e todos são obrigatórios para o checkout. Qual é a disponibilidade do checkout, em %?",
      answer: 0.999 ** 4 * 100,
      tolerance: 0.0005,
      unit: "%",
      lesson: "Em série, disponibilidades se multiplicam: 0,999⁴ ≈ 99,6%. Isso é ~2,9 horas fora do ar por mês, contra ~43 minutos de um serviço só a 99,9%.",
    },
    {
      type: "build",
      title: "Derrube o Antifraude",
      body: "Clique no Antifraude, marque \"Derrubar no segundo\" e simule.",
      tasks: ["Programe a queda do Antifraude", "▶ Simular"],
      check: (b) =>
        all(
          [b.failures.some((f) => f.nodeId === "fraud"), "Selecione o Antifraude e marque \"Derrubar no segundo\"."],
          [!!b.result, SIMULATE],
        ),
      lesson: "Efeito dominó: a partir da queda, todo checkout falha, com API, Pedidos e Pagamentos saudáveis. Desmarque a queda antes de seguir.",
    },
    {
      type: "choice",
      title: "O que fazer?",
      body: "O Antifraude vai cair de novo algum dia. Qual é a melhor proteção?",
      choices: [
        { text: "Mais retries na chamada ao Antifraude", why: "Retry num serviço caído ou lento só multiplica a carga (é o retry storm, outra aula)." },
        {
          text: "Timeout curto e circuit breaker no Antifraude, com uma regra de fallback (ex.: aprovar valores baixos e revisar depois)",
          correct: true,
          why: "Isso. A falha fica contida e o negócio decide o que fazer sem a resposta.",
        },
        { text: "Aumentar o timeout para esperar ele voltar", why: "Timeout longo prende recursos de quem chama e espalha a lentidão." },
      ],
      lesson:
        "Circuit breaker: depois de N falhas seguidas, para de chamar por um tempo e usa o fallback, em vez de deixar todo mundo esperar o timeout. E pergunte se a chamada precisa ser síncrona: o que não precisa da resposta na hora pode ir para uma fila (próxima aula).",
    },
    {
      type: "open",
      title: "Então microsserviço é ruim?",
      body: "O entrevistador pergunta: \"Então você não usaria microsserviços?\". Como você responde?",
      reference:
        "Microsserviço resolve problema de organização: times independentes, deploy independente, escalar só a parte que precisa. Não resolve performance (cada salto adiciona rede) e cobra em operação: observabilidade, tracing distribuído, consistência entre bancos. O caminho comum é começar com um monolito modular, com fronteiras bem definidas (DDD), e extrair serviços quando houver motivo concreto.",
    },
  ],
  talk: [
    "Numa cadeia síncrona a latência soma e a disponibilidade multiplica: 4 serviços a 99,9% dão ~99,6%.",
    "Toda chamada remota precisa de timeout; dependência instável pede circuit breaker e fallback.",
    "Microsserviço resolve problema de organização e de escala independente, não de performance; comece pelo monolito modular.",
  ],
  tech: ["OpenTelemetry", "Resilience4j", "Polly (.NET)", "Istio / Envoy", "gRPC"],
  study: [
    yt("JXeJUfBCg4U", "Microsserviços: a maior armadilha (e o DDD)"),
    { title: "Criando Microsserviços, 2ª ed.", by: "Sam Newman" },
    { title: "MonolithFirst", by: "Martin Fowler", url: "https://martinfowler.com/bliki/MonolithFirst.html" },
    { title: "CircuitBreaker", by: "Martin Fowler", url: "https://martinfowler.com/bliki/CircuitBreaker.html" },
    { title: "Release It!, 2ª ed.", by: "Michael Nygard", note: "Padrões de estabilidade: timeout, circuit breaker, bulkhead." },
  ],
};

/** Aula: cadeia síncrona x broker de eventos. */
export const BROKER_CASE: GuidedCase = {
  id: "cadeia-sincrona-x-broker",
  title: "Cadeia síncrona × broker de eventos",
  summary: "Pedidos que esperam estoque, notificação e nota fiscal. Tire do caminho o que pode ser depois e meça com a Lei de Little.",
  level: "avançado",
  video: { id: "8xFBQc1A4B8", title: "Arquitetura orientada a eventos" },
  story:
    "Num marketplace, o serviço de Pedidos chama em sequência o Estoque (380 ms), a Notificação (420 ms) e o Fiscal, que emite a nota e depende da prefeitura (2,5 s). O cliente espera mais de 3 segundos para ver \"pedido confirmado\", parte desiste, e no dia em que a prefeitura saiu do ar ninguém conseguiu comprar. (Números do vídeo de EDA do Renato Augusto.)",
  start: build(
    [
      users({ dailyActiveUsers: 200_000, requestsPerUserPerDay: 10, peakFactor: 5, writeRatio: 1, timeoutMs: 5000 }),
      { id: "orders", kind: "server", label: "Pedidos" },
      { id: "db", kind: "database", label: "Postgres" },
      { id: "stock", kind: "server", label: "Estoque", params: { workers: 64, serviceTimeMs: 380 } },
      { id: "notify", kind: "server", label: "Notificação", params: { workers: 64, serviceTimeMs: 420 } },
      { id: "fiscal", kind: "external", label: "Fiscal (prefeitura)", params: { workers: 400, serviceTimeMs: 2500, queueCapacity: 500, errorRate: 0.01 } },
    ],
    [
      ["users", "orders"],
      ["orders", "db"],
      ["orders", "stock"],
      ["orders", "notify"],
      ["orders", "fiscal"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "Quanto o cliente espera?",
      body: "Os Pedidos chamam Postgres, Estoque, Notificação e Fiscal, um depois do outro. O cliente desiste depois de 5 s. Simule.",
      tasks: ["▶ Simular", "Olhe o p50, o p99 e os timeouts"],
      check: (b) => all([!!b.result, SIMULATE]),
      lesson:
        "A latência é a soma: 380 + 420 + 2.500 ms ≈ 3,3 s de média. A cauda do Fiscal passa dos 5 s, e esses clientes desistem (timeout), mesmo com o pedido gravado.",
    },
    {
      type: "choice",
      title: "O que o cliente precisa esperar?",
      body: "Para mostrar \"pedido confirmado\", quais etapas precisam ter terminado?",
      choices: [
        { text: "Todas: estoque, notificação e nota fiscal", why: "O e-mail e a nota podem chegar minutos depois sem prejuízo." },
        { text: "Gravar o pedido e reservar o estoque; notificação e nota fiscal podem ser depois", correct: true, why: "Isso. O resto reage ao evento PedidoCriado." },
        { text: "Nenhuma: responde e faz tudo depois", why: "Sem reservar o estoque, você confirma pedido de produto que acabou." },
      ],
      lesson:
        "Em arquitetura orientada a eventos, Pedidos publica PedidoCriado e quem precisa reage no seu ritmo. Consulta e o que o usuário precisa na hora continuam síncronos; comando demorado e fan-out viram eventos.",
    },
    {
      type: "build",
      title: "Tire do caminho",
      solution: "Duas Filas: Pedidos → Fila 1 → Notificação e Pedidos → Fila 2 → Fiscal. Apague as setas diretas Pedidos → Notificação e Pedidos → Fiscal. Os Pedidos continuam ligados ao Postgres e ao Estoque, que o cliente precisa ver na hora.",
      body: "Cada consumidor tem a sua fila (é assim que o fan-out funciona: SNS → várias SQS, ou um consumer group por serviço no Kafka).",
      tasks: [
        "Pedidos → Fila → Notificação",
        "Pedidos → outra Fila → Fiscal",
        "Apague as conexões diretas Pedidos → Notificação e Pedidos → Fiscal",
        "▶ Simular sem timeouts",
      ],
      check: (b) => {
        const qs = ofKind(b, "queue");
        const feeds = (target: string) => qs.some((q) => edge(b, q.id, target));
        const p99 = b.result?.latency.p99Ms ?? 1e9;
        return all(
          [qs.length >= 2, "Use duas Filas, uma para cada consumidor."],
          [feeds("notify"), "Ligue uma Fila → Notificação."],
          [feeds("fiscal"), "Ligue a outra Fila → Fiscal (prefeitura)."],
          [!edge(b, "orders", "notify") && !edge(b, "orders", "fiscal"), "Apague as conexões diretas Pedidos → Notificação e Pedidos → Fiscal."],
          [qs.every((q) => linked(b, "server", "queue") && b.edges.some((e) => e.target === q.id)), "Ligue Pedidos → cada Fila."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.01, "Ainda há erros. Confira as conexões."],
          [p99 < 2500, `p99 em ${ms(p99)}. Algo lento ainda está no caminho síncrono.`],
        );
      },
      lesson: "Sem timeouts, e o p99 caiu para perto do tempo do Estoque, que continua síncrono de propósito. Agora olhe a fila do Fiscal: com os 4 consumidores padrão, ela só cresce.",
    },
    {
      type: "number",
      title: "Quantos consumidores?",
      body: "Chegam ~116 pedidos/s e cada nota leva 2,5 s. Quantas notas o Fiscal precisa estar processando ao mesmo tempo para dar conta?",
      answer: 115.7 * 2.5,
      tolerance: 0.1,
      unit: "consumidores",
      lesson:
        "Lei de Little: L = λ × W = 116 × 2,5 ≈ 290 em andamento ao mesmo tempo. Com menos consumidores do que isso, a fila cresce sem parar (ρ > 1). A Notificação precisa de 116 × 0,42 ≈ 49.",
    },
    {
      type: "build",
      title: "Derrube o Fiscal",
      body: "Coloque 300 consumidores na fila do Fiscal e 50 na da Notificação. Depois programe a queda do Fiscal e simule.",
      tasks: ["Consumidores: 300 (Fiscal) e 50 (Notificação)", "Programe a queda do Fiscal", "▶ Simular"],
      check: (b) => {
        const q = ofKind(b, "queue").find((x) => edge(b, x.id, "fiscal"));
        return all(
          [Number(q?.data.params.consumers ?? 0) >= 290, "A fila do Fiscal precisa de pelo menos 290 consumidores."],
          [b.failures.some((f) => f.nodeId === "fiscal"), "Programe a queda do Fiscal (prefeitura)."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.01, "O cliente não deveria ver erro com o Fiscal fora. Confira as conexões."],
        );
      },
      lesson:
        "O Fiscal caiu e o cliente nem percebeu: o pedido só depende do broker. Na vida real, as mensagens ficam na fila e são reprocessadas quando ele volta (com retry e DLQ). Este simulador descarta a mensagem que falha; o ponto aqui é que o pedido deixou de depender do Fiscal.",
    },
    {
      type: "choice",
      title: "Salvar e publicar",
      body: "Pedidos grava no Postgres e depois publica PedidoCriado no broker. O que pode dar errado?",
      choices: [
        {
          text: "Se o processo cair entre os dois, o pedido existe e o evento nunca sai (dual write)",
          correct: true,
          why: "Isso. A correção é o Transactional Outbox: gravar o evento numa tabela na mesma transação e publicar depois.",
        },
        { text: "Nada: o broker garante a entrega", why: "O broker só garante o que recebeu. O problema é antes." },
        { text: "Publique antes de gravar, assim nunca se perde", why: "Aí o e-mail pode sair para um pedido que nunca foi gravado." },
      ],
      lesson:
        "Outbox (ou CDC lendo o log do banco) publica pelo menos uma vez. Então os consumidores precisam ser idempotentes, e eventos de um mesmo pedido devem ir para a mesma partição para manter a ordem.",
    },
  ],
  talk: [
    "Cadeia síncrona: a latência é a soma e a disponibilidade é o produto; um serviço lento ou caído contamina todos.",
    "Com broker, o pedido responde depois de gravar e reservar estoque, e cada consumidor escala no seu ritmo, medido pelo tamanho da fila.",
    "Salvar e publicar é dual write: use Transactional Outbox ou CDC, e consumidores idempotentes.",
  ],
  tech: ["Apache Kafka", "RabbitMQ", "Amazon SNS + SQS", "Amazon EventBridge", "Debezium (outbox via CDC)"],
  study: [
    yt("8xFBQc1A4B8", "Arquitetura orientada a eventos"),
    yt("voeWcHeYzLI", "Dual Write e Transactional Outbox"),
    { title: "What do you mean by \"Event-Driven\"?", by: "Martin Fowler", url: "https://martinfowler.com/articles/201701-event-driven.html" },
    { title: "Pattern: Transactional outbox", by: "Chris Richardson (microservices.io)", url: "https://microservices.io/patterns/data/transactional-outbox.html" },
  ],
};

/** Aula: retry storm. */
export const RETRY_CASE: GuidedCase = {
  id: "retry-storm",
  title: "Retry storm: quando a ajuda derruba",
  summary: "Retry salva erro passageiro e afunda um serviço sobrecarregado. Veja as duas coisas acontecerem.",
  level: "avançado",
  story:
    "O checkout consulta o frete numa API externa. Ela falhava de vez em quando, e o time ligou retries. Semanas depois, numa sexta à noite, o provedor ficou lento: os retries multiplicaram as chamadas e ele parou de responder de vez.",
  start: build(
    [
      users({ dailyActiveUsers: 1_500_000, requestsPerUserPerDay: 20, peakFactor: 1, writeRatio: 0 }),
      { id: "checkout", kind: "server", label: "Checkout", params: { workers: 64 } },
      { id: "freight", kind: "external", label: "API de frete", params: { workers: 20, serviceTimeMs: 40, queueCapacity: 50, errorRate: 0.05 } },
    ],
    [
      ["users", "checkout"],
      ["checkout", "freight"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "Erro passageiro",
      body: "A API de frete erra 5% das chamadas, ao acaso. Simule.",
      tasks: ["▶ Simular"],
      check: (b) => all([!!b.result, SIMULATE], [(b.result?.errorRate ?? 0) > 0.03, "Deveria haver ~5% de erros. Confira a taxa de erro da API de frete."]),
      lesson: "~5% das cotações falham, e não é sobrecarga: a API está com folga. É o caso clássico de erro transitório.",
    },
    {
      type: "build",
      title: "Ligue os retries",
      body: "Clique no Checkout e coloque 2 retries (com backoff exponencial e jitter, já embutidos).",
      tasks: ["Retries do Checkout = 2", "▶ Simular com erros abaixo de 1%"],
      check: (b) =>
        all(
          [param(b, "checkout", "retries") >= 1, "Coloque 2 retries no Checkout."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.01, "Ainda há mais de 1% de erros."],
        ),
      lesson: "Só falha quem errar três vezes seguidas: 0,05³ ≈ 0,01%. Para erro transitório, retry com backoff funciona muito bem.",
    },
    {
      type: "build",
      title: "Sexta à noite",
      body: "O provedor ficou lento: mude o tempo de serviço da API de frete para 80 ms. O time, assustado, sobe para 3 retries. Simule.",
      tasks: ["Tempo de serviço da API de frete = 80 ms", "Retries do Checkout = 3", "▶ Simular", "Compare as chegadas na API de frete com as ~347 cotações/s"],
      check: (b) =>
        all(
          [param(b, "freight", "serviceTimeMs") >= 80, "Mude o tempo de serviço da API de frete para 80 ms."],
          [param(b, "checkout", "retries") >= 3, "Coloque 3 retries no Checkout."],
          [!!b.result, SIMULATE],
        ),
      lesson:
        "Com 80 ms, o provedor aguenta 20 ÷ 0,08 = 250 chamadas/s e chegam ~347. Cada rejeição volta como retry, que encontra a fila cheia de novo e gera outro retry. Repare nas chegadas na API de frete: os retries viraram a maior parte da carga.",
    },
    {
      type: "choice",
      title: "Os retries ajudaram?",
      body: "Compare com o que aconteceria sem retry.",
      choices: [
        { text: "Sim, sem eles seriam muito mais erros", why: "A diferença é pequena: quem não passa na 1ª tentativa quase nunca passa nas outras, porque o provedor continua cheio." },
        { text: "Não: com o provedor saturado, retry multiplica a carga sobre quem já não dá conta", correct: true, why: "Isso. É o retry storm, e ele impede o provedor de se recuperar." },
        { text: "Tanto faz", why: "Não é neutro: a carga extra atrasa a recuperação do provedor e de todo mundo que depende dele." },
      ],
      lesson:
        "Retry resolve erro passageiro, não sobrecarga. Protegem: limite de tentativas, backoff exponencial com jitter, retry budget (no máximo ~10% de chamadas extras), e circuit breaker para parar de chamar quando a taxa de erro dispara.",
    },
    {
      type: "build",
      title: "Proteja o provedor",
      body: "Volte para no máximo 1 retry e simule. Compare as chegadas na API de frete com a rodada anterior.",
      tasks: ["Retries do Checkout ≤ 1", "▶ Simular"],
      check: (b) => {
        const now = metric(b, "freight")?.arrivals ?? 0;
        const before = metricBefore(b, "freight")?.arrivals;
        return all(
          [param(b, "checkout", "retries") <= 1, "Coloque no máximo 1 retry no Checkout."],
          [!!b.result, SIMULATE],
          [!before || now < before * 0.8, "As chegadas na API de frete deveriam cair em relação à rodada com 3 retries."],
        );
      },
      lesson:
        "A carga no provedor caiu. Com a API lenta, o caminho certo é falhar rápido e degradar: circuit breaker e um fallback (frete estimado por região, com aviso). O simulador ainda não tem circuit breaker; ele fica para uma próxima versão.",
    },
  ],
  talk: [
    "Retry é para erro transitório; com a dependência sobrecarregada, ele multiplica a carga e impede a recuperação.",
    "Sempre com limite, backoff exponencial e jitter; idealmente com retry budget e só em operação idempotente.",
    "Para dependência degradada: timeout, circuit breaker e fallback, para falhar rápido em vez de esperar.",
  ],
  tech: ["Resilience4j", "Polly (.NET)", "Envoy / Istio (retry budget)", "AWS SDK (backoff com jitter)", "gRPC retry policy"],
  study: [
    { title: "Timeouts, retries, and backoff with jitter", by: "Amazon Builders' Library", url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/" },
    { title: "Antipadrão Retry Storm", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/antipatterns/retry-storm/" },
    { title: "Site Reliability Engineering, cap. 22: Addressing Cascading Failures", by: "Google", url: "https://sre.google/sre-book/addressing-cascading-failures/" },
    { title: "Release It!, 2ª ed.", by: "Michael Nygard" },
  ],
};

/** Aula: hash de senha x vazão de login. */
export const PASSWORD_CASE: GuidedCase = {
  id: "hash-de-senha-e-login",
  title: "Hash de senha e a enxurrada de login",
  summary: "O mesmo custo que protege a senha limita quantos logins por segundo você aguenta. Faça a conta e dimensione.",
  level: "intermediário",
  video: { id: "VW2mywTTz80", title: "Senhas no banco" },
  story:
    "Minutos antes da final da Copa, um app de streaming esportivo recebe uma enxurrada de logins. A senha é verificada com bcrypt custo 12: ~300 ms de CPU por tentativa (o Renato Augusto mediu 323 ms). O serviço de autenticação tem 4 máquinas de 8 núcleos, que sempre deram conta no dia a dia.",
  start: build(
    [
      users({ dailyActiveUsers: 2_000_000, requestsPerUserPerDay: 2, peakFactor: 10, writeRatio: 0, timeoutMs: 3000 }),
      { id: "lb", kind: "loadBalancer", label: "Load balancer" },
      { id: "auth", kind: "server", label: "Autenticação", params: { workers: 32, serviceTimeMs: 300 } },
      { id: "db", kind: "database", label: "Postgres" },
    ],
    [
      ["users", "lb"],
      ["lb", "auth"],
      ["auth", "db"],
    ],
  ),
  steps: [
    {
      type: "number",
      title: "Logins por núcleo",
      body: "O hash é CPU puro: um núcleo verifica uma senha por vez, ~300 ms cada. Quantos logins por segundo cada núcleo aguenta?",
      answer: 1 / 0.3,
      tolerance: 0.1,
      unit: "logins/s",
      lesson: "~3,3 logins/s por núcleo. No simulador, a Autenticação está como um nó só com 32 workers (4 máquinas × 8 núcleos) de 300 ms.",
    },
    {
      type: "build",
      title: "Começa o jogo",
      body: "No pico chegam ~463 logins/s. Simule.",
      tasks: ["▶ Simular"],
      check: (b) => all([!!b.result, SIMULATE], [hot(metric(b, "auth")?.status), "A Autenticação deveria estar sobrecarregada. Confira os 32 workers e os 300 ms."]),
      lesson: "32 núcleos × 3,3 ≈ 107 logins/s, e chegam 463. A fila enche, os usuários levam timeout e tentam de novo (piorando tudo).",
    },
    {
      type: "choice",
      title: "Baixar o custo?",
      body: "Alguém sugere baixar o custo do bcrypt de 12 para 4: ficaria 256× mais rápido. Por que não?",
      choices: [
        {
          text: "O custo existe para deixar a força bruta cara se o banco vazar; baixar enfraquece todas as senhas",
          correct: true,
          why: "Isso. O hash é lento de propósito.",
        },
        { text: "Resolveria, e é uma boa prática", why: "Custo 4 está muito abaixo do mínimo recomendado." },
        { text: "O bcrypt não deixa mudar o custo", why: "Deixa: cada +1 dobra o tempo." },
      ],
      lesson:
        "A OWASP aceita bcrypt com custo ≥ 10 em sistemas legados e recomenda argon2id (mínimo m = 19 MiB, t = 2, p = 1). Atenção: o argon2id também gasta memória por hash, então memória × logins simultâneos entra no dimensionamento.",
    },
    {
      type: "number",
      title: "Quantos núcleos?",
      body: "Para 463 logins/s com utilização máxima de 70% (folga para o pico do pico), quantos núcleos você precisa?",
      answer: (463 * 0.3) / 0.7,
      tolerance: 0.1,
      unit: "núcleos",
      lesson: "463 × 0,3 s ≈ 139 núcleos ocupados; ÷ 0,7 ≈ 200 núcleos, ou 25 máquinas de 8 núcleos.",
    },
    {
      type: "build",
      title: "Dimensione",
      body: "Clique na Autenticação e coloque 200 workers (25 máquinas × 8 núcleos). Simule.",
      tasks: ["Workers da Autenticação = 200", "▶ Simular com erros abaixo de 1%"],
      check: (b) =>
        all(
          [param(b, "auth", "workers") >= 180, "Coloque 200 workers na Autenticação."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.01, "Ainda há mais de 1% de erros."],
        ),
      lesson: "Funciona, mas são 21 máquinas a mais só para o pico. Daí a pergunta seguinte.",
    },
    {
      type: "choice",
      title: "Menos hashes",
      body: "Como reduzir a quantidade de hashes sem enfraquecer a senha?",
      choices: [
        {
          text: "Sessão longa e refresh token (loga uma vez, não a cada requisição), e rate limit por conta e por IP antes do hash",
          correct: true,
          why: "Isso. O hash só roda no login de verdade, e tentativa abusiva é barrada antes de gastar CPU.",
        },
        { text: "Guardar o resultado do hash em cache", why: "Cache de credencial cria outro alvo e não evita o hash de quem está logando." },
        { text: "Fazer o hash no navegador e mandar pronto", why: "O hash vira a senha: quem vazar o banco consegue logar." },
      ],
      lesson:
        "Rate limit no login protege contra força bruta online e contra a própria enxurrada virar DoS. Com picos previsíveis (final de campeonato), autoscaling antecipado também ajuda.",
    },
  ],
  talk: [
    "Hash de senha é lento de propósito; isso vira limite de vazão: com bcrypt custo 12, ~3 logins/s por núcleo.",
    "Dimensione pelo pico de logins com folga, e reduza hashes com sessão longa e rate limit antes do hash.",
    "Não troque segurança por vazão: siga o mínimo da OWASP (argon2id ou bcrypt custo ≥ 10).",
  ],
  tech: ["argon2id", "bcrypt", "Rate limit (NGINX limit_req, Redis)", "Keycloak", "Auth0 / Amazon Cognito"],
  study: [
    yt("VW2mywTTz80", "Senhas no banco"),
    { title: "Password Storage Cheat Sheet", by: "OWASP", url: "https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html" },
    { title: "Authentication Cheat Sheet", by: "OWASP", url: "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html" },
  ],
};

