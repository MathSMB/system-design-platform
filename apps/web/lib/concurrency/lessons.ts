import { yt } from "@/lib/training/graph";
import type { Choice, Ref } from "@/lib/training/types";

/** Um momento do roteiro: o mentor fala, pergunta, ou pede um clique. */
export interface Beat {
  say: string;
  /** Pergunta antes do próximo clique (a pessoa prevê o que vai acontecer). */
  ask?: { q: string; choices: Choice[] };
  /** Transação que deve avançar agora (índice). Sem isso, o botão é "Continuar". */
  press?: number;
}

export interface RacePart {
  scenario: string;
  beats: Beat[];
}

export interface RaceLesson {
  id: string;
  title: string;
  summary: string;
  level: "básico" | "intermediário" | "avançado";
  /** A história: quem sofre com o bug. */
  story: string;
  /** A regra de negócio que não pode quebrar, em uma frase. */
  rule: string;
  /** Explicação do conceito central, em linguagem simples. */
  concept?: { title: string; body: string };
  /** Parte 1 (o bug ou a técnica) e, se houver, parte 2 (a correção). */
  parts: RacePart[];
  talk: string[];
  tech?: string[];
  study?: Ref[];
}

const c = (text: string, why: string, correct = false): Choice => ({ text, why, correct });
const A = 0;
const B = 1;

const LOCK_PESSIMISTA = {
  title: "Lock pessimista",
  body: "\"Vou mexer nisso, então ninguém mexe até eu terminar.\" Antes de ler, a transação trava a linha (SELECT ... FOR UPDATE). Quem chegar depois espera na porta até o COMMIT. É pessimista porque assume que vai haver conflito e se protege antes.",
};
const LOCK_OTIMISTA = {
  title: "Lock otimista",
  body: "\"Provavelmente ninguém vai mexer ao mesmo tempo.\" Ninguém trava nada na leitura. Cada linha tem um número de versão; na hora de gravar, você diz: grave só se a versão ainda for a que eu li (UPDATE ... WHERE version = 1). Se alguém gravou antes, a versão mudou, nada é gravado e você recomeça.",
};

export const RACE_LESSONS: RaceLesson[] = [
  {
    id: "ultimo-ingresso",
    title: "O último ingresso: lost update",
    summary: "Dois compradores, um ingresso, e o código mais comum do mundo: ler, calcular, gravar.",
    level: "básico",
    story:
      "Show esgotando. Sobrou 1 ingresso e dois fãs clicam em \"comprar\" no mesmo instante. Cada clique vira uma requisição, atendida em paralelo por servidores diferentes. As duas rodam o mesmo código.",
    rule: "Nunca vender mais ingressos do que o estoque.",
    parts: [
      {
        scenario: "lost-update",
        beats: [
          { say: "Cada comprador faz três coisas: lê o estoque, grava estoque − 1 se for maior que zero, e registra a venda. Vamos andar um passo de cada vez, como o banco realmente executa." },
          { say: "O Comprador A lê o estoque. Clique em Avançar no Comprador A.", press: A },
          {
            say: "A leu 1 e guardou na memória (e = 1). Agora é a vez do B ler.",
            ask: {
              q: "O Comprador B vai ler o estoque agora. Que valor ele vê?",
              choices: [
                c("1, porque A ainda não gravou nada", "Isso. A só leu; o estoque continua 1.", true),
                c("0, porque A já está comprando", "A só leu. Intenção não muda o banco."),
                c("Nenhum: ele espera A terminar", "Um SELECT comum não trava nada no Read Committed (padrão do Postgres)."),
              ],
            },
            press: B,
          },
          { say: "Os dois têm e = 1 na memória. A grava 1 − 1 = 0.", press: A },
          { say: "A registra a venda dele.", press: A },
          {
            say: "Agora o B continua.",
            ask: {
              q: "B ainda tem e = 1 na memória. O que ele faz?",
              choices: [
                c("Grava 0 de novo (1 − 1) e registra outra venda", "Isso. Ele decide com o valor que leu, que já está velho.", true),
                c("Percebe que o estoque é 0 e desiste", "Ele não lê de novo: confia no e = 1 da memória."),
                c("Grava −1", "Ele calcula a partir do que leu (1), não do valor atual."),
              ],
            },
            press: B,
          },
          { say: "B registra a venda.", press: B },
          { say: "Duas vendas, estoque 0. A gravação de A foi sobrescrita por uma igual, e a segunda venda não baixou nada: é o lost update. Agora teste todas as ordens possíveis para ver quantas quebram." },
        ],
      },
    ],
    talk: [
      "Ler, calcular na aplicação e gravar é uma janela de corrida: entre a leitura e a escrita cabe outra transação.",
      "Read Committed (padrão do Postgres) não impede lost update; transação sozinha também não.",
      "As correções clássicas: UPDATE atômico com condição, lock pessimista (SELECT FOR UPDATE) ou lock otimista (coluna version).",
    ],
    tech: ["PostgreSQL", "MySQL (InnoDB)", "ORMs (JPA @Version, Prisma)"],
    study: [
      { title: "Designing Data-Intensive Applications, cap. 7: Transactions", by: "Martin Kleppmann", note: "Seção \"Preventing Lost Updates\"." },
      { title: "PostgreSQL: Transaction Isolation", by: "Documentação do PostgreSQL", url: "https://www.postgresql.org/docs/current/transaction-iso.html" },
    ],
  },
  {
    id: "lock-pessimista",
    title: "Lock pessimista: SELECT FOR UPDATE",
    summary: "Trave a linha antes de ler. Veja o segundo comprador esperando na porta.",
    level: "básico",
    story: "O mesmo último ingresso. Agora cada compra abre uma transação e trava a linha do estoque antes de ler.",
    rule: "Nunca vender mais ingressos do que o estoque.",
    concept: LOCK_PESSIMISTA,
    parts: [
      {
        scenario: "select-for-update",
        beats: [
          { say: "A abre a transação (BEGIN).", press: A },
          { say: "A trava a linha e lê: SELECT estoque FOR UPDATE. Repare no cadeado em \"Locks\", à direita.", press: A },
          { say: "B também abre a transação.", press: B },
          {
            say: "Repare no botão do B.",
            ask: {
              q: "B vai tentar SELECT estoque FOR UPDATE. O que acontece?",
              choices: [
                c("Fica esperando: a linha está travada por A", "Isso. O botão dele virou \"esperando\" e não dá para avançar.", true),
                c("Lê 1, como no bug", "FOR UPDATE pede o lock antes de ler; A está segurando."),
                c("Dá erro na hora", "No padrão, ele espera. Dá para pedir NOWAIT ou SKIP LOCKED, mas aí é outra escolha."),
              ],
            },
          },
          { say: "Enquanto B espera, A grava 0.", press: A },
          { say: "A faz COMMIT: grava de vez e solta o lock. Olhe o cadeado sumir.", press: A },
          { say: "A registra a venda.", press: A },
          {
            say: "O lock está livre.",
            ask: {
              q: "B finalmente trava a linha e lê. Que valor ele vê?",
              choices: [
                c("0, o valor que A confirmou", "Isso. Ele lê depois do COMMIT de A.", true),
                c("1, o valor de quando ele tentou", "O FOR UPDATE lê o valor atual quando consegue o lock."),
              ],
            },
            press: B,
          },
          { say: "Com estoque 0, a condição é falsa e B não grava.", press: B },
          { say: "B confirma.", press: B },
          { say: "E não registra venda.", press: B },
          { say: "Uma venda só. O preço: B ficou parado esperando. Com milhares de compradores, vira uma fila no banco, e se duas transações travam linhas em ordem diferente, pode dar deadlock (outra aula)." },
        ],
      },
    ],
    talk: [
      "Lock pessimista: trava a linha antes de ler (SELECT FOR UPDATE) e quem vem depois espera o COMMIT.",
      "Bom para disputa alta pela mesma linha; o custo é espera, transação longa segurando lock e risco de deadlock.",
      "Mantenha a transação curta e nunca espere chamada externa com a linha travada.",
    ],
    tech: ["PostgreSQL SELECT FOR UPDATE", "NOWAIT / SKIP LOCKED", "JPA LockModeType.PESSIMISTIC_WRITE"],
    study: [
      { title: "PostgreSQL: Explicit Locking", by: "Documentação do PostgreSQL", url: "https://www.postgresql.org/docs/current/explicit-locking.html" },
      { title: "Designing Data-Intensive Applications, cap. 7", by: "Martin Kleppmann" },
    ],
  },
  {
    id: "lock-otimista",
    title: "Lock otimista: coluna version",
    summary: "Ninguém trava nada; quem perde a corrida percebe pela versão e recomeça.",
    level: "básico",
    story: "O mesmo último ingresso, agora sem lock nenhum na leitura. A tabela ganhou uma coluna version.",
    rule: "Nunca vender mais ingressos do que o estoque.",
    concept: LOCK_OTIMISTA,
    parts: [
      {
        scenario: "optimistic",
        beats: [
          { say: "A lê o estoque e a versão: estoque 1, versão 1.", press: A },
          { say: "B lê a mesma coisa: estoque 1, versão 1. Ninguém travou nada.", press: B },
          {
            say: "A vai gravar com a condição WHERE version = 1.",
            ask: {
              q: "A versão ainda é 1?",
              choices: [c("Sim: ninguém gravou desde a leitura de A", "Isso. A grava 0 e a versão vira 2.", true), c("Não: B leu no meio", "Ler não muda a versão; só gravar muda.")],
            },
            press: A,
          },
          { say: "A registra a venda.", press: A },
          {
            say: "Agora B tenta gravar com WHERE version = 1.",
            ask: {
              q: "A versão agora é 2. O que acontece com o UPDATE de B?",
              choices: [
                c("Afeta 0 linhas: B percebe o conflito e recomeça do zero", "Isso. Nada é gravado e B volta ao início.", true),
                c("Grava 0 por cima, como no bug", "A condição WHERE version = 1 é falsa: nada é gravado."),
                c("Fica esperando A", "No otimista ninguém espera; quem perde recomeça."),
              ],
            },
            press: B,
          },
          { say: "B recomeçou: lê de novo, agora estoque 0 e versão 2.", press: B },
          { say: "Sem estoque, B não grava.", press: B },
          { say: "E não vende.", press: B },
          { say: "Uma venda, ninguém esperou lock. O custo aparece quando o conflito é frequente: muita gente recomeçando é trabalho jogado fora. Regra prática: conflito raro → otimista; disputa alta → pessimista ou UPDATE atômico." },
        ],
      },
    ],
    talk: [
      "Lock otimista: grava com WHERE version = <lida>; se afetar 0 linhas, alguém gravou antes e eu recomeço.",
      "Não segura lock durante a leitura, então combina com fluxo longo (ex.: formulário aberto por minutos).",
      "Com muita disputa pela mesma linha, os recomeços desperdiçam trabalho; aí pessimista ou UPDATE atômico.",
    ],
    tech: ["JPA @Version", "Entity Framework concurrency token", "DynamoDB condition expressions", "ETag / If-Match em APIs HTTP"],
    study: [
      { title: "Optimistic Offline Lock", by: "Martin Fowler (Patterns of Enterprise Application Architecture)", url: "https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html" },
      { title: "Designing Data-Intensive Applications, cap. 7", by: "Martin Kleppmann", note: "Compare-and-set." },
    ],
  },
  {
    id: "update-atomico",
    title: "UPDATE atômico: a correção mais simples",
    summary: "Deixe o banco conferir e gravar no mesmo comando.",
    level: "básico",
    story: "O último ingresso mais uma vez. Em vez de ler e calcular na aplicação, cada compra manda um UPDATE com a condição dentro.",
    rule: "Nunca vender mais ingressos do que o estoque.",
    parts: [
      {
        scenario: "atomic-update",
        beats: [
          { say: "O comando é: UPDATE ingressos SET estoque = estoque − 1 WHERE estoque − 1 >= 0. O banco lê, confere e grava de uma vez, travando a linha durante o comando." },
          { say: "A manda o UPDATE.", press: A },
          {
            say: "Agora B manda o mesmo UPDATE.",
            ask: {
              q: "Quantas linhas o UPDATE de B afeta?",
              choices: [
                c("0: a condição estoque − 1 >= 0 é falsa", "Isso. A aplicação olha \"linhas afetadas\" e sabe que não vendeu.", true),
                c("1: ele também baixa o estoque", "O banco confere a condição com o valor atual, que já é 0."),
              ],
            },
            press: B,
          },
          { say: "A registra a venda (afetou 1 linha).", press: A },
          { say: "B não registra (afetou 0).", press: B },
          { say: "Uma venda, sem transação explícita e sem recomeço. Quando a regra cabe numa condição do próprio UPDATE, esta é a melhor resposta." },
        ],
      },
    ],
    talk: [
      "Se a regra cabe numa condição, deixo o banco fazer: UPDATE ... SET estoque = estoque − 1 WHERE estoque > 0, e confiro as linhas afetadas.",
      "É atômico, curto e não precisa de transação explícita nem de retry.",
      "Quando a decisão depende de várias linhas, aí entram lock pessimista, otimista ou isolamento Serializable.",
    ],
    tech: ["PostgreSQL / MySQL UPDATE ... WHERE", "Redis DECR + checagem", "DynamoDB UpdateItem com ConditionExpression"],
    study: [{ title: "Designing Data-Intensive Applications, cap. 7", by: "Martin Kleppmann", note: "Atomic write operations." }],
  },
  {
    id: "write-skew",
    title: "Write skew: o plantão vazio",
    summary: "Cada um grava uma linha diferente, ninguém conflita, e a regra quebra mesmo assim.",
    level: "intermediário",
    story:
      "Hospital. Regra: sempre pelo menos um médico de plantão. Alice e Bob estão de plantão, os dois passam mal e pedem para sair no mesmo minuto. O sistema confere se há mais alguém e libera.",
    rule: "Pelo menos 1 médico de plantão.",
    parts: [
      {
        scenario: "write-skew",
        beats: [
          { say: "Alice abre a transação.", press: A },
          { say: "Alice lê a linha alice: de plantão (1).", press: A },
          { say: "Alice lê a linha bob: de plantão (1). Total 2, ela pode sair.", press: A },
          { say: "Bob abre a transação dele.", press: B },
          { say: "Bob lê alice: 1. A saída da Alice ainda não foi gravada.", press: B },
          { say: "Bob lê bob: 1. Total 2, ele também pode sair.", press: B },
          {
            say: "Os dois viram 2 de plantão.",
            ask: {
              q: "Alice grava a linha alice e Bob grava a linha bob. Um lock de linha impede o problema?",
              choices: [
                c("Não: cada um trava só a própria linha, não há conflito", "Isso. É o write skew: decisões com base numa leitura que o outro invalida.", true),
                c("Sim: o UPDATE trava a linha", "Trava a linha que cada um grava, e são linhas diferentes."),
              ],
            },
            press: A,
          },
          { say: "Alice confirma.", press: A },
          { say: "Bob grava a saída dele, decidida com a leitura de antes.", press: B },
          { say: "…e confirma.", press: B },
          { say: "Ninguém de plantão. Nem Snapshot Isolation (o Repeatable Read do Postgres) impede isso; só Serializable ou travar as linhas lidas. Vamos à correção." },
        ],
      },
      {
        scenario: "write-skew-locked",
        beats: [
          { say: "Agora cada um trava as linhas que leu (FOR UPDATE), sempre na mesma ordem: alice e depois bob. Alice abre a transação.", press: A },
          { say: "Alice trava alice.", press: A },
          { say: "Alice trava bob.", press: A },
          { say: "Bob abre a transação.", press: B },
          {
            say: "Olhe o botão do Bob.",
            ask: {
              q: "Bob tenta travar alice. O que acontece?",
              choices: [c("Espera: Alice segura o lock", "Isso.", true), c("Lê 2 de plantão", "Ele não consegue ler: precisa do lock primeiro.")],
            },
          },
          { say: "Alice sai do plantão…", press: A },
          { say: "…e confirma, soltando os locks.", press: A },
          { say: "Bob trava alice e lê 0.", press: B },
          { say: "Bob trava bob e lê 1.", press: B },
          { say: "Só 1 de plantão: Bob não sai.", press: B },
          { say: "Bob confirma.", press: B },
          { say: "A regra se manteve. Travar sempre na mesma ordem também evita deadlock (próxima aula)." },
        ],
      },
    ],
    talk: [
      "Write skew: duas transações leem o mesmo conjunto, decidem com base nele e gravam linhas diferentes; nenhum lock de linha conflita.",
      "Read Committed e Snapshot Isolation permitem; a correção é Serializable, ou travar as linhas lidas (FOR UPDATE) em ordem fixa, ou materializar o conflito numa linha só.",
      "Aparece em reservas, plantões, nomes de usuário únicos e limites de gasto.",
    ],
    tech: ["PostgreSQL SERIALIZABLE (SSI)", "SELECT FOR UPDATE", "Restrições UNIQUE / EXCLUDE"],
    study: [
      { title: "Designing Data-Intensive Applications, cap. 7: Write Skew and Phantoms", by: "Martin Kleppmann", note: "O exemplo do plantão médico vem daqui." },
      { title: "PostgreSQL: Serializable Isolation Level", by: "Documentação do PostgreSQL", url: "https://www.postgresql.org/docs/current/transaction-iso.html#XACT-SERIALIZABLE" },
    ],
  },
  {
    id: "deadlock",
    title: "Deadlock: cada um espera o outro",
    summary: "Dois locks pegos em ordem diferente travam as duas transações para sempre.",
    level: "intermediário",
    story: "O mesmo plantão, mas o código de Bob trava as linhas na ordem contrária: primeiro bob, depois alice.",
    rule: "As duas transações precisam terminar.",
    concept: LOCK_PESSIMISTA,
    parts: [
      {
        scenario: "deadlock",
        beats: [
          { say: "Alice abre a transação.", press: A },
          { say: "Alice trava alice.", press: A },
          { say: "Bob abre a transação.", press: B },
          { say: "Bob trava bob.", press: B },
          {
            say: "Agora Alice quer bob (com Bob) e Bob quer alice (com Alice).",
            ask: {
              q: "O que acontece?",
              choices: [
                c("Os dois esperam para sempre: deadlock", "Isso. Os dois botões ficaram em \"esperando\".", true),
                c("Quem chegou primeiro passa", "Cada um segura exatamente o que o outro precisa."),
                c("O banco junta as duas transações", "Não existe isso: ele precisa abortar uma."),
              ],
            },
          },
          { say: "Travou. Na vida real o Postgres detecta o ciclo (depois de deadlock_timeout, 1 s por padrão), aborta uma das transações com erro e a aplicação precisa tentar de novo. Prevenção: travar sempre na mesma ordem, como na correção do plantão." },
        ],
      },
    ],
    talk: [
      "Deadlock é ciclo de espera: cada transação segura um lock que a outra quer.",
      "O banco detecta e aborta uma; a aplicação precisa tratar o erro e tentar de novo.",
      "Prevenção: ordem fixa de locks (ex.: por id), transações curtas e travar tudo de uma vez quando possível.",
    ],
    tech: ["PostgreSQL deadlock_timeout", "lock_timeout", "MySQL InnoDB deadlock detection"],
    study: [{ title: "PostgreSQL: Deadlocks", by: "Documentação do PostgreSQL", url: "https://www.postgresql.org/docs/current/explicit-locking.html#LOCKING-DEADLOCKS" }],
  },
  {
    id: "cache-valor-velho",
    title: "Cache-aside: o preço velho que não sai",
    summary: "Leitor e escritor se cruzam e o cache fica com o valor antigo até o TTL.",
    level: "intermediário",
    story:
      "Uma loja muda o preço de um produto de R$ 100 para R$ 120. O banco já tem 120, mas alguns clientes continuam vendo 100 por muitos minutos. O código segue o manual: na escrita, grava no banco e apaga a chave do cache.",
    rule: "Depois da escrita, o cache não pode ficar com valor diferente do banco.",
    parts: [
      {
        scenario: "cache-aside-stale",
        beats: [
          { say: "O Leitor procura o preço no cache: miss.", press: A },
          { say: "O Leitor vai ao banco e lê 100.", press: A },
          { say: "Antes de o Leitor gravar no cache, o Escritor grava 120 no banco.", press: B },
          { say: "O Escritor apaga a chave do cache, como manda o cache-aside.", press: B },
          {
            say: "O Leitor ainda vai gravar o que leu.",
            ask: {
              q: "O Leitor tem 100 na memória e grava no cache. O que fica lá?",
              choices: [
                c("100: valor velho, até o TTL expirar", "Isso. O apagar do Escritor chegou antes do gravar do Leitor.", true),
                c("120: o cache sempre pega o último valor do banco", "O cache guarda o que mandarem gravar."),
                c("Nada: a chave foi apagada", "Foi apagada antes; o Leitor grava depois."),
              ],
            },
            press: A,
          },
          { say: "Cache com 100, banco com 120. É raro (a leitura precisa ser mais lenta que a escrita inteira), mas em escala acontece. Mitigações: TTL curto como rede de segurança, leases (Memcache do Facebook), apagar de novo com atraso, ou versionar o valor." },
        ],
      },
    ],
    talk: [
      "No cache-aside, escrevo no banco e apago a chave; mesmo assim existe a corrida do stale set.",
      "TTL é a rede de segurança; para dado sensível, leases ou versionamento do valor.",
      "Atualizar o cache na escrita (em vez de apagar) piora: duas escritas concorrentes podem deixar a mais antiga no cache.",
    ],
    tech: ["Redis", "Memcached (leases)", "TTL com jitter"],
    study: [
      { title: "Scaling Memcache at Facebook", by: "Nishtala et al. (NSDI 2013)", note: "Seção sobre leases contra stale sets." },
      yt("vRO0UfvsbDw", "Cache-Aside"),
    ],
  },
  {
    id: "mensagem-duplicada",
    title: "Mensagem duplicada: idempotência",
    summary: "A fila entrega duas vezes e o cliente recebe crédito em dobro. Corrija com chave de idempotência.",
    level: "intermediário",
    story:
      "Um gateway de pagamento avisa por mensagem: \"pagamento 42 aprovado, crédito de R$ 100\". O consumidor caiu antes de confirmar a mensagem (ack), e a fila entregou de novo. Agora dois consumidores processam a mesma mensagem ao mesmo tempo.",
    rule: "Cada pagamento credita exatamente uma vez.",
    parts: [
      {
        scenario: "mensagem-duplicada",
        beats: [
          { say: "Filas como Kafka, RabbitMQ e SQS entregam pelo menos uma vez (at-least-once): duplicata é normal, não bug da fila. O código confere se já processou, credita e marca." },
          { say: "Consumidor 1 confere: processado = 0.", press: A },
          {
            say: "Consumidor 2 confere também.",
            ask: {
              q: "O que o Consumidor 2 lê?",
              choices: [c("processado = 0", "Isso. Ninguém marcou ainda.", true), c("processado = 1", "O Consumidor 1 só conferiu; ainda não marcou.")],
            },
            press: B,
          },
          { say: "Consumidor 1 credita R$ 100.", press: A },
          { say: "Consumidor 2 credita mais R$ 100.", press: B },
          { say: "Consumidor 1 marca como processado.", press: A },
          { say: "Consumidor 2 marca também.", press: B },
          { say: "R$ 200 para um pagamento de R$ 100. É o mesmo padrão do lost update: conferir e agir são dois passos. A correção é tornar o \"já processei?\" atômico." },
        ],
      },
      {
        scenario: "mensagem-idempotente",
        beats: [
          { say: "Agora há uma tabela processadas com chave única. Cada consumidor abre uma transação, insere o id da mensagem e só credita se o INSERT funcionou. Consumidor 1 abre a transação.", press: A },
          { say: "Consumidor 1 insere msg-42. A chave fica travada até o COMMIT.", press: A },
          { say: "Consumidor 2 abre a transação.", press: B },
          {
            say: "Olhe o botão do Consumidor 2.",
            ask: {
              q: "Consumidor 2 tenta inserir msg-42 também. O que acontece?",
              choices: [
                c("Espera: a mesma chave está sendo inserida pelo Consumidor 1", "Isso. O índice único trava a chave até o outro confirmar ou desistir.", true),
                c("Insere também", "A chave é única: só uma inserção pode vencer."),
              ],
            },
          },
          { say: "Consumidor 1 credita R$ 100.", press: A },
          { say: "Consumidor 1 confirma: chave e crédito juntos.", press: A },
          { say: "Consumidor 2 tenta inserir e recebe violação de UNIQUE.", press: B },
          { say: "Sem chave nova, não credita.", press: B },
          { say: "Confirma sem mudar nada.", press: B },
          { say: "Exatamente um crédito. Se o Consumidor 1 tivesse caído antes do COMMIT, a chave sumiria junto e a mensagem poderia ser reprocessada: por isso chave e efeito ficam na mesma transação." },
        ],
      },
    ],
    talk: [
      "Toda fila séria entrega pelo menos uma vez; o consumidor precisa ser idempotente.",
      "Chave de idempotência (id da mensagem ou do pedido) com UNIQUE, gravada na mesma transação do efeito.",
      "Conferir e depois marcar não basta: entre os dois cabe outro consumidor.",
    ],
    tech: ["UNIQUE no PostgreSQL", "Idempotency-Key (Stripe)", "Kafka idempotent producer", "Amazon SQS FIFO (deduplicação)"],
    study: [
      { title: "Idempotent requests", by: "Documentação da Stripe", url: "https://docs.stripe.com/api/idempotent_requests" },
      { title: "Pattern: Idempotent Consumer", by: "Chris Richardson (microservices.io)", url: "https://microservices.io/patterns/communication-style/idempotent-consumer.html" },
      yt("8xFBQc1A4B8", "Arquitetura orientada a eventos"),
    ],
  },
  {
    id: "reserva-de-assento",
    title: "Reserva de assento: GET e depois SET",
    summary: "Dois fãs reservam o mesmo assento no Redis. Troque dois comandos por um só.",
    level: "intermediário",
    story:
      "Abertura de vendas de um show. O mapa mostra o assento 12 livre e dois fãs clicam nele ao mesmo tempo. A reserva fica no Redis por 7 minutos, como faz o Ticketmaster, enquanto o fã paga.",
    rule: "Um assento, no máximo uma reserva confirmada.",
    parts: [
      {
        scenario: "reserva-assento",
        beats: [
          { say: "O código: GET assento:12; se estiver vazio, SET assento:12 <meu id> e confirma a reserva. No Redis, 1 = fã A e 2 = fã B." },
          { say: "Fã A consulta: vazio.", press: A },
          {
            say: "Fã B consulta.",
            ask: {
              q: "Cada comando do Redis é atômico. Então o B está protegido?",
              choices: [
                c("Não: GET e SET são dois comandos, e entre eles cabe o outro fã", "Isso. Atômico é cada comando, não a sequência.", true),
                c("Sim, o Redis é single-thread", "Single-thread executa um comando por vez, mas não junta os seus dois comandos."),
              ],
            },
            press: B,
          },
          { say: "A grava o dono: 1.", press: A },
          { say: "B grava por cima: 2.", press: B },
          { say: "A recebe \"reservado\".", press: A },
          { say: "B também.", press: B },
          { say: "Dois fãs com a mesma reserva. A correção é conferir e gravar num comando só." },
        ],
      },
      {
        scenario: "reserva-set-nx",
        beats: [
          { say: "SET assento:12 <id> NX PX 420000: grava só se não existir (NX), com validade de 7 minutos (PX). Fã A tenta.", press: A },
          {
            say: "Fã B tenta o mesmo comando.",
            ask: {
              q: "O que o B recebe?",
              choices: [c("\"Não gravou\": a chave já existe", "Isso. O Redis responde nil e o B vê o assento como ocupado.", true), c("\"OK\" por cima", "Com NX, não sobrescreve.")],
            },
            press: B,
          },
          { say: "A confirma a reserva.", press: A },
          { say: "B não confirma.", press: B },
          { say: "Uma reserva. Detalhe que o entrevistador adora: a chave pode expirar antes do webhook do pagamento chegar, ou se perder num failover do Redis. Por isso a garantia final da venda fica no banco: UPDATE condicional (WHERE status = 'disponível') ou UNIQUE, e estorno de quem perdeu." },
        ],
      },
    ],
    talk: [
      "GET e depois SET é corrida; SET NX PX é conferir e gravar num comando, com expiração.",
      "Lock no Redis é otimização de UX; a garantia final fica no banco (UPDATE condicional ou UNIQUE).",
      "Webhook de pagamento chega atrasado e duplicado: conferir o dono da reserva e ser idempotente.",
    ],
    tech: ["Redis SET NX PX", "Redis Lua scripts", "PostgreSQL UPDATE condicional", "Queue-it / Cloudflare Waiting Room"],
    study: [
      yt("3XSijmIZxXU", "Ticketmaster"),
      { title: "SET (opções NX e PX)", by: "Documentação do Redis", url: "https://redis.io/docs/latest/commands/set/" },
      { title: "How to do distributed locking", by: "Martin Kleppmann", url: "https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html", note: "Por que lock distribuído precisa de fencing token." },
    ],
  },
  {
    id: "pix-duplo",
    title: "Pix duplo no event sourcing",
    summary: "Ler da fonte da verdade não basta: o append precisa conferir a versão do stream.",
    level: "avançado",
    story:
      "Um banco digital guarda a conta como uma sequência de eventos (event sourcing): ContaAberta, DinheiroDepositado, PixEnviado… O saldo é a soma dos eventos. A conta tem R$ 1.000 e o cliente dispara dois Pix de R$ 600 quase juntos (duplo toque, ou dois aparelhos).",
    rule: "O saldo nunca fica negativo.",
    concept: LOCK_OTIMISTA,
    parts: [
      {
        scenario: "pix-duplo",
        beats: [
          { say: "O Renato Augusto lembra no vídeo de Event Sourcing: a regra de saldo não pode ler da projeção (que atrasa), tem que reidratar a conta do event store. Os dois Pix fazem isso." },
          { say: "Pix 1 reidrata: R$ 1.000, versão 1.", press: A },
          { say: "Pix 2 reidrata: R$ 1.000, versão 1.", press: B },
          { say: "Pix 1 confere (1.000 ≥ 600) e acrescenta PixEnviado.", press: A },
          {
            say: "Pix 2 também conferiu com R$ 1.000.",
            ask: {
              q: "Pix 2 faz o append sem conferir a versão. Qual o saldo final?",
              choices: [c("−R$ 200", "Isso. Os dois eventos são gravados.", true), c("R$ 400", "Só se o segundo fosse barrado."), c("R$ 1.000", "O primeiro já foi gravado.")],
            },
            press: B,
          },
          { say: "Saldo negativo. Ler da fonte da verdade não protegeu, porque a decisão foi tomada com uma leitura que ficou velha. É o mesmo padrão do lost update, num banco diferente." },
        ],
      },
      {
        scenario: "pix-versao",
        beats: [
          { say: "Agora o append leva a versão lida (expectedRevision): grave só se o stream ainda estiver na versão 1. Pix 1 reidrata.", press: A },
          { say: "Pix 2 reidrata.", press: B },
          { say: "Pix 1 faz o append com versão esperada 1: aceito, a versão vira 2.", press: A },
          {
            say: "Pix 2 tenta com versão esperada 1.",
            ask: {
              q: "O stream está na versão 2. O que acontece?",
              choices: [
                c("O event store recusa e o Pix 2 recomeça", "Isso. É lock otimista no stream.", true),
                c("Grava mesmo assim", "Com versão esperada, a gravação é condicional."),
              ],
            },
            press: B,
          },
          { say: "Pix 2 reidrata de novo: R$ 400.", press: B },
          { say: "Sem saldo para R$ 600: não envia.", press: B },
          { say: "Saldo R$ 400. EventStoreDB/KurrentDB chamam isso de expected revision; em Kafka puro não existe, e por isso ele não é um event store completo para regras como essa." },
        ],
      },
    ],
    talk: [
      "Em event sourcing a regra lê do event store, não da projeção, e o append usa versão esperada para não decidir com leitura velha.",
      "Conflito de versão = recomeça: reidrata e decide de novo.",
      "Projeção é eventualmente consistente; serve para tela, não para regra de negócio.",
    ],
    tech: ["EventStoreDB / KurrentDB (expected revision)", "Marten (PostgreSQL)", "Axon"],
    study: [
      yt("jzMghF8n26E", "Event Sourcing"),
      { title: "Event Sourcing", by: "Martin Fowler", url: "https://martinfowler.com/eaaDev/EventSourcing.html" },
      { title: "Optimistic concurrency", by: "Documentação do KurrentDB (EventStoreDB)", url: "https://docs.kurrent.io/clients/grpc/appending-events.html" },
    ],
  },
  {
    id: "therac-25",
    title: "Therac-25: a corrida que matou",
    summary: "Uma edição rápida demais do operador e uma tarefa que não conferiu de novo. Um caso real.",
    level: "avançado",
    story:
      "Therac-25, máquina de radioterapia (1985–1987). No modo raio X, o feixe sai com corrente altíssima e passa por um alvo que o converte; no modo elétron, a corrente é baixa e não há alvo. Uma operadora experiente digitou \"x\" por engano e corrigiu para \"e\" em poucos segundos. A tarefa que configura a máquina já tinha lido o modo antigo.",
    rule: "O feixe só dispara com a configuração física do modo escolhido.",
    parts: [
      {
        scenario: "therac-25",
        beats: [
          { say: "Duas tarefas dividem as mesmas variáveis: modo (1 = raio X, 2 = elétron), feixe (corrente) e prato (posição do alvo). É uma simplificação do relatório de Leveson e Turner (1993)." },
          { say: "A Configuração lê o modo: 1, raio X.", press: A },
          { say: "Ela ajusta o feixe para alta corrente, como manda o raio X. Na máquina real, ajustar os ímãs levava ~8 segundos.", press: A },
          { say: "Nesse meio tempo, a operadora corrige o modo para elétron.", press: B },
          {
            say: "A edição gira o prato para a posição de elétron (sem alvo).",
            ask: {
              q: "A Configuração vai disparar. Ela confere o modo de novo?",
              choices: [
                c("Não: usa o que leu antes, e dispara alta corrente sem alvo", "Isso. Foi o que aconteceu.", true),
                c("Sim, sempre confere antes de disparar", "Não conferia: uma flag dizia que a edição já tinha sido tratada."),
              ],
            },
            press: B,
          },
          { say: "Disparo.", press: A },
          { say: "Overdose maciça. Houve 6 acidentes conhecidos e pelo menos 3 mortes. O modelo anterior (Therac-20) tinha o mesmo bug, mas travas de hardware impediam o disparo; o Therac-25 confiava só no software." },
        ],
      },
      {
        scenario: "therac-25-trava",
        beats: [
          { say: "Correção no modelo: a Configuração trava o modo até disparar, e a edição da operadora (modo + prato) vira uma transação só. Configuração abre a transação.", press: A },
          { say: "Configuração trava e lê o modo.", press: A },
          { say: "A operadora começa a edição.", press: B },
          {
            say: "Olhe o botão da Operadora.",
            ask: {
              q: "A operadora tenta mudar o modo. O que acontece?",
              choices: [
                c("Espera: o modo está travado até o disparo terminar", "Isso. A edição não acontece no meio da configuração.", true),
                c("Muda na hora", "O modo está travado pela Configuração."),
              ],
            },
          },
          { say: "Configuração ajusta o feixe.", press: A },
          { say: "Dispara com o prato ainda na posição do raio X: configuração coerente.", press: A },
          { say: "Configuração solta a trava.", press: A },
          { say: "Agora a edição passa: modo…", press: B },
          { say: "…prato…", press: B },
          { say: "…e confirma.", press: B },
          { say: "Coerente. A lição de engenharia vai além do lock: travas de hardware independentes, conferir de novo imediatamente antes de agir, e não reaproveitar software de outro equipamento sem reanalisar." },
        ],
      },
    ],
    talk: [
      "Toda vez que uma decisão usa um valor lido antes, pergunte: e se ele mudar até eu agir? (time-of-check to time-of-use).",
      "Estado compartilhado entre tarefas precisa de sincronização; conferir de novo imediatamente antes de agir.",
      "Em sistema crítico, defesa em profundidade: a trava de hardware não depende do software estar certo.",
    ],
    study: [
      yt("4WCYIdJxTQw", "Therac-25"),
      { title: "An Investigation of the Therac-25 Accidents", by: "Nancy Leveson e Clark Turner (IEEE Computer, 1993)", url: "https://doi.org/10.1109/MC.1993.274940" },
    ],
  },
];

export const getRaceLesson = (id: string) => RACE_LESSONS.find((l) => l.id === id);
