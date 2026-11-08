import { all, linked, ofKind, SIMULATE } from "./checks";
import { build, edge, metric, nodeById, param, users, yt } from "./graph";
import type { Board, GuidedCase } from "./types";

/** Aulas da issue #16: rate limiter, pool bloqueante, autoscaling, sharding e pagamentos. */

const hot = (s?: string) => s === "bad" || s === "down";
const pct = (x: number) => `${(x * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const limiter = (b: Board) => ofKind(b, "rateLimiter")[0];
const limiterParam = (b: Board, key: string) => limiter(b)?.data.params[key];
const flag = (b: Board, id: string, key: string) => !!nodeById(b, id)?.data.params[key];

/** Aula: rate limiter contra o bot que derruba a API. */
export const RATE_LIMIT_CASE: GuidedCase = {
  id: "rate-limiter",
  title: "Rate limiter: o parceiro que entrou em loop",
  summary: "Um único cliente manda 3.000 req/s e derruba a API para todo mundo. Ponha um token bucket na entrada e descubra por que o limite precisa ser por cliente.",
  level: "intermediário",
  story:
    "Uma API pública de cotação de frete atende lojas virtuais. Na segunda de manhã, um parceiro publicou uma versão nova da integração com um bug: ela repete a mesma chamada num laço, 3.000 vezes por segundo. Os outros 1 milhão de usuários do dia, que somam menos de 700 req/s no pico, começam a levar timeout.",
  start: build(
    [
      users({ dailyActiveUsers: 1_000_000, requestsPerUserPerDay: 20, peakFactor: 3, writeRatio: 0, botRps: 3000 }),
      { id: "lb", kind: "loadBalancer", label: "Load balancer" },
      { id: "api", kind: "server", label: "API de frete", params: { workers: 32, serviceTimeMs: 20 } },
      { id: "db", kind: "database", label: "Postgres" },
    ],
    [
      ["users", "lb"],
      ["lb", "api"],
      ["api", "db"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "Quem está sofrendo?",
      body: "O nó Usuários já tem o bot com defeito ligado (3.000 req/s, além dos usuários normais). Simule e olhe o erro dos usuários legítimos.",
      tasks: ["▶ Simular", "Olhe a API de frete e o card \"erros legít.\""],
      check: (b) => all([!!b.result, SIMULATE], [hot(metric(b, "api")?.status), "A API de frete deveria estar sobrecarregada. Confira o bot no nó Usuários."]),
      lesson:
        "Mais da metade das requisições dos usuários legítimos falha. Ninguém mudou nada do lado deles: o bot ocupa a fila da API e todo mundo espera atrás dele.",
    },
    {
      type: "number",
      title: "Quanto a API aguenta?",
      body: "A API de frete tem 32 workers e cada requisição leva 20 ms. Quantas requisições por segundo ela atende no máximo?",
      answer: 32 / 0.02,
      tolerance: 0.1,
      unit: "req/s",
      lesson: "32 ÷ 0,02 s = 1.600 req/s. Chegam ~694 dos usuários + 3.000 do bot ≈ 3.700 req/s, mais que o dobro.",
    },
    {
      type: "choice",
      title: "O que fazer?",
      body: "O time está em reunião de crise. Qual é a proteção certa?",
      choices: [
        { text: "Subir mais 2 servidores", why: "Você pagaria para atender o bot, e o próximo bug pode mandar 30.000 req/s." },
        { text: "Bloquear o IP do parceiro no firewall", why: "Resolve hoje, na mão. Amanhã é outro cliente, e um IP pode ser o NAT de uma empresa inteira." },
        {
          text: "Limitar as requisições por cliente na entrada e responder 429 para o excesso",
          correct: true,
          why: "Isso: o excesso é barrado antes de gastar servidor, de forma automática e para qualquer cliente.",
        },
      ],
      lesson:
        "Rate limiting é a primeira linha de defesa de toda API pública. Fica na borda (API gateway, load balancer ou middleware) e responde HTTP 429 Too Many Requests, de preferência com o cabeçalho Retry-After.",
    },
    {
      type: "build",
      title: "Um limite para todo mundo",
      body: "Arraste um Rate limiter da paleta e ponha entre Usuários e Load balancer. Configure: 1.000 req/s, balde de 200, limite Global. Simule.",
      tasks: ["Usuários → Rate limiter → Load balancer", "1.000 req/s, balde 200, Global", "▶ Simular"],
      check: (b) =>
        all(
          [!!limiter(b), "Arraste um Rate limiter para o canvas."],
          [linked(b, "client", "rateLimiter") && linked(b, "rateLimiter", "loadBalancer"), "Ligue Usuários → Rate limiter → Load balancer (e apague a ligação direta)."],
          [!edge(b, "users", "lb"), "Apague a ligação direta de Usuários para o Load balancer: senão metade do tráfego passa por fora."],
          [limiterParam(b, "scope") === "global", "Escolha o limite Global no Rate limiter."],
          [Number(limiterParam(b, "ratePerSec")) <= 1200, "Use no máximo 1.200 req/s, abaixo do que a API aguenta."],
          [!!b.result, SIMULATE],
          [!hot(metric(b, "api")?.status), "A API ainda está sobrecarregada. Confira o limite."],
        ),
      lesson:
        "A API se salvou: recebe só 1.000 req/s e trabalha com folga. Mas olhe o erro dos usuários legítimos: piorou. Agora eles levam 429.",
    },
    {
      type: "choice",
      title: "Por que piorou?",
      body: "A API está folgada e os usuários legítimos levam mais erro do que antes. O que aconteceu?",
      choices: [
        { text: "O rate limiter é lento", why: "Ele não gasta tempo: responde 429 na hora." },
        {
          text: "O balde é um só: o bot gasta os tokens e quem chega depois dele fica sem",
          correct: true,
          why: "Isso. Num limite global, quem manda mais leva mais tokens. O bot manda 80% das requisições.",
        },
        { text: "1.000 req/s é pouco para os usuários", why: "Eles somam ~694 req/s: caberiam com folga se o bot não estivesse no mesmo balde." },
      ],
      lesson:
        "Limite global protege o servidor, não o usuário. Ele é útil como última defesa (load shedding), mas o limite principal tem de ser por cliente: chave de API, usuário autenticado ou, na falta, IP.",
    },
    {
      type: "build",
      title: "Um balde por cliente",
      body: "No Rate limiter, troque para \"Por cliente\", com 10 req/s e balde de 20 (cada lojista pode fazer uma rajada de 20 e depois 10 por segundo). Simule.",
      tasks: ["Limite: Por cliente", "10 req/s, balde 20", "▶ Simular com erro legítimo abaixo de 1%"],
      check: (b) =>
        all(
          [limiterParam(b, "scope") === "perClient", "Troque o limite para Por cliente."],
          [Number(limiterParam(b, "ratePerSec")) <= 50, "Use um limite por cliente pequeno, como 10 req/s."],
          [!!b.result, SIMULATE],
          [(b.result?.legit.errorRate ?? 1) < 0.01, `O erro dos usuários legítimos ainda está em ${pct(b.result?.legit.errorRate ?? 1)}.`],
        ),
      lesson:
        "Agora só o bot é barrado: ~99,7% das requisições dele voltam com 429, e os usuários legítimos passam. A API trabalha a ~45%, porque recebe só os usuários e 10 req/s do bot.",
    },
    {
      type: "choice",
      title: "Qual algoritmo?",
      body: "Para contar \"10 por segundo\", alguém sugere janela fixa: zera o contador no começo de cada segundo. Qual é o problema?",
      choices: [
        {
          text: "Na virada da janela passam o dobro: 10 no fim de um segundo e mais 10 no começo do outro",
          correct: true,
          why: "Isso. A janela fixa é simples, mas deixa rajadas de até 2× o limite.",
        },
        { text: "Gasta muita memória", why: "Ela gasta um contador por cliente, como as outras. Quem gasta memória é o log da janela deslizante." },
        { text: "Não funciona com vários servidores", why: "Funciona, se o contador estiver num lugar compartilhado. O problema é a borda da janela." },
      ],
      lesson:
        "Opções comuns: janela fixa (simples, rajada de 2× na virada), log da janela deslizante (exato, guarda cada horário), contador deslizante ponderado (aproximado e barato) e token bucket (dois números por cliente, rajada controlada pelo tamanho do balde). Token bucket é o mais usado: Stripe, AWS API Gateway e NGINX (limit_req com burst).",
    },
    {
      type: "choice",
      title: "Três gateways",
      body: "Em produção são 3 instâncias do gateway atrás do load balancer, cada uma com o próprio contador em memória. O que acontece com o limite de 10 req/s?",
      choices: [
        { text: "Continua 10 req/s", why: "Cada instância deixa passar 10: o cliente consegue até 30." },
        {
          text: "Vira até 30 req/s; o contador precisa ficar num lugar compartilhado, com operação atômica (Redis INCR + EXPIRE ou script Lua)",
          correct: true,
          why: "Isso. E ler o valor e depois gravar em dois comandos é uma condição de corrida: dois gateways leem 9 e os dois deixam passar.",
        },
        { text: "Vira 3 req/s", why: "Não: cada um conta só o que passou por ele." },
      ],
      lesson:
        "Contador compartilhado no Redis, com uma operação só: INCR devolve o valor já somado, e um script Lua faz o token bucket inteiro de forma atômica. É o mesmo problema do cenário \"Reserva de assento: GET e depois SET\" no laboratório de Concorrência. Se o Redis cair, decida antes: deixar passar (fail open) ou barrar (fail closed).",
    },
  ],
  talk: [
    "Rate limit na borda, por cliente (chave de API ou usuário), com 429 e Retry-After: o excesso é barrado antes de gastar servidor.",
    "Token bucket com dois parâmetros: ritmo de reposição e tamanho do balde (a rajada aceita).",
    "Com várias instâncias, contador compartilhado no Redis com operação atômica; limite global só como última defesa.",
  ],
  tech: ["NGINX limit_req", "Envoy rate limit", "AWS API Gateway / WAF", "Kong", "Redis (INCR, script Lua)", "Bucket4j / resilience4j-ratelimiter"],
  study: [
    { title: "System Design Interview, vol. 1, cap. 4: Design a rate limiter", by: "Alex Xu" },
    { title: "Scaling your API with rate limiters", by: "Stripe", url: "https://stripe.com/blog/rate-limiters" },
    { title: "Padrão Rate Limiting", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/patterns/rate-limiting-pattern" },
    { title: "How we built rate limiting capable of scaling to millions of domains", by: "Cloudflare", url: "https://blog.cloudflare.com/counting-things-a-lot-of-different-things/" },
  ],
};

/** Aula: thread presa, timeout e tirar a dependência lenta do caminho. */
export const POOL_CASE: GuidedCase = {
  id: "pool-bloqueante",
  title: "Pool de threads: o antifraude lento que parou o checkout",
  summary: "A CPU está em 1% e o checkout não responde. Faça a conta da Lei de Little, ponha timeout e tire a dependência lenta do caminho.",
  level: "avançado",
  story:
    "Um e-commerce roda o checkout em Spring MVC, com o pool padrão do Tomcat: 200 threads, uma por requisição. Cada compra grava no banco e consulta um serviço de antifraude que costuma responder em 80 ms. Na Black Friday, o antifraude ficou lento. O painel mostra a CPU do checkout quase parada, e mesmo assim ninguém consegue comprar.",
  start: build(
    [
      users({ dailyActiveUsers: 1_080_000, requestsPerUserPerDay: 8, peakFactor: 5, writeRatio: 0, timeoutMs: 3000 }),
      { id: "ck", kind: "server", label: "Checkout", params: { workers: 200, serviceTimeMs: 10, queueCapacity: 100, blocking: true } },
      { id: "db", kind: "database", label: "Postgres" },
      {
        id: "af",
        kind: "external",
        label: "Antifraude",
        params: { workers: 2000, serviceTimeMs: 80, queueCapacity: 100, errorRate: 0, distribution: "lognormal", cv: 1 },
      },
    ],
    [
      ["users", "ck"],
      ["ck", "db"],
      ["ck", "af"],
    ],
  ),
  steps: [
    {
      type: "number",
      title: "Quantas threads ocupadas?",
      body: "Chegam 500 compras por segundo. Cada uma segura a thread durante 10 ms de processamento, ~15 ms no banco e ~80 ms no antifraude. Pela Lei de Little (ocupados = chegadas × tempo), quantas threads ficam ocupadas em média?",
      answer: 500 * 0.105,
      tolerance: 0.15,
      unit: "threads",
      lesson: "500 × 0,105 s ≈ 52 threads das 200. A conta é a mesma de uma fila de banco: quanto mais tempo cada um fica, mais lugares ficam ocupados.",
    },
    {
      type: "build",
      title: "Um dia normal",
      body: "O Checkout já está com \"Thread presa\" ligado (uma thread por requisição, inclusive esperando). Simule.",
      tasks: ["▶ Simular", "Compare a ocupação do Checkout com a sua conta"],
      check: (b) => all([!!b.result, SIMULATE], [(b.result?.errorRate ?? 1) < 0.01, "Num dia normal quase nada deveria falhar. Confira o tempo do Antifraude (80 ms)."]),
      lesson:
        "~27% das threads ocupadas, perto da conta. Repare no detalhe: só ~3% desse tempo é CPU (500 × 10 ms ÷ 200). O resto é a thread parada, esperando banco e antifraude.",
    },
    {
      type: "build",
      title: "Black Friday",
      body: "O antifraude ficou lento: mude o tempo de serviço dele para 1.000 ms. Simule.",
      tasks: ["Tempo de serviço do Antifraude = 1.000 ms", "▶ Simular", "Leia o diagnóstico do Checkout"],
      check: (b) =>
        all(
          [param(b, "af", "serviceTimeMs") >= 1000, "Mude o tempo de serviço do Antifraude para 1.000 ms."],
          [!!b.result, SIMULATE],
          [hot(metric(b, "ck")?.status), "O Checkout deveria ter esgotado as threads. Confira se \"Thread presa\" está ligado."],
        ),
      lesson:
        "As 200 threads estão ocupadas e a fila do Checkout transborda, mas a CPU está em ~1%. É a thread presa: todas esperando o antifraude. Se o mesmo pool atendesse outras rotas (catálogo, carrinho), elas também parariam, sem usar o antifraude.",
    },
    {
      type: "number",
      title: "Quantas threads agora?",
      body: "Mesmas 500 compras por segundo, mas cada uma agora segura a thread por ~1,025 s. Quantas threads seriam necessárias?",
      answer: 500 * 1.025,
      tolerance: 0.1,
      unit: "threads",
      lesson: "~512 threads, e há 200. A conta não depende de CPU: é chegada × tempo de espera.",
    },
    {
      type: "choice",
      title: "Subir para 600 threads?",
      body: "Alguém propõe aumentar o pool do Tomcat para 600 threads. Resolve?",
      choices: [
        { text: "Resolve de vez", why: "Até o antifraude ir para 3 s: aí seriam 1.500 threads, cada uma com ~1 MB de pilha, e o problema volta." },
        { text: "Não; o certo é dar mais CPU às máquinas", why: "A CPU está parada. O recurso que acabou é thread, não CPU." },
        {
          text: "Ajuda hoje, mas o certo é limitar quanto tempo se espera e tirar a dependência lenta do caminho da compra",
          correct: true,
          why: "Isso: a capacidade não pode depender da lentidão de outro sistema.",
        },
      ],
      lesson:
        "Dimensionar pelo pior caso de uma dependência externa não tem fim. As defesas são timeout (a thread volta rápido), bulkhead (pool separado para a dependência arriscada) e assíncrono (a compra não espera o antifraude).",
    },
    {
      type: "build",
      title: "Timeout de 300 ms",
      body: "No Checkout, ponha 300 ms em \"Timeout das chamadas\". Simule.",
      tasks: ["Timeout das chamadas do Checkout = 300 ms", "▶ Simular", "Olhe a ocupação do Checkout e o p99"],
      check: (b) =>
        all(
          [param(b, "ck", "callTimeoutMs") > 0 && param(b, "ck", "callTimeoutMs") <= 500, "Ponha 300 ms em Timeout das chamadas do Checkout."],
          [!!b.result, SIMULATE],
          [!hot(metric(b, "ck")?.status), "O Checkout ainda está sem threads. Confira o timeout."],
        ),
      lesson:
        "As threads voltaram (o Checkout saiu do vermelho) e o p99 caiu para ~350 ms: falhar rápido protege o servidor. Mas quase todas as compras falham, porque o antifraude raramente responde em 300 ms. O timeout precisa de um plano para o que fazer quando ele estoura.",
    },
    {
      type: "choice",
      title: "E quando o antifraude não responde?",
      body: "A compra estourou o timeout do antifraude. O que o checkout faz?",
      choices: [
        { text: "Recusa a compra", why: "Na Black Friday, recusar é perder venda por um problema que não é do cliente." },
        { text: "Aprova sem análise", why: "É exatamente o momento em que os fraudadores atacam." },
        {
          text: "Aceita o pedido como \"em análise\" e faz a análise depois, numa fila",
          correct: true,
          why: "Isso: o cliente recebe resposta na hora e a análise acontece em segundo plano (o pagamento só é capturado depois).",
        },
      ],
      lesson: "É assim que grandes lojas fazem: o pedido entra, a análise de fraude roda de forma assíncrona e só então o pagamento é capturado ou estornado.",
    },
    {
      type: "build",
      title: "Tire o antifraude do caminho",
      body: "Apague a ligação Checkout → Antifraude e ponha uma Fila no meio: Checkout → Fila → Antifraude. Os consumidores da fila também seguram cada mensagem por ~1 s: dimensione pela Lei de Little (500 × 1 s). Simule.",
      tasks: ["Checkout → Fila → Antifraude (sem ligação direta)", "Consumidores da Fila ≥ 500", "▶ Simular com erros abaixo de 1%"],
      check: (b) => {
        const q = ofKind(b, "queue")[0];
        return all(
          [!!q && linked(b, "server", "queue") && linked(b, "queue", "external"), "Ligue Checkout → Fila → Antifraude."],
          [!edge(b, "ck", "af"), "Apague a ligação direta do Checkout para o Antifraude."],
          [Number(q?.data.params.consumers ?? 0) >= 400, "Ponha pelo menos 500 consumidores na Fila (500 mensagens/s × 1 s)."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.01, "Ainda há mais de 1% de erros."],
        );
      },
      lesson:
        "O Checkout grava, enfileira e responde em dezenas de milissegundos, com ~6% das threads ocupadas. A lentidão do antifraude virou atraso da análise, não falha da compra. Os consumidores seguram o tempo de espera, mas são um pool separado: um bulkhead. Se o antifraude piorar, só a fila cresce.",
    },
    {
      type: "choice",
      title: "E o pool de conexões do banco?",
      body: "Para \"acompanhar\" as 200 threads, alguém quer 200 conexões no pool do banco, que tem 16 núcleos. Faz sentido?",
      choices: [
        { text: "Sim: uma conexão por thread, para ninguém esperar", why: "200 consultas disputando 16 núcleos só aumentam troca de contexto e lock; o banco fica mais lento." },
        {
          text: "Não: poucas conexões (a regra do HikariCP dá ~núcleos × 2 + discos) e as threads esperam a sua vez",
          correct: true,
          why: "Isso. O pool de conexões é dimensionado pelo banco, não pela aplicação.",
        },
        { text: "Tanto faz", why: "Não é neutro: conexões demais derrubam o throughput do banco." },
      ],
      lesson:
        "Pool de conexões também é um recurso bloqueante. Uma consulta lenta segura a conexão e as outras esperam. Ponha timeout de aquisição de conexão e de consulta, e ache a consulta lenta em vez de aumentar o pool.",
    },
  ],
  talk: [
    "Com uma thread por requisição, threads ocupadas = vazão × tempo total (Lei de Little). Dependência lenta esgota o pool com a CPU parada.",
    "Defesas: timeout curto com fallback, bulkhead (pool separado para a dependência arriscada) e tirar do caminho síncrono com fila.",
    "Pool de conexões se dimensiona pelo banco (~núcleos × 2), não pelo número de threads.",
  ],
  tech: ["Tomcat / Spring MVC (thread por requisição)", "Virtual threads (Java 21)", "Spring WebFlux / Node.js (assíncrono)", "HikariCP", "Resilience4j (TimeLimiter, Bulkhead)"],
  study: [
    { title: "Release It!, 2ª ed., caps. 4 e 5", by: "Michael Nygard", note: "Blocked threads, timeouts e bulkheads." },
    { title: "About Pool Sizing", by: "HikariCP (Brett Wooldridge)", url: "https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing" },
    { title: "Padrão Bulkhead", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/patterns/bulkhead" },
    { title: "Timeouts, retries, and backoff with jitter", by: "Amazon Builders' Library", url: "https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/" },
  ],
};

/** Aula: autoscaling com atraso num pico repentino. */
export const AUTOSCALE_CASE: GuidedCase = {
  id: "autoscaling-atrasado",
  title: "Autoscaling: a live que começou antes das máquinas",
  summary: "O pico vem de uma vez e as instâncias novas levam 60 s para subir. Veja o autoscaling chegar atrasado e compare atraso menor, escala agendada e custo.",
  level: "intermediário",
  durationSec: 180,
  story:
    "Uma plataforma de cursos anunciou uma live às 20h com desconto para quem comprar durante a transmissão. A API roda num grupo com autoscaling: mínimo de 2 instâncias, alvo de 60% de CPU, e cada instância nova é uma VM que leva ~60 s para subir. Às 20h em ponto, o tráfego multiplica por 5.",
  start: build(
    [
      users({ dailyActiveUsers: 1_728_000, requestsPerUserPerDay: 20, peakFactor: 5, pattern: "spike", writeRatio: 0 }),
      {
        id: "api",
        kind: "server",
        label: "API (autoscaling)",
        params: { workers: 8, serviceTimeMs: 20, queueCapacity: 200, autoscale: true, minInstances: 2, maxInstances: 10, targetUtilization: 0.6, scaleDelaySec: 60 },
      },
      { id: "db", kind: "database", label: "Postgres", params: { workers: 200, serviceTimeMs: 5 } },
    ],
    [
      ["users", "api"],
      ["api", "db"],
    ],
  ),
  steps: [
    {
      type: "number",
      title: "Quantas instâncias no pico?",
      body: "Cada instância tem 8 workers e cada requisição leva 20 ms. No pico chegam 2.000 req/s. Com o alvo de 60% de utilização, quantas instâncias o pico pede?",
      answer: 2000 / ((8 / 0.02) * 0.6),
      tolerance: 0.15,
      unit: "instâncias",
      lesson: "Cada instância atende 8 ÷ 0,02 = 400 req/s. A 60%, são 240 req/s por instância: 2.000 ÷ 240 ≈ 8,3, ou seja, 9 instâncias. Fora do pico (400 req/s), as 2 mínimas bastam.",
    },
    {
      type: "build",
      title: "Começa a live",
      body: "A simulação desta aula tem 180 s: média até 60 s, pico de 60 a 120 s, média de novo. Simule e olhe a linha laranja (instâncias) no gráfico.",
      tasks: ["▶ Simular", "Quando as instâncias novas chegam?"],
      check: (b) => all([!!b.result, SIMULATE], [(b.result?.errorRate ?? 0) > 0.1, "Deveria haver muitos erros no pico. Confira o atraso de 60 s e o mínimo de 2 instâncias."]),
      lesson:
        "O autoscaling percebeu o pico no primeiro ciclo (5 s depois) e pediu instâncias. Elas só começaram a atender depois de 60 s, quando o pico já tinha acabado. Durante o minuto inteiro do pico, 2 instâncias receberam 2.000 req/s.",
    },
    {
      type: "choice",
      title: "Por que não salvou?",
      body: "O autoscaling funcionou como configurado. Por que não ajudou?",
      choices: [
        { text: "O alvo de 60% é baixo", why: "Alvo mais alto só deixa menos folga. O problema é o tempo para a capacidade chegar." },
        { text: "O máximo de 10 instâncias é pouco", why: "O pico pede 9. Nem as primeiras chegaram a tempo." },
        {
          text: "Ele reage depois que o pico começa, e a instância nova leva 60 s para atender: o pico foi mais rápido",
          correct: true,
          why: "Isso. Autoscaling reativo segue a carga com atraso; não salva pico repentino.",
        },
      ],
      lesson: "O tempo de reação é medir (segundos) + decidir (um ciclo) + provisionar (VM, imagem, aplicação subindo, aquecimento). Em VM, isso costuma passar de um minuto.",
    },
    {
      type: "build",
      title: "Instâncias que sobem rápido",
      body: "Troque para containers numa máquina que já existe, ou um warm pool: \"Atraso para subir instância\" = 5 s. Simule.",
      tasks: ["Atraso para subir instância = 5 s", "▶ Simular"],
      check: (b) =>
        all(
          [param(b, "api", "scaleDelaySec") <= 10, "Coloque 5 s no atraso para subir instância."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < (b.before?.errorRate ?? 1) * 0.5, "Os erros deveriam cair bem em relação à rodada anterior."],
        ),
      lesson:
        "Melhor, mas os primeiros segundos do pico ainda falham: o autoscaling precisa ver o pico para reagir. E um warm pool tem custo: as máquinas ficam criadas, esperando.",
    },
    {
      type: "choice",
      title: "A live tem hora marcada",
      body: "Você sabe que o pico começa às 20h. O que fazer?",
      choices: [
        {
          text: "Escala agendada: subir o mínimo para o pico às 19h50 e voltar depois da live",
          correct: true,
          why: "Isso: para evento previsto, a capacidade chega antes do tráfego.",
        },
        { text: "Deixar 9 instâncias ligadas o tempo todo", why: "Resolve, mas paga o pico 24 horas por dia." },
        { text: "Baixar o alvo de utilização para 20%", why: "Ele ainda reage depois do pico começar; só sobe mais máquinas, atrasadas." },
      ],
      lesson: "AWS (scheduled actions), GCP e o Kubernetes (KEDA cron) permitem agendar o mínimo. O autoscaling reativo continua ligado para o que fugir da previsão.",
    },
    {
      type: "build",
      title: "Escala agendada",
      body: "Simule a janela da live com o mínimo já alto: \"Instâncias mínimas\" = 9. Simule e compare o custo (worker-horas) com as rodadas anteriores.",
      tasks: ["Instâncias mínimas = 9", "▶ Simular com erros abaixo de 0,5%", "Compare o custo"],
      check: (b) =>
        all(
          [param(b, "api", "minInstances") >= 7, "Suba as instâncias mínimas para 9."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.005, "Ainda há erros no pico. Suba mais o mínimo."],
        ),
      lesson:
        "Zero erro, e o custo fica ~4× maior que com o mínimo de 2. Na vida real você só paga isso durante a live: o agendamento sobe às 19h50 e desce às 21h.",
    },
    {
      type: "choice",
      title: "Onde o autoscaling brilha",
      body: "Então, em que situação o autoscaling reativo funciona bem?",
      choices: [
        { text: "Pico de Black Friday à meia-noite", why: "É pico repentino e previsto: escala agendada (e fila na frente)." },
        {
          text: "Carga que sobe e desce aos poucos, como o ciclo do dia, com folga no alvo para cobrir o atraso",
          correct: true,
          why: "Isso. Se a carga cresce mais devagar do que a máquina sobe, a folga do alvo segura até ela chegar.",
        },
        { text: "Banco de dados", why: "Banco tem estado: escalar não é só ligar mais uma máquina igual." },
      ],
      lesson:
        "Na prática combina-se: mínimo para o tráfego base, escala agendada para eventos, autoscaling reativo para o resto, e fila para absorver o que vier antes da capacidade. A métrica também importa: CPU, requisições por instância ou tamanho da fila.",
    },
  ],
  talk: [
    "Autoscaling reage com atraso: medir, decidir e subir a instância. Não salva pico repentino.",
    "Para evento previsto, escala agendada antes; para reduzir o atraso, containers, imagens pequenas e warm pool.",
    "Escolha a métrica (CPU, fila, req por instância), o alvo com folga e o mínimo e máximo; compare o custo.",
  ],
  tech: ["AWS Auto Scaling (target tracking, scheduled, warm pools)", "Kubernetes HPA", "KEDA", "Karpenter", "GCP Managed Instance Groups"],
  study: [
    yt("FfigYiI2fKc", "Como virar Arquiteto de Soluções"),
    { title: "Target tracking scaling policies", by: "AWS", url: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-scaling-target-tracking.html" },
    { title: "Warm pools for Amazon EC2 Auto Scaling", by: "AWS", url: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/ec2-auto-scaling-warm-pools.html" },
    { title: "Horizontal Pod Autoscaling", by: "Kubernetes", url: "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/" },
  ],
};

/** Aula: sharding, escolha da chave e shard quente. */
export const SHARDING_CASE: GuidedCase = {
  id: "sharding-chave",
  title: "Sharding: a chave que esquentou um banco só",
  summary: "Réplica não divide escrita. Divida o banco em shards, veja a chave por data criar um shard quente e a celebridade fritar o dela.",
  level: "avançado",
  video: { id: "xJllDyCIyws", title: "Sharding" },
  story:
    "Um marketplace cresceu e grava cada pedido, item e mudança de status no mesmo Postgres. No pico são ~4.600 requisições por segundo, 60% delas escritas. O time já otimizou as consultas, criou índices e subiu a maior máquina disponível. O banco continua no limite.",
  start: build(
    [
      users({ dailyActiveUsers: 4_000_000, requestsPerUserPerDay: 50, peakFactor: 2, writeRatio: 0.6 }),
      { id: "api", kind: "server", label: "API de pedidos", params: { workers: 400, serviceTimeMs: 10 } },
      { id: "db", kind: "database", label: "Postgres" },
    ],
    [
      ["users", "api"],
      ["api", "db"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "O banco no limite",
      body: "Simule e olhe o banco.",
      tasks: ["▶ Simular"],
      check: (b) => all([!!b.result, SIMULATE], [hot(metric(b, "db")?.status), "O banco deveria estar sobrecarregado."]),
      lesson: "O banco aguenta 50 ÷ 0,015 ≈ 3.333 req/s e chegam ~4.630, das quais ~2.780 são escritas.",
    },
    {
      type: "choice",
      title: "Antes de fragmentar",
      body: "O Renato Augusto insiste numa ordem antes de partir para sharding. Qual?",
      choices: [
        {
          text: "Escalar a aplicação, depois o banco na vertical, índices, cache, otimizar queries e réplicas de leitura; sharding só no teto",
          correct: true,
          why: "Isso. Sharding é caro de operar: consultas entre shards, transações e rebalanceamento.",
        },
        { text: "Sharding primeiro, porque escala para sempre", why: "Escala, mas complica tudo. É o último passo, não o primeiro." },
        { text: "Trocar o banco por NoSQL", why: "Troca um problema por outros; e o NoSQL também fragmenta por uma chave." },
      ],
      lesson: "Neste caso o time já fez o barato. Falta testar a réplica.",
    },
    {
      type: "build",
      title: "Réplicas resolvem?",
      body: "No banco, coloque 2 réplicas de leitura. Simule.",
      tasks: ["Réplicas de leitura = 2", "▶ Simular", "Olhe o primário e o replication lag"],
      check: (b) => all([param(b, "db", "readReplicas") >= 1, "Coloque 2 réplicas de leitura no banco."], [!!b.result, SIMULATE]),
      lesson:
        "As réplicas tiraram as leituras, mas o primário continua perto do limite com as escritas, e o replication lag passou de 30 s, porque a réplica aplica tantas escritas numa thread só. Réplica escala leitura; escrita precisa ser dividida.",
    },
    {
      type: "number",
      title: "Quantos shards?",
      body: "Cada shard é um Postgres igual ao atual (~3.333 req/s). Para cada um ficar abaixo de 50% com ~4.630 req/s distribuídas por igual, quantos shards no mínimo?",
      answer: Math.ceil(4630 / (3333 * 0.5)),
      tolerance: 0,
      unit: "shards",
      lesson: "4.630 ÷ N ≤ 1.667 ⇒ N ≥ 2,8, ou seja, 3 shards. Vamos usar 4 para ter folga de crescimento.",
    },
    {
      type: "build",
      title: "Shard por data",
      body: "Zere as réplicas, coloque 4 shards e escolha a chave \"Intervalo por data de criação\" (pedidos de janeiro num shard, fevereiro no outro...). Simule.",
      tasks: ["Réplicas = 0", "Shards = 4", "Chave: Intervalo por data de criação", "▶ Simular", "Olhe a ocupação de cada shard"],
      check: (b) =>
        all(
          [param(b, "db", "shards") >= 2, "Coloque 4 shards no banco."],
          [nodeById(b, "db")?.data.params.shardKey === "range", "Escolha a chave Intervalo por data de criação."],
          [!!b.result, SIMULATE],
          [hot(metric(b, "db")?.status), "Um shard deveria estar sobrecarregado. Confira a chave."],
        ),
      lesson: "Três shards dormem e o último frita. Todo pedido novo tem a data de hoje, então toda escrita e quase toda leitura (pedidos recentes) caem no intervalo atual.",
    },
    {
      type: "choice",
      title: "O que deu errado?",
      body: "Por que a data é uma chave ruim aqui?",
      choices: [
        { text: "Intervalo (range) nunca funciona", why: "Funciona e é muito usado (Bigtable, Spanner, CockroachDB). O problema é a chave que só cresce." },
        {
          text: "A chave só cresce: tudo que é novo cai no mesmo intervalo",
          correct: true,
          why: "Isso. Chave monotônica (data, id sequencial) concentra a escrita no fim.",
        },
        { text: "4 shards é pouco", why: "Com a carga dividida por igual, 4 shards ficariam a ~35%." },
      ],
      lesson:
        "Boa shard key, nas palavras do Renato: alta afinidade (os dados relacionados vão juntos, como os pedidos de um cliente), alta cardinalidade e distribuição uniforme. Aqui: customer_id, com hash.",
    },
    {
      type: "build",
      title: "Hash do cliente",
      body: "Troque a chave para hash(user_id). Simule.",
      tasks: ["Chave: hash(user_id)", "▶ Simular com erros abaixo de 1%"],
      check: (b) =>
        all(
          [nodeById(b, "db")?.data.params.shardKey === "hash", "Troque a chave para hash(user_id)."],
          [Number(nodeById(b, "db")?.data.params.hotKeyShare ?? 0) === 0, "Deixe o tráfego numa chave só em 0 por enquanto."],
          [!!b.result, SIMULATE],
          [(b.result?.errorRate ?? 1) < 0.01, "Ainda há mais de 1% de erros."],
        ),
      lesson: "Os 4 shards ficam em ~35% cada. E \"meus pedidos\" continua uma consulta num shard só, porque todos os pedidos de um cliente moram juntos.",
    },
    {
      type: "build",
      title: "A celebridade",
      body: "Uma loja gigante entrou no marketplace e virou metade do tráfego. Ponha 0,5 em \"Tráfego numa chave só\". Simule.",
      tasks: ["Tráfego numa chave só = 0,5", "▶ Simular", "Olhe o primeiro shard"],
      check: (b) =>
        all(
          [Number(nodeById(b, "db")?.data.params.hotKeyShare ?? 0) >= 0.4, "Ponha 0,5 em Tráfego numa chave só."],
          [!!b.result, SIMULATE],
          [hot(metric(b, "db")?.status), "O shard da loja gigante deveria estar sobrecarregado."],
        ),
      lesson: "Hash espalha chaves diferentes, não acessos à mesma chave: o shard da loja recebe 50% do tráfego mais a parte normal dele.",
    },
    {
      type: "choice",
      title: "Como esfriar a chave quente?",
      body: "O que fazer com o shard da loja gigante?",
      choices: [
        { text: "Adicionar mais shards", why: "A chave continua inteira num shard só, por mais shards que existam." },
        {
          text: "Cache e réplicas para a leitura dela, e um shard dedicado (ou dividir a chave com sufixo) para a escrita",
          correct: true,
          why: "Isso. O Renato sugere shard dedicado para a celebridade; para escrita muito quente, dividir a chave (loja#0 … loja#9) e juntar na leitura.",
        },
        { text: "Trocar a chave para data", why: "Volta o problema do último intervalo." },
      ],
      lesson: "Hotspot se resolve olhando o tipo de acesso: leitura quente é cache; escrita quente é dividir a chave ou agregar de forma assíncrona.",
    },
    {
      type: "number",
      title: "Rebalancear",
      body: "Com shard = hash(chave) mod N, você vai de 3 para 5 shards. Que porcentagem das chaves muda de shard (e precisa ser migrada)?",
      answer: 80,
      tolerance: 0.1,
      unit: "% das chaves",
      lesson:
        "Uma chave só fica no lugar se k mod 3 = k mod 5, o que acontece em 3 de cada 15 valores: 80% mudam. Com consistent hashing, só se move o que vai para os 2 shards novos: 2/5 = 40%. Bancos com sharding nativo usam isso ou slots lógicos fixos (o Redis Cluster tem 16.384).",
    },
  ],
  talk: [
    "Sharding é o último passo: antes, escala vertical, índice, cache e réplicas. Réplica escala leitura; escrita precisa ser dividida.",
    "Shard key com alta afinidade, alta cardinalidade e distribuição uniforme; evite chave monotônica (data, id sequencial).",
    "Chave quente: cache para leitura, shard dedicado ou chave com sufixo para escrita. Rebalanceamento com consistent hashing ou slots lógicos.",
  ],
  tech: ["Vitess (MySQL)", "Citus (Postgres)", "MongoDB", "Cassandra / DynamoDB", "CockroachDB / Spanner", "Redis Cluster"],
  study: [
    yt("xJllDyCIyws", "Sharding"),
    { title: "Designing Data-Intensive Applications, cap. 6: Partitioning", by: "Martin Kleppmann" },
    { title: "System Design Interview, vol. 1, cap. 5: Design consistent hashing", by: "Alex Xu" },
    { title: "Padrão Sharding", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/patterns/sharding" },
  ],
};

/** Aula: retry de pagamento sem cobrar duas vezes. */
export const PAYMENT_CASE: GuidedCase = {
  id: "pagamento-sem-cobranca-dupla",
  title: "Pagamentos: retry sem cobrar duas vezes",
  summary: "O gateway às vezes demora. Ponha timeout e retry, veja clientes cobrados em dobro e corrija com chave de idempotência.",
  level: "intermediário",
  story:
    "Uma loja processa 200 pagamentos por segundo no pico. Cada pagamento grava o pedido e chama o gateway de pagamento, que responde em ~300 ms, mas às vezes passa de 2 s. O time pôs timeout e retry para ninguém ficar esperando. Na semana seguinte, o SAC recebe reclamações de clientes cobrados duas vezes.",
  start: build(
    [
      users({ dailyActiveUsers: 864_000, requestsPerUserPerDay: 4, peakFactor: 5, writeRatio: 1, timeoutMs: 5000 }),
      { id: "pay", kind: "server", label: "API de pagamentos", params: { workers: 64, serviceTimeMs: 10 } },
      { id: "db", kind: "database", label: "Postgres" },
      {
        id: "gw",
        kind: "external",
        label: "Gateway de pagamento",
        params: { workers: 500, serviceTimeMs: 300, queueCapacity: 100, errorRate: 0, distribution: "lognormal", cv: 1.5 },
      },
    ],
    [
      ["users", "pay"],
      ["pay", "db"],
      ["pay", "gw"],
    ],
  ),
  steps: [
    {
      type: "build",
      title: "A cauda do gateway",
      body: "Simule e olhe o p99.",
      tasks: ["▶ Simular", "Olhe o p99"],
      check: (b) => all([!!b.result, SIMULATE]),
      lesson: "Quase tudo passa, mas o p99 fica perto de 2 s: o gateway tem cauda longa. Algumas compras esperam vários segundos.",
    },
    {
      type: "build",
      title: "Timeout de 1 s",
      body: "Na API de pagamentos, ponha 1.000 ms em \"Timeout das chamadas\". Simule.",
      tasks: ["Timeout das chamadas = 1.000 ms", "▶ Simular"],
      check: (b) =>
        all(
          [param(b, "pay", "callTimeoutMs") > 0 && param(b, "pay", "callTimeoutMs") <= 1500, "Ponha 1.000 ms em Timeout das chamadas da API de pagamentos."],
          [!!b.result, SIMULATE],
          [(metric(b, "pay")?.callTimeouts ?? 0) > 0, "Algumas chamadas deveriam estourar o timeout."],
        ),
      lesson: "O p99 caiu para menos de 1 s, mas ~5% dos pagamentos agora falham por timeout. O time decide tentar de novo.",
    },
    {
      type: "build",
      title: "Retry",
      body: "Coloque 2 retries na API de pagamentos. Simule e leia o diagnóstico.",
      tasks: ["Retries = 2", "▶ Simular", "Procure as chamadas processadas em dobro"],
      check: (b) =>
        all(
          [param(b, "pay", "retries") >= 1, "Coloque 2 retries na API de pagamentos."],
          [!flag(b, "pay", "idempotencyKey"), "Deixe a chave de idempotência desligada por enquanto."],
          [!!b.result, SIMULATE],
          [(b.result?.duplicateEffects ?? 0) > 0, "Deveria haver cobranças em dobro. Confira o timeout de 1.000 ms."],
        ),
      lesson:
        "Os erros sumiram, e apareceram centenas de cobranças em dobro em um minuto. Cada uma é um cliente pagando duas vezes e um estorno para o SAC fazer.",
    },
    {
      type: "choice",
      title: "Por que cobrou duas vezes?",
      body: "A API desistiu da primeira chamada e tentou de novo. Por que o cliente pagou duas vezes?",
      choices: [
        { text: "O gateway tem um bug", why: "Ele fez o que pediram: duas cobranças." },
        {
          text: "Timeout não quer dizer que falhou: a primeira chamada chegou e foi processada; só a resposta demorou",
          correct: true,
          why: "Isso. Do lado de quem chama, \"não respondeu\" e \"não processou\" parecem iguais.",
        },
        { text: "O retry deveria esperar mais", why: "Esperar mais diminui a chance, mas não elimina: a primeira chamada pode ainda estar na fila." },
      ],
      lesson: "Toda operação que muda estado e pode ser repetida (por retry, por clique duplo, por mensagem entregue duas vezes) precisa ser idempotente.",
    },
    {
      type: "build",
      title: "Chave de idempotência",
      body: "Ligue \"Mandar chave de idempotência\" na API de pagamentos. Cada pagamento leva um Idempotency-Key único, e o gateway devolve o resultado guardado quando a chave se repete. Simule.",
      tasks: ["Ligue Mandar chave de idempotência", "▶ Simular sem cobrança em dobro"],
      check: (b) =>
        all(
          [flag(b, "pay", "idempotencyKey"), "Ligue Mandar chave de idempotência na API de pagamentos."],
          [!!b.result, SIMULATE],
          [(b.result?.duplicateEffects ?? 1) === 0, "Ainda há cobranças em dobro."],
          [(b.result?.errorRate ?? 1) < 0.01, "Ainda há mais de 1% de erros."],
        ),
      lesson: "Zero cobranças em dobro e quase zero erro. O retry ficou seguro: a repetição vira uma consulta do resultado da primeira.",
    },
    {
      type: "choice",
      title: "Do seu lado",
      body: "O lojista também chama a sua API e também repete depois de timeout. Como a sua API reconhece a repetição?",
      choices: [
        { text: "Antes de inserir, procurar um pagamento igual (mesmo valor, mesmo cliente)", why: "Procurar e depois inserir são dois passos: duas repetições simultâneas passam juntas. E dois pagamentos iguais podem ser legítimos." },
        {
          text: "Gravar a Idempotency-Key numa coluna UNIQUE, na mesma transação do pagamento; se já existe, devolver a resposta guardada",
          correct: true,
          why: "Isso: o banco garante que só uma passa, mesmo com repetições ao mesmo tempo.",
        },
        { text: "Guardar a chave num cache em memória", why: "Cada instância tem o seu cache, e um restart apaga tudo." },
      ],
      lesson:
        "No laboratório de Concorrência, os cenários \"Mensagem duplicada: crédito em dobro\" e \"Correção: chave de idempotência (UNIQUE)\" mostram essa corrida passo a passo. A Stripe guarda as chaves por 24 horas.",
    },
    {
      type: "choice",
      title: "Qual retry é seguro?",
      body: "Sem chave de idempotência, em qual chamada o retry é seguro?",
      choices: [
        { text: "POST /pagamentos", why: "Cria uma cobrança nova a cada vez." },
        { text: "GET /pagamentos/123 (consultar o status)", correct: true, why: "Isso: ler duas vezes não muda nada. GET, PUT com o estado completo e DELETE são idempotentes por definição." },
        { text: "POST /saldo/somar", why: "Somar duas vezes é o mesmo problema da cobrança dupla." },
      ],
      lesson: "Regra prática: retry automático só em operação idempotente. Para criar algo, mande sempre uma chave gerada pelo cliente.",
    },
  ],
  talk: [
    "Timeout não é falha: a operação pode ter sido feita. Retry em operação que muda estado precisa de idempotência.",
    "Chave de idempotência gerada pelo cliente, gravada com UNIQUE na mesma transação; a repetição devolve a resposta original.",
    "Dinheiro em centavos inteiros ou decimal; estado do pagamento como máquina de estados, com conciliação diária com o gateway.",
  ],
  tech: ["Stripe Idempotency-Key", "Adyen / Mercado Pago (idempotency key)", "Postgres UNIQUE + ON CONFLICT", "Transactional outbox"],
  study: [
    { title: "Designing robust and predictable APIs with idempotency", by: "Stripe", url: "https://stripe.com/blog/idempotency" },
    { title: "Making retries safe with idempotent APIs", by: "Amazon Builders' Library", url: "https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/" },
    { title: "System Design Interview, vol. 2, cap. 11: Payment system", by: "Alex Xu e Sahn Lam" },
    yt("voeWcHeYzLI", "Dual Write e Transactional Outbox"),
  ],
};
