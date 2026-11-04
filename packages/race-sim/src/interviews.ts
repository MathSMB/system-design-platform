/** Uma opção de resposta: o texto, se está certa e por quê. */
export interface RaceChoice {
  text: string;
  correct?: boolean;
  /** Por que essa opção está certa ou errada. */
  why: string;
}

export interface RaceQuestion {
  q: string;
  choices: (RaceChoice & { /** Cenário que prova esta correção no laboratório. */ proof?: string })[];
  lesson: string;
}

/** Entrevista de concorrência: relato do bug → diagnóstico → correção → prova → aprofundamento. */
export interface RaceInterview {
  id: string;
  title: string;
  /** Como o entrevistador conta o problema (relato de produção). */
  report: string;
  /** Cenário que reproduz o bug no laboratório. */
  bug: string;
  diagnose: RaceQuestion;
  fix: RaceQuestion;
  followUp: RaceQuestion;
  /** Aula de Estudo que ensina o assunto. */
  lesson: string;
}

const c = (text: string, why: string, correct = false, proof?: string) => ({ text, why, correct, proof });

export const RACE_INTERVIEWS: RaceInterview[] = [
  {
    id: "ingressos-a-mais",
    title: "Ingressos a mais",
    report:
      "\"Vendemos 1.003 ingressos para um show de 1.000 lugares. O código confere o estoque antes de vender: lê a quantidade, se for maior que zero grava quantidade − 1. Em teste nunca aconteceu.\"",
    bug: "lost-update",
    lesson: "ultimo-ingresso",
    diagnose: {
      q: "O que está acontecendo?",
      choices: [
        c("Lost update: duas compras leem o mesmo estoque antes de alguém gravar", "Isso: ler, calcular e gravar deixa uma janela.", true),
        c("Deadlock entre as compras", "Deadlock trava; aqui as duas terminam."),
        c("Réplica de leitura atrasada", "Pode piorar, mas acontece mesmo com um banco só."),
        c("Bug de arredondamento", "Estoque é inteiro."),
      ],
      lesson: "Read Committed não impede lost update.",
    },
    fix: {
      q: "Qual correção você implementa?",
      choices: [
        c("UPDATE ... SET estoque = estoque − 1 WHERE estoque > 0, e conferir as linhas afetadas", "Isso: o banco confere e grava no mesmo comando.", true, "atomic-update"),
        c("SELECT ... FOR UPDATE dentro de uma transação", "Também resolve: o segundo espera o primeiro.", true, "select-for-update"),
        c("Colocar o código entre BEGIN e COMMIT, sem mais nada", "Em Read Committed, a transação sozinha não impede: os dois leem 1."),
        c("Cache do estoque no Redis", "Cria mais uma cópia que pode divergir."),
      ],
      lesson: "UPDATE atômico é o mais simples; lock pessimista ou otimista quando a regra não cabe numa condição.",
    },
    followUp: {
      q: "E se fossem 10 mil compradores disputando os últimos 100 ingressos?",
      choices: [
        c("A linha do estoque vira ponto de disputa: fila virtual ou dividir o estoque em lotes ajuda", "Isso: contenção numa linha só limita a vazão.", true),
        c("Lock otimista é o ideal com tanta disputa", "Com disputa alta, quase todos recomeçam."),
        c("Não muda nada", "Muda: todos esperam a mesma linha."),
      ],
      lesson: "Hot row: a linha disputada vira o gargalo, e otimista desperdiça trabalho.",
    },
  },
  {
    id: "plantao-vazio",
    title: "Plantão vazio",
    report:
      "\"A escala do hospital exige pelo menos um médico de plantão. Num domingo, o sistema deixou o plantão vazio: Alice e Bob pediram para sair no mesmo minuto e os dois foram liberados. Cada pedido abre transação e confere se há outro médico.\"",
    bug: "write-skew",
    lesson: "write-skew",
    diagnose: {
      q: "Que tipo de anomalia é essa?",
      choices: [
        c("Write skew: os dois leem o mesmo conjunto e gravam linhas diferentes", "Isso: não há conflito de escrita para o lock de linha pegar.", true),
        c("Lost update", "Nada foi sobrescrito: cada um gravou a própria linha."),
        c("Leitura suja (dirty read)", "Postgres não tem dirty read em nenhum nível."),
      ],
      lesson: "Write skew escapa de Read Committed e de Snapshot Isolation.",
    },
    fix: {
      q: "Qual correção?",
      choices: [
        c("Travar as linhas lidas com SELECT FOR UPDATE, sempre na mesma ordem", "Isso: o segundo espera e relê.", true, "write-skew-locked"),
        c("Isolamento SERIALIZABLE e tentar de novo quando o banco abortar", "Também resolve: o Postgres detecta a dependência e aborta um.", true),
        c("Mudar para REPEATABLE READ", "É Snapshot Isolation no Postgres e ainda permite write skew."),
        c("Retry com backoff", "Não há erro para tentar de novo: as duas transações dão certo."),
      ],
      lesson: "Serializable ou travar o que foi lido.",
    },
    followUp: {
      q: "Onde mais esse padrão aparece?",
      choices: [
        c("Reserva de sala sem sobreposição, nome de usuário único, limite de gasto entre cartões", "Isso: decisão sobre um conjunto, gravação em linhas diferentes.", true),
        c("Só em hospitais", "É um padrão geral."),
        c("Em contadores simples", "Esse é o lost update."),
      ],
      lesson: "Quando a regra envolve várias linhas, desconfie de write skew.",
    },
  },
  {
    id: "deadlock-transferencia",
    title: "Deadlock na transferência",
    report:
      "\"Os logs mostram ERROR: deadlock detected algumas vezes por dia na transferência entre contas. Acontece quando uma transferência de A para B e outra de B para A rodam juntas. Cada uma trava a conta de origem e depois a de destino.\"",
    bug: "deadlock",
    lesson: "deadlock",
    diagnose: {
      q: "Por que trava?",
      choices: [
        c("Cada transação segura o lock que a outra precisa: ciclo de espera", "Isso: A espera B e B espera A.", true),
        c("O banco está lento", "Lentidão não causa ciclo."),
        c("Lost update", "Lost update termina com valor errado; aqui o banco aborta."),
      ],
      lesson: "Deadlock = ciclo no grafo de espera.",
    },
    fix: {
      q: "Qual correção?",
      choices: [
        c("Travar as duas contas sempre na mesma ordem (menor id primeiro)", "Isso: sem ordem diferente, não há ciclo.", true, "write-skew-locked"),
        c("Aumentar o deadlock_timeout", "Só demora mais para detectar."),
        c("Tirar as transações", "Aí o dinheiro pode sumir no meio."),
      ],
      lesson: "Ordem global de locks elimina deadlock entre duas linhas.",
    },
    followUp: {
      q: "Mesmo com ordem fixa, o que a aplicação precisa fazer?",
      choices: [
        c("Tratar o erro de deadlock/serialização tentando de novo a transação inteira", "Isso: o banco pode abortar por outros motivos.", true),
        c("Nada", "Outros caminhos de código ainda podem travar fora de ordem."),
        c("Reiniciar o banco", "Não."),
      ],
      lesson: "Retry de transação é parte do contrato com o banco.",
    },
  },
  {
    id: "preco-velho",
    title: "Preço velho no cache",
    report:
      "\"Clientes veem o preço antigo por até uma hora depois da mudança. O código grava o novo preço no banco e apaga a chave do cache, como manda o cache-aside. O TTL é de 1 hora.\"",
    bug: "cache-aside-stale",
    lesson: "cache-valor-velho",
    diagnose: {
      q: "Como o valor velho volta para o cache?",
      choices: [
        c("Um leitor leu o preço antigo do banco antes da escrita e gravou no cache depois do DEL", "Isso: a corrida do stale set.", true),
        c("O DEL falhou", "Pode acontecer, mas a corrida ocorre mesmo com o DEL funcionando."),
        c("O Redis ignora DEL", "Não ignora."),
      ],
      lesson: "Apagar a chave não fecha a janela entre ler do banco e gravar no cache.",
    },
    fix: {
      q: "O que você faz?",
      choices: [
        c("TTL bem menor como rede de segurança, e apagar de novo alguns segundos depois (ou leases/versão no valor)", "Isso: limita a janela e fecha a corrida mais comum.", true),
        c("Atualizar o cache na escrita em vez de apagar", "Duas escritas concorrentes podem deixar a mais antiga no cache."),
        c("Aumentar o TTL", "Aumenta o tempo com preço errado."),
      ],
      lesson: "Leases (Memcache do Facebook) resolvem de vez; TTL curto limita o estrago.",
    },
    followUp: {
      q: "O checkout deve usar o preço do cache?",
      choices: [
        c("Não: o valor cobrado vem da fonte da verdade (banco) no momento da compra", "Isso.", true),
        c("Sim, é mais rápido", "Velocidade não justifica cobrar errado."),
      ],
      lesson: "Cache para exibir; banco para decidir.",
    },
  },
  {
    id: "cashback-em-dobro",
    title: "Cashback em dobro",
    report:
      "\"Depois de um deploy, alguns clientes receberam o cashback duas vezes. A fila mostra a mesma mensagem entregue duas vezes. O consumidor confere se a mensagem já foi processada antes de creditar.\"",
    bug: "mensagem-duplicada",
    lesson: "mensagem-duplicada",
    diagnose: {
      q: "Por que a conferência não segurou?",
      choices: [
        c("Dois consumidores conferiram antes de algum marcar como processado", "Isso: conferir e marcar são dois passos.", true),
        c("A fila está com defeito", "Entrega duplicada é normal em at-least-once."),
        c("O banco perdeu a marcação", "A marcação veio tarde demais, não se perdeu."),
      ],
      lesson: "Check-then-act é o mesmo padrão do lost update.",
    },
    fix: {
      q: "Qual correção?",
      choices: [
        c("Chave de idempotência com UNIQUE, gravada na mesma transação do crédito", "Isso: o segundo INSERT falha e não credita.", true, "mensagem-idempotente"),
        c("Configurar a fila para exactly-once", "Entre a fila e o seu banco não existe exactly-once de graça."),
        c("Conferir duas vezes antes de creditar", "Continua sendo conferir e depois agir."),
      ],
      lesson: "Idempotência no consumidor.",
    },
    followUp: {
      q: "Por que a chave precisa estar na mesma transação do crédito?",
      choices: [
        c("Se o crédito falhar, a chave some junto e a mensagem pode ser reprocessada", "Isso: chave e efeito são atômicos.", true),
        c("Por performance", "É por correção."),
        c("Não precisa", "Sem isso, uma falha no meio perde o crédito."),
      ],
      lesson: "Efeito e registro de idempotência no mesmo commit.",
    },
  },
  {
    id: "assento-duplo",
    title: "Assento vendido duas vezes",
    report:
      "\"Dois fãs receberam e-mail de reserva para o mesmo assento. A reserva fica no Redis: o serviço faz GET; se estiver vazio, faz SET com o id do fã e expira em 7 minutos.\"",
    bug: "reserva-assento",
    lesson: "reserva-de-assento",
    diagnose: {
      q: "Onde está a corrida?",
      choices: [
        c("Entre o GET e o SET: os dois veem vazio", "Isso: atômico é cada comando, não a sequência.", true),
        c("No TTL de 7 minutos", "O TTL não causa a reserva dupla."),
        c("O Redis perdeu a chave", "Possível em failover, mas aqui é corrida comum."),
      ],
      lesson: "Check-then-act no Redis.",
    },
    fix: {
      q: "Qual correção?",
      choices: [
        c("SET assento:12 <id> NX PX 420000, e na compra um UPDATE condicional no banco", "Isso: reserva atômica e garantia final no banco.", true, "reserva-set-nx"),
        c("Mais memória no Redis", "Não tem relação."),
        c("Aumentar o TTL", "Não fecha a corrida."),
      ],
      lesson: "Conferir e gravar no mesmo comando.",
    },
    followUp: {
      q: "O webhook do pagamento chega depois que a reserva expirou e outro fã reservou. E agora?",
      choices: [
        c("O UPDATE condicional no banco falha para o atrasado, e o pagamento dele é estornado", "Isso: o banco é a garantia final.", true),
        c("Os dois ficam com o assento", "É a venda dupla que queremos evitar."),
        c("Ignorar o webhook", "O cliente pagou e precisa de estorno."),
      ],
      lesson: "Lock no Redis é UX; correção mora no banco.",
    },
  },
  {
    id: "pix-duplo",
    title: "Pix duplo",
    report:
      "\"Um cliente com R$ 1.000 fez dois Pix de R$ 600 e os dois saíram. Usamos event sourcing: antes de cada Pix, o serviço reidrata a conta do event store, confere o saldo e acrescenta PixEnviado.\"",
    bug: "pix-duplo",
    lesson: "pix-duplo",
    diagnose: {
      q: "Por que reidratar do event store não protegeu?",
      choices: [
        c("Os dois leram R$ 1.000 antes de qualquer append, e o append não confere se o stream mudou", "Isso: decisão com leitura velha.", true),
        c("A projeção estava atrasada", "Eles leram do event store, não da projeção."),
        c("O Kafka perdeu um evento", "Nada foi perdido; foi gravado demais."),
      ],
      lesson: "Event store também precisa de controle de concorrência.",
    },
    fix: {
      q: "Qual correção?",
      choices: [
        c("Append com versão esperada (expected revision) e recomeçar no conflito", "Isso: lock otimista no stream.", true, "pix-versao"),
        c("Ler da projeção", "A projeção é ainda mais atrasada."),
        c("Snapshot a cada 10 eventos", "Snapshot acelera a leitura; não resolve concorrência."),
      ],
      lesson: "EventStoreDB/KurrentDB recusam o append se a versão mudou.",
    },
    followUp: {
      q: "Onde ficaria o saldo para mostrar no app?",
      choices: [
        c("Numa projeção (modelo de leitura) atualizada pelos eventos, aceitando atraso", "Isso: tela lê projeção, regra lê o stream.", true),
        c("Reidratar a conta a cada abertura do app", "Funciona, mas caro em escala."),
        c("No cache do celular", "Não é fonte confiável."),
      ],
      lesson: "CQRS junto com event sourcing.",
    },
  },
  {
    id: "therac-25",
    title: "Therac-25",
    report:
      "\"(Caso histórico, 1985–1987.) Uma máquina de radioterapia deu overdoses maciças. Acontecia quando operadoras experientes, rápidas no teclado, corrigiam o modo de raio X para elétron em poucos segundos.\"",
    bug: "therac-25",
    lesson: "therac-25",
    diagnose: {
      q: "Qual é a causa no software?",
      choices: [
        c("A tarefa de configuração usou o modo lido antes da edição e não conferiu de novo antes de disparar", "Isso: corrida entre a edição e a configuração (time-of-check to time-of-use).", true),
        c("Falta de memória", "Não foi isso."),
        c("A operadora digitou errado", "Ela corrigiu; o software não percebeu a correção."),
      ],
      lesson: "Leveson e Turner (1993) documentam essa e outra corrida (um contador de 1 byte).",
    },
    fix: {
      q: "Como você corrige?",
      choices: [
        c("Sincronizar a edição com a configuração, conferir de novo antes de disparar e ter interlock de hardware", "Isso: defesa em profundidade.", true, "therac-25-trava"),
        c("Pedir para as operadoras digitarem devagar", "Culpar o usuário não corrige o sistema."),
        c("Mais testes manuais", "Corridas raramente aparecem em teste manual."),
      ],
      lesson: "Em sistema crítico, a trava física não depende do software.",
    },
    followUp: {
      q: "Por que o Therac-20 não matou ninguém com o mesmo bug?",
      choices: [
        c("Tinha travas de hardware independentes que bloqueavam a configuração perigosa", "Isso: o software errava, o hardware segurava.", true),
        c("Não tinha o bug", "Leveson relata que o problema existia lá também."),
        c("Era usado por menos gente", "A diferença foi a trava física."),
      ],
      lesson: "Reaproveitar software sem as proteções do sistema antigo foi parte do desastre.",
    },
  },
];

export const getRaceInterview = (id: string) => RACE_INTERVIEWS.find((x) => x.id === id);
