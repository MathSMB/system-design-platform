import { PRESETS, type Graph } from "@sdp/sim-engine";
import { DEFAULT_PARAMS } from "@/components/canvas/defaults";
import { all, clientPeakRps, count, linked, metricsOf, ofKind, reaches, SIMULATE } from "./checks";
import { yt } from "./graph";
import { BROKER_CASE, CQRS_CASE, LB_CASE, MICRO_CASE, N_PLUS_ONE_CASE, PASSWORD_CASE, QUEUE_CASE, RETRY_CASE } from "./study-sd";
import type { GuidedCase } from "./types";

const onlyUsers = (params: Record<string, unknown> = {}): Graph =>
  ({
    nodes: [{ id: "users", kind: "client", label: "Usuários", params: { ...DEFAULT_PARAMS.client, ...params } }],
    edges: [],
  }) as unknown as Graph;

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Cases guiados: o mentor conduz a entrevista no roteiro do Renato Augusto
 * (requisitos → estimativas → desenho incremental → gargalos → trade-offs) e ensina em cada etapa.
 */
const BASE: GuidedCase[] = [
  {
    id: "zero-a-um-milhao",
    title: "De 0 a 1 milhão de usuários",
    summary: "Comece com um servidor, ache o gargalo, escale na horizontal e proteja o banco com cache.",
    level: "básico",
    video: { id: "9g7twJrXqoY", title: "Escalando do zero a 1 milhão de usuários" },
    story:
      "Um app de receitas viralizou: em semanas foi de alguns milhares para 1 milhão de usuários ativos por dia. Ele ainda roda num servidor só, ligado a um Postgres. O CTO quer saber o que muda no desenho antes da campanha de marketing do mês que vem.",
    start: onlyUsers(),
    steps: [
      {
        type: "choice",
        title: "Antes de desenhar",
        body: "O entrevistador diz: \"Projete um sistema para 1 milhão de usuários\". Qual é a sua primeira pergunta?",
        choices: [
          { text: "Qual banco de dados vocês usam?", why: "Banco é escolhido depois, pelos requisitos. Perguntar isso primeiro é desenhar antes de entender." },
          {
            text: "Quantas requisições cada usuário faz por dia, e qual é o pico?",
            correct: true,
            why: "Isso. Requisito não funcional vira número, e o número decide o desenho.",
          },
          { text: "Pode ser em microsserviços?", why: "Arquitetura é consequência. Sem saber a carga, não dá para justificar nada." },
        ],
        lesson:
          "Roteiro do Renato: (1) requisitos funcionais e não funcionais, perguntando; (2) estimativas; (3) banco; (4) desenho incremental; (5) trade-offs. \"A gente não trabalha com chute.\"",
      },
      {
        type: "number",
        title: "Estimativa: pico de requisições",
        body: "Resposta do entrevistador: 1 milhão de usuários ativos por dia, 20 requisições por usuário por dia, e no horário de pico o tráfego é 5× a média. Quantas requisições por segundo no pico?",
        answer: (1_000_000 * 20 * 5) / 86_400,
        tolerance: 0.12,
        unit: "req/s",
        lesson:
          "1.000.000 × 20 = 20 milhões por dia. Um dia tem 86.400 s, então a média é ≈ 231 req/s. No pico, × 5 ≈ 1.157 req/s. Dica de entrevista: arredonde o dia para 100 mil segundos (≈ 200 req/s de média) e siga.",
      },
      {
        type: "build",
        title: "O desenho mais simples",
      solution: "Na paleta, clique em Servidor e em Banco de dados. Depois arraste da bolinha da direita do nó Usuários até o Servidor, e da bolinha do Servidor até o Banco. O desenho fica Usuários → Servidor → Banco. Por fim, clique em Simular.",
        body: "Comece simples, como o Renato faz: um servidor e um banco. O nó Usuários já está no canvas com esses números.",
        tasks: ["Adicione um Servidor e um Banco de dados", "Conecte Usuários → Servidor → Banco (arraste da bolinha da direita)", "Clique em ▶ Simular"],
        check: (b) =>
          all(
            [count(b, "server") >= 1, "Falta um Servidor."],
            [count(b, "database") >= 1, "Falta um Banco de dados."],
            [reaches(b, "server") && reaches(b, "database"), "Conecte Usuários → Servidor → Banco."],
            [!!b.result, SIMULATE],
          ),
        lesson:
          "Funciona, mas o servidor já trabalha perto de 80% no pico e é um ponto único de falha: se ele cair, cai tudo. Repare no anel pulsando: quanto mais ocupado, mais rápido ele bate.",
      },
      {
        type: "choice",
        title: "A campanha de marketing",
        body: "O marketing vai fazer uma campanha e o pico dobra. O servidor aguenta 32 requisições ao mesmo tempo, cada uma levando 20 ms: são 1.600 req/s no máximo. O que acontece quando chegam mais do que isso?",
        choices: [
          { text: "Fica mais lento, mas atende todo mundo", why: "Só se a sobrecarga for curta. Se a chegada fica acima da capacidade, a fila cresce sem parar." },
          {
            text: "A fila cresce sem limite, a latência explode e ele começa a rejeitar",
            correct: true,
            why: "Isso. Com utilização ≥ 100%, a fila não tem como esvaziar.",
          },
          { text: "O banco cai antes do servidor", why: "O banco aguenta ~3.300 req/s (50 conexões ÷ 15 ms). O servidor satura primeiro." },
        ],
        lesson: "Teoria de filas: se a taxa de chegada passa da capacidade (ρ > 1), a fila cresce até encher e o sistema rejeita. Perto de 100% a latência já dispara.",
      },
      {
        type: "build",
        title: "Veja o servidor pegar fogo",
        body: "Clique no nó Usuários e mude o \"Fator de pico\" de 5 para 10. Depois simule.",
        tasks: ["Fator de pico dos Usuários = 10", "▶ Simular"],
        check: (b) =>
          all(
            [Number(ofKind(b, "client")[0]?.data.params.peakFactor ?? 0) >= 10, "Mude o Fator de pico dos Usuários para 10."],
            [!!b.result, SIMULATE],
            [metricsOf(b, "server").some((m) => m.status === "bad" || m.status === "down"), "Com um servidor só, ele deveria virar gargalo. Confira se ainda há só um servidor."],
          ),
        lesson: "O servidor chegou a 100%, pegou fogo e as requisições perdidas sobem dele (o \"dano\"). As setinhas vermelhas são requisições barradas.",
      },
      {
        type: "build",
        title: "Escala horizontal",
      solution: "Usuários → Load balancer → três Servidores → Banco. Apague a conexão antiga Usuários → Servidor (clique nela e aperte Delete). Ligue o Load balancer a cada um dos três servidores e cada servidor ao Banco. Com o pico em ~2.300 req/s, três servidores de 1.600 req/s cada somam 4.800 e sobram para perder um.",
        body: "Em vez de um servidor maior (escala vertical, que tem teto e continua sendo ponto único de falha), coloque vários iguais atrás de um load balancer.",
        tasks: ["Adicione um Load balancer entre Usuários e os servidores", "Tenha pelo menos 3 Servidores ligados ao LB e ao Banco", "▶ Simular com erros abaixo de 1%"],
        check: (b) =>
          all(
            [count(b, "loadBalancer") >= 1, "Falta o Load balancer."],
            [linked(b, "client", "loadBalancer"), "Ligue Usuários → Load balancer."],
            [count(b, "server") >= 3, "Use pelo menos 3 Servidores."],
            [b.edges.filter((e) => ofKind(b, "loadBalancer").some((n) => n.id === e.source)).length >= 3, "Ligue o Load balancer a cada servidor."],
            [linked(b, "server", "database") || linked(b, "server", "cache"), "Ligue os servidores ao Banco."],
            [!!b.result, SIMULATE],
            [(b.result?.errorRate ?? 1) < 0.01, "Ainda há mais de 1% de erros. Mais servidores ou mais workers?"],
          ),
        lesson:
          "Servidores stateless atrás de um LB: dá para somar máquinas e perder uma sem derrubar o sistema. Mas olhe o banco: ele ficou amarelo, é o próximo gargalo e continua sendo um só.",
      },
      {
        type: "build",
        title: "Derrube um servidor",
        body: "Clique em um dos servidores, marque \"Derrubar no segundo\" e simule. O LB precisa tirar o servidor caído da rotação.",
        tasks: ["Programe a queda de um Servidor", "▶ Simular"],
        check: (b) =>
          all(
            [b.failures.some((f) => ofKind(b, "server").some((n) => n.id === f.nodeId)), "Selecione um Servidor e marque \"Derrubar no segundo\"."],
            [!!b.result, SIMULATE],
          ),
        lesson:
          "O servidor caiu (OFFLINE), e os outros absorveram a carga dele. É por isso que se dimensiona com folga: com N servidores, a conta tem que fechar com N − 1. Desmarque a queda antes de seguir.",
      },
      {
        type: "choice",
        title: "O banco é o próximo gargalo",
        body: "O banco está em ~75% de utilização, e é quase tudo leitura. Qual é o próximo passo mais barato?",
        choices: [
          { text: "Sharding do banco", why: "Sharding é o último recurso: complica consultas, transações e operação. Tem coisa mais barata antes." },
          { text: "Cache na frente do banco", correct: true, why: "Isso. Leitura repetida sai da memória e nem chega no banco." },
          { text: "Trocar para um banco NoSQL", why: "Trocar de banco não resolve leitura repetida e cria um projeto de migração." },
        ],
        lesson: "A ordem do Renato: índice → otimizar a query → cache → réplica de leitura → escala vertical → só então sharding. Esgote as técnicas baratas antes.",
      },
      {
        type: "build",
        title: "Cache na frente do banco",
      solution: "Cada servidor liga só no Cache, e o Cache liga no Banco: Servidor → Cache → Banco. Apague as setas Servidor → Banco (clique na seta e aperte Delete); se ficarem, cada requisição vai ao cache e ao banco.",
        body: "Adicione um Cache (cache-aside, 90% de hit rate). Os servidores consultam o cache e só os misses vão ao banco.",
        tasks: ["Adicione um Cache", "Servidores → Cache → Banco (apague as conexões Servidor → Banco)", "Desmarque a queda do servidor, se ainda estiver marcada", "▶ Simular"],
        check: (b) => {
          const before = b.before?.nodes.filter((n) => n.kind === "database").reduce((m, n) => Math.max(m, n.utilization), 0);
          const now = metricsOf(b, "database").reduce((m, n) => Math.max(m, n.utilization), 0);
          return all(
            [count(b, "cache") >= 1, "Falta o Cache."],
            [linked(b, "server", "cache"), "Ligue os servidores ao Cache."],
            [linked(b, "cache", "database"), "Ligue o Cache ao Banco (por onde passam os misses)."],
            [
              !linked(b, "server", "database"),
              "Os servidores ainda estão ligados direto no Banco, então cada requisição vai aos dois. Clique na conexão Servidor → Banco e aperte Delete.",
            ],
            [!!b.result, SIMULATE],
            [now < 0.5, `O banco ainda está em ${pct(now)}. Ele deveria cair bastante com o cache.${before ? ` Antes estava em ${pct(before)}.` : ""}`],
          );
        },
        lesson:
          "Com 90% de hit rate, só 1 em cada 10 leituras chega ao banco. Escritas passam direto. O banco sai do amarelo e você ganha folga para crescer.",
      },
      {
        type: "open",
        title: "Trade-offs",
        body: "Fechamento da entrevista: o que esse desenho ainda NÃO resolve? Pense em pontos únicos de falha e em consistência.",
        reference:
          "Pontos que valem citar: o banco continua sendo ponto único de falha (faltam réplica e failover); o cache pode devolver dado velho até o TTL expirar; se o cache cair, todo o tráfego cai no banco de uma vez (avalanche — é o próximo case); o próprio LB precisa de redundância. Com 10× mais carga: réplicas de leitura, e só depois sharding.",
      },
    ],
    talk: [
      "Antes de desenhar, transformo requisito em número: usuários por dia, requisições por usuário e pico, e daí as requisições por segundo.",
      "Começo simples e escalo pelo gargalo: servidores stateless atrás de um LB, e o banco protegido por cache antes de pensar em sharding.",
      "Dimensiono com N − 1: o sistema tem que aguentar perder uma máquina no pico.",
    ],
    tech: ["NGINX / HAProxy", "AWS ALB", "Redis", "PostgreSQL", "Kubernetes"],
    study: [
      yt("9g7twJrXqoY", "Escalando do zero a 1 milhão de usuários"),
      { title: "System Design Interview, vol. 1, cap. 1: Scale from zero to millions of users", by: "Alex Xu" },
      { title: "The System Design Primer", by: "Donne Martin", url: "https://github.com/donnemartin/system-design-primer" },
    ],
  },
  {
    id: "avalanche-de-cache",
    title: "Cache-aside: hit rate e avalanche",
    summary: "Entenda o efeito do hit rate no banco e o que acontece quando o cache cai.",
    level: "intermediário",
    video: { id: "vRO0UfvsbDw", title: "Cache-Aside" },
    story:
      "O sistema do case anterior vai bem: LB, 3 servidores, Redis com 90% de hit rate e um Postgres folgado. Numa madrugada, o Redis reinicia por falta de memória e, em segundos, o Postgres vai a 100% e o site sai do ar. Ninguém mexeu no banco.",
    start: PRESETS.withCache!.graph,
    steps: [
      {
        type: "info",
        title: "O cenário",
        body: "Este é o sistema do case anterior: LB, 3 servidores, Redis com 90% de hit rate e Postgres. Rode uma simulação para ver o ponto de partida.",
      },
      {
        type: "choice",
        title: "90% ou 99%?",
        body: "Se o hit rate do cache sobe de 90% para 99%, as leituras que chegam ao banco caem quanto?",
        choices: [
          { text: "Uns 9%, a diferença entre 90 e 99", why: "Olhe para os misses, não para os hits: 10% viram 1%." },
          { text: "Cerca de 10 vezes", correct: true, why: "Isso. Os misses vão de 10% para 1%." },
          { text: "Metade", why: "A conta é sobre os misses: 10% → 1% é dividir por 10." },
        ],
        lesson: "O banco só vê os misses. Pequenas melhoras no hit rate perto de 100% têm efeito enorme no banco.",
      },
      {
        type: "build",
        title: "Suba o hit rate",
        body: "Clique no Redis, mude o Hit rate para 0.99 e simule. Compare a ocupação do Postgres.",
        tasks: ["Hit rate do Redis = 0.99", "▶ Simular"],
        check: (b) =>
          all(
            [Number(ofKind(b, "cache")[0]?.data.params.hitRate ?? 0) >= 0.99, "Mude o Hit rate do Redis para 0.99."],
            [!!b.result, SIMULATE],
          ),
        lesson: "O Postgres praticamente desocupou. Na vida real, hit rate alto depende de memória suficiente e de TTL bem escolhido.",
      },
      {
        type: "build",
        title: "Derrube o Redis",
        body: "Volte o hit rate para 0.9, selecione o Redis, marque \"Derrubar no segundo\" e simule.",
        tasks: ["Hit rate do Redis = 0.9", "Programe a queda do Redis", "▶ Simular"],
        check: (b) =>
          all(
            [Number(ofKind(b, "cache")[0]?.data.params.hitRate ?? 0) <= 0.9, "Volte o Hit rate do Redis para 0.9."],
            [b.failures.some((f) => ofKind(b, "cache").some((n) => n.id === f.nodeId)), "Marque \"Derrubar no segundo\" no Redis."],
            [!!b.result, SIMULATE],
          ),
        lesson:
          "Avalanche de cache: sem o Redis, 100% das leituras vão ao Postgres, que foi dimensionado para receber só os misses. Ele pega fogo e rejeita dezenas de milhares de requisições.",
      },
      {
        type: "choice",
        title: "Como proteger o banco?",
        body: "Qual combinação evita que a queda do cache derrube o sistema?",
        choices: [
          { text: "Aumentar o TTL das chaves", why: "TTL não ajuda: o cache caiu, não tem chave nenhuma." },
          {
            text: "Cache redundante (réplica ou cluster) e limitar o que chega ao banco (rate limit ou circuit breaker)",
            correct: true,
            why: "Isso. Redundância evita a queda; limitar a carga protege o banco se ela acontecer.",
          },
          { text: "Aumentar o timeout dos usuários", why: "Timeout maior só segura mais requisições presas, piorando a fila." },
        ],
        lesson:
          "Também ajuda aquecer o cache antes de liberar o tráfego e dimensionar o banco para aguentar parte das leituras sem cache. Primo da avalanche: o cache stampede, quando uma chave quente expira e milhares de pedidos vão juntos ao banco (correção: single-flight ou TTL com jitter).",
      },
      {
        type: "open",
        title: "Valor velho no cache",
        body: "No cache-aside, o app lê do cache e, no miss, lê do banco e grava no cache. Quando alguém atualiza o dado, o que você faz com o cache, e qual corrida pode acontecer?",
        reference:
          "O padrão é gravar no banco e apagar a chave do cache (não atualizar). Mesmo assim existe a corrida do \"stale set\": um leitor lê o valor antigo do banco, o escritor grava e apaga a chave, e o leitor grava o valor antigo no cache. Mitigações: TTL curto como rede de segurança, apagar de novo com atraso, ou versionar o valor. Dá para ver essa corrida passo a passo no laboratório de Concorrência (\"Cache-aside: cache com valor velho\").",
      },
    ],
    talk: [
      "No cache-aside o banco só vê os misses: subir o hit rate de 90% para 99% divide por 10 a carga no banco.",
      "Se o cache cai, o banco recebe tudo de uma vez (avalanche): cache redundante, rate limit ou circuit breaker na frente do banco, e aquecer antes de liberar tráfego.",
      "Na escrita, gravo no banco e apago a chave; TTL é a rede de segurança para valor velho.",
    ],
    tech: ["Redis (Sentinel / Cluster)", "Memcached", "Amazon ElastiCache", "Valkey"],
    study: [
      yt("vRO0UfvsbDw", "Cache-Aside"),
      { title: "Padrão Cache-Aside", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/patterns/cache-aside" },
      { title: "Scaling Memcache at Facebook", by: "Nishtala et al. (NSDI 2013)", note: "Leases contra stampede e valor velho." },
    ],
  },
  {
    id: "replicas-de-leitura",
    title: "Réplicas de leitura e o post que sumiu",
    summary: "Escale leituras com réplicas e resolva o usuário que não vê a própria escrita.",
    level: "intermediário",
    video: { id: "bhw4-Kq_RPs", title: "Como escolher o banco (CAP e PACELC)" },
    story:
      "Uma rede social adicionou réplicas de leitura para aguentar o crescimento, e a carga do banco ficou ótima. Mas o suporte começou a receber reclamações: \"publiquei e o post sumiu\", \"mudei a foto e voltou a antiga\". Ao recarregar a página uns segundos depois, aparece.",
    start: PRESETS.readReplicas!.graph,
    steps: [
      {
        type: "choice",
        title: "O que a réplica escala?",
        body: "Num banco com 1 primário e 3 réplicas de leitura (replicação assíncrona), o que melhora?",
        choices: [
          { text: "Leituras e escritas", why: "Toda escrita ainda vai ao primário, e cada réplica também precisa aplicar todas as escritas." },
          { text: "Só as leituras", correct: true, why: "Isso. As leituras se dividem entre as réplicas; as escritas continuam num só lugar." },
          { text: "Só as escritas", why: "É o contrário: réplica serve leitura." },
        ],
        lesson: "Se o gargalo for escrita, réplica não resolve: aí entram lote, fila e, por último, sharding.",
      },
      {
        type: "build",
        title: "Rode e procure o problema",
        body: "Este desenho já tem 3 réplicas com 200 ms de atraso de replicação, e os usuários releem a página 100 ms depois de postar. Simule.",
        tasks: ["▶ Simular"],
        check: (b) => all([!!b.result, SIMULATE], [(b.result?.consistency.staleReads ?? 0) > 0, "Deveria aparecer leitura com dado velho. Confira o atraso da replicação no banco."]),
        lesson:
          "Dezenas de milhares de leituras voltaram sem a escrita do próprio usuário: ele posta, recarrega e o post não está lá. A réplica ainda não recebeu a escrita (replication lag).",
      },
      {
        type: "choice",
        title: "Como corrigir?",
        body: "O usuário precisa ver o que ele mesmo acabou de escrever. Qual correção?",
        choices: [
          { text: "Mais réplicas", why: "Mais réplicas não diminuem o atraso de cada uma." },
          {
            text: "Read-your-writes: ler do primário por alguns segundos depois que o usuário escreve",
            correct: true,
            why: "Isso. Só quem acabou de escrever vai ao primário, e o resto continua nas réplicas.",
          },
          { text: "Cache na frente das réplicas", why: "O cache pode guardar o valor velho e piorar o problema." },
        ],
        lesson: "Outras opções: fixar a sessão no primário, ou esperar a réplica alcançar a posição do WAL (LSN) da escrita do usuário.",
      },
      {
        type: "build",
        title: "Ligue o read-your-writes",
        body: "Clique no Postgres e coloque \"Ler do primário após escrever\" em 1000 ms. Simule de novo.",
        tasks: ["Ler do primário após escrever = 1000 ms", "▶ Simular"],
        check: (b) =>
          all(
            [Number(ofKind(b, "database")[0]?.data.params.readYourWritesMs ?? 0) >= 300, "Coloque pelo menos 1000 ms em \"Ler do primário após escrever\"."],
            [!!b.result, SIMULATE],
            [(b.result?.consistency.staleReads ?? 1) === 0, "Ainda há leitura velha. A janela precisa ser maior que o atraso da réplica."],
          ),
        lesson:
          "Zero leitura velha. O custo: o primário passou a receber mais leituras (repare na ocupação). A janela precisa cobrir o lag, e o lag cresce quando o primário está sobrecarregado.",
      },
      {
        type: "open",
        title: "CAP e PACELC",
        body: "Por que não usar replicação síncrona e acabar de vez com a leitura velha?",
        reference:
          "Replicação síncrona faz o commit esperar a réplica confirmar: toda escrita fica mais lenta (é o \"E → L ou C\" do PACELC: sem partição, você escolhe latência ou consistência). E, se a réplica ou a rede cair, as escritas travam (no CAP, com partição, você escolhe consistência ou disponibilidade). Por isso o comum é assíncrono com read-your-writes onde importa.",
      },
    ],
    talk: [
      "Réplica escala leitura; escrita continua no primário.",
      "Com replicação assíncrona existe replication lag: quem acabou de escrever pode ler da réplica e não ver a própria escrita.",
      "Read-your-writes: depois de escrever, o usuário lê do primário por uma janela maior que o lag (ou espera a réplica alcançar a posição do WAL).",
    ],
    tech: ["PostgreSQL streaming replication", "Amazon Aurora replicas", "MySQL replication", "ProxySQL / pgpool"],
    study: [
      yt("bhw4-Kq_RPs", "Como escolher o banco (CAP e PACELC)"),
      { title: "Designing Data-Intensive Applications, cap. 5: Replication", by: "Martin Kleppmann", note: "Seção \"Reading Your Own Writes\"." },
    ],
  },
  {
    id: "encurtador-de-url",
    title: "Encurtador de URL",
    summary: "Estimativas de entrevista, tamanho do código curto e um desenho que aguenta 11 mil leituras por segundo.",
    level: "avançado",
    video: { id: "m_anIoKW7Jg", title: "Encurtador de URL" },
    story:
      "Você está na entrevista e o enunciado é curto: \"Projete um encurtador de URL, como o bit.ly\". O entrevistador espera que você conduza: perguntas, contas, escolha do código curto, desenho e trade-offs.",
    start: onlyUsers({ dailyActiveUsers: 10_000_000, requestsPerUserPerDay: 100, peakFactor: 1, writeRatio: 0.1 }),
    steps: [
      {
        type: "number",
        title: "Escritas por segundo",
        body: "Requisito: 100 milhões de URLs novas por dia. Quantas escritas por segundo, em média?",
        answer: 100_000_000 / 86_400,
        tolerance: 0.1,
        unit: "escritas/s",
        lesson: "100.000.000 ÷ 86.400 ≈ 1.157 escritas/s (o Renato arredonda para 1.160).",
      },
      {
        type: "number",
        title: "Leituras por segundo",
        body: "Para cada URL criada, há 10 acessos (leitura:escrita = 10:1). Quantas leituras por segundo?",
        answer: (100_000_000 / 86_400) * 10,
        tolerance: 0.1,
        unit: "leituras/s",
        lesson: "≈ 11.574 leituras/s. Sistema de leitura pesada: cache vai ser peça central.",
      },
      {
        type: "number",
        title: "Armazenamento em 10 anos",
        body: "Cada registro (código, URL longa, datas) ocupa ~100 bytes. Quantos terabytes em 10 anos?",
        answer: (100_000_000 * 365 * 10 * 100) / 1e12,
        tolerance: 0.1,
        unit: "TB",
        lesson: "100 milhões × 365 × 10 = 365 bilhões de registros × 100 bytes ≈ 36,5 TB.",
      },
      {
        type: "choice",
        title: "Tamanho do código curto",
        body: "Usando base62 (a–z, A–Z, 0–9), quantos caracteres o código precisa para 365 bilhões de URLs?",
        choices: [
          { text: "6 caracteres", why: "62⁶ ≈ 56,8 bilhões: não cabe 365 bilhões." },
          { text: "7 caracteres", correct: true, why: "62⁷ ≈ 3,52 trilhões: cabe com folga." },
          { text: "10 caracteres", why: "Cabe, mas desperdiça: o objetivo é ser curto." },
        ],
        lesson:
          "Para gerar o código sem colisão: contador distribuído com faixas de IDs por servidor, convertido para base62. Cuidado com INCR no Redis com failover assíncrono: o primário responde e cai antes de replicar, e o ID se repete.",
      },
      {
        type: "choice",
        title: "301 ou 302?",
        body: "O redirecionamento deve responder 301 (permanente) ou 302 (temporário)?",
        choices: [
          { text: "301, sempre", why: "O navegador guarda o 301 e não volta ao servidor: menos carga, mas você perde a contagem de cliques." },
          { text: "302, sempre", why: "Funciona, mas cada clique volta ao servidor, mesmo quando você não precisa de analytics." },
          { text: "Depende: 302 se precisa contar cliques, 301 se quer aliviar o servidor", correct: true, why: "Isso. É um trade-off, e a resposta certa é explicá-lo." },
        ],
        lesson: "Em entrevista, \"depende\" só vale com o critério: aqui, analytics contra carga.",
      },
      {
        type: "build",
        title: "Monte e aguente a carga",
      solution: "Usuários → Load balancer → Servidores → Cache → Banco. A conta: 11.600 req/s ÷ 1.600 req/s por servidor padrão dá pelo menos 8 servidores; uma alternativa mais rápida de montar é usar 3 ou 4 servidores e aumentar os workers de cada um (por exemplo, 128 workers aguentam ~6.400 req/s). Com 90% de hit rate, o banco recebe só os misses e as escritas. Se o Cache ou o Banco ficarem vermelhos, aumente os workers deles.",
        body: "Os Usuários já estão configurados com ~11.600 req/s (10 milhões × 100 por dia, fator de pico 1; 10% são escritas). Monte o resto e cumpra o SLO.",
        tasks: [
          "Load balancer, servidores, cache e banco",
          "▶ Simular com erros < 1% e p99 < 200 ms",
        ],
        check: (b) => {
          const rps = clientPeakRps(b);
          return all(
            [rps >= 11_000, `Os Usuários estão gerando ${Math.round(rps).toLocaleString("pt-BR")} req/s no pico. Coloque 10.000.000 DAU e 100 requisições por dia.`],
            [count(b, "cache") >= 1 && linked(b, "cache", "database"), "Num sistema 10:1 de leitura, coloque um Cache na frente do Banco."],
            [count(b, "loadBalancer") >= 1, "Falta o Load balancer."],
            [!!b.result, SIMULATE],
            [(b.result?.errorRate ?? 1) < 0.01, "Erros acima de 1%. Procure o nó pegando fogo e dê mais capacidade a ele."],
            [(b.result?.latency.p99Ms ?? 1e9) < 200, "p99 acima de 200 ms. Algum componente está com fila: mais workers ou mais instâncias."],
          );
        },
        lesson:
          "Fechou o SLO. Conta rápida para conferir: cada servidor padrão aguenta 32 ÷ 0,02 s = 1.600 req/s, então 11.600 req/s pedem pelo menos 8 servidores (mais folga para perder um).",
      },
      {
        type: "open",
        title: "Escolha do banco",
        body: "SQL ou NoSQL para guardar código → URL longa? Justifique pelos atributos, não pela moda.",
        reference:
          "O acesso é quase só chave → valor, com 1.160 escritas/s e 36,5 TB em 10 anos. Um key-value ou wide-column (DynamoDB, Cassandra) escala isso horizontalmente sem esforço. Um Postgres também aguenta as escritas, mas 36 TB pedem particionamento e, no fim, sharding. Qualquer escolha vale se você justificar: padrão de acesso, volume e consistência necessária (o código precisa ser único, o resto tolera consistência eventual).",
      },
    ],
    talk: [
      "Faço as contas antes: ~1.160 escritas/s, ~11.600 leituras/s e ~36,5 TB em 10 anos; é um sistema de leitura pesada.",
      "Código de 7 caracteres em base62 (62⁷ ≈ 3,5 trilhões), gerado por faixas de IDs por servidor para não colidir.",
      "Cache na frente do banco para os links quentes; 302 se precisa contar cliques, 301 se quer aliviar o servidor.",
    ],
    tech: ["Redis", "DynamoDB / Cassandra", "PostgreSQL", "CDN", "Snowflake ID"],
    study: [
      yt("m_anIoKW7Jg", "Encurtador de URL"),
      { title: "System Design Interview, vol. 1, cap. 8: Design a URL shortener", by: "Alex Xu" },
    ],
  },
];

const byId = (id: string) => BASE.find((c) => c.id === id)!;

/** Aulas de System Design, na ordem da trilha. */
export const CASES: GuidedCase[] = [
  byId("zero-a-um-milhao"),
  LB_CASE,
  byId("avalanche-de-cache"),
  N_PLUS_ONE_CASE,
  byId("replicas-de-leitura"),
  CQRS_CASE,
  QUEUE_CASE,
  MICRO_CASE,
  BROKER_CASE,
  RETRY_CASE,
  PASSWORD_CASE,
  byId("encurtador-de-url"),
];

export const getCase = (id: string) => CASES.find((c) => c.id === id);
