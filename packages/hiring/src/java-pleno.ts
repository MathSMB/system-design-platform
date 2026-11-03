import type { Block, BlockId, JavaQuestion, Option } from "./types";

const P = (text: string, why: string): Option => ({ text, level: "pleno", why });
const L = (text: string, why: string): Option => ({ text, level: "livro", why });
const E = (text: string, why: string): Option => ({ text, level: "errada", why });

/** Os 7 blocos, na ordem e com o peso do guia "O que as vagas pedem de cada tecnologia" (12 vagas lidas em 31/10/2026). */
export const BLOCKS: Block[] = [
  { id: "java", title: "Java core", vagas: "12 de 12 vagas", weight: 3, guide: "Java e Spring Boot › Java", summary: "Collections, equals e hashCode, exceções, concorrência, virtual threads, imutabilidade." },
  { id: "spring", title: "Spring Boot", vagas: "12 de 12 vagas", weight: 3, guide: "Java e Spring Boot › Spring Boot", summary: "Injeção de dependência, @Transactional e proxy, profiles, erros, Boot 2 para 3." },
  { id: "rest", title: "APIs REST e segurança", vagas: "8 de 12 vagas", weight: 2, guide: "APIs REST, Swagger e Spring Security", summary: "PUT x PATCH, 401 x 403, idempotência, JWT, versionamento, API externa lenta." },
  { id: "dados", title: "SQL e JPA", vagas: "8 de 12 vagas", weight: 2, guide: "Bancos de dados: SQL, JPA/Hibernate e MongoDB", summary: "Consulta lenta, índices, N+1, LazyInitializationException, estoque disputado." },
  { id: "distribuidos", title: "Microsserviços e mensageria", vagas: "7 e 6 de 12 vagas", weight: 2, guide: "Microsserviços, Kafka e RabbitMQ", summary: "Outbox, serviço fora do ar, ordem no Kafka, partições, reprocessamento." },
  { id: "qualidade", title: "Testes, Git e boas práticas", vagas: "5 e 6 de 12 vagas", weight: 1, guide: "Testes, Git e boas práticas", summary: "Unidade x integração, quando não usar mock, API externa, rebase, SOLID." },
  { id: "operacao", title: "Docker, CI/CD e observabilidade", vagas: "4 a 6 de 12 vagas", weight: 1, guide: "Docker, CI/CD, nuvem e observabilidade", summary: "Multi-stage, segredos, rollback, API lenta às 15h, p95." },
];

export const getBlock = (id: string) => BLOCKS.find((b) => b.id === id);

export const JAVA_PLENO: JavaQuestion[] = [
  // ───────────────────────── Java core ─────────────────────────
  {
    id: "hashset-duplicado",
    block: "java",
    prompt: "Colocamos objetos Cliente num HashSet e apareceram duplicados, mesmo com o equals sobrescrito comparando o CPF. O que aconteceu?",
    code: `class Cliente {\n  String cpf;\n  @Override public boolean equals(Object o) {\n    return o instanceof Cliente c && cpf.equals(c.cpf);\n  }\n  // hashCode não foi sobrescrito\n}`,
    options: [
      P("Faltou sobrescrever hashCode. O HashSet usa o hash para escolher o bucket: clientes iguais caem em buckets diferentes e o equals nem é chamado. O contrato diz que objetos iguais por equals precisam ter o mesmo hashCode.", "Isso: explicou o mecanismo (bucket antes do equals) e o contrato."),
      L("equals e hashCode têm que ser sobrescritos sempre juntos.", "Certo, mas é a regra decorada. O entrevistador quer ouvir o porquê: o hash escolhe o bucket antes de qualquer equals."),
      E("O HashSet compara com ==, então o equals não é usado.", "O HashSet usa hashCode e depois equals. O problema é o hash diferente, não o ==."),
      E("Cliente precisa implementar Comparable.", "Comparable importa para TreeSet, não para HashSet."),
    ],
    followUp: {
      q: "E se o CPF de um cliente mudar depois que ele já está no HashSet?",
      options: [
        P("O objeto fica no bucket do hash antigo: contains e remove passam a falhar e ele vira lixo dentro do Set. Por isso a chave deve ser imutável (campo final ou record).", "Isso: mostrou a consequência concreta e a prevenção."),
        L("Dá problema, melhor não alterar objetos dentro de coleções.", "Direção certa, mas sem dizer qual problema."),
        E("O HashSet recalcula o hash automaticamente.", "Não recalcula: o hash é calculado só na inserção."),
      ],
    },
    checklist: ["Contrato equals/hashCode", "O hash escolhe o bucket antes do equals", "Chave mutável some do Set", "Record ou campos final como solução"],
  },
  {
    id: "hashmap-por-dentro",
    block: "java",
    prompt: "Como um HashMap encontra o valor de uma chave? E o que acontece quando muitas chaves colidem no mesmo bucket?",
    options: [
      P("Calcula o hashCode da chave, espalha os bits e usa como índice no array de buckets. Colisões viram uma lista no bucket; a partir do Java 8, passando de 8 itens, a lista vira árvore e a busca cai de O(n) para O(log n). Ao passar de 75% de ocupação, o array dobra e tudo é redistribuído.", "Isso: hash → bucket → equals, árvore desde o Java 8 e resize pelo load factor."),
      L("Usa hashing, então a busca é O(1).", "Certo em média, mas não respondeu o que acontece na colisão."),
      E("Percorre as chaves comparando com equals até achar.", "Isso seria uma lista. O hash serve justamente para não percorrer tudo."),
      E("Mantém as chaves ordenadas e faz busca binária.", "Isso é o TreeMap."),
    ],
    followUp: {
      q: "Posso usar HashMap compartilhado entre várias threads de um serviço?",
      options: [
        P("Não. Use ConcurrentHashMap, que trava só o bucket alterado (e usa CAS). E mesmo nele, ler-calcular-gravar precisa de compute ou merge para ser atômico.", "Isso: trocou a estrutura e lembrou que operação composta continua sendo corrida."),
        L("Não, use Collections.synchronizedMap.", "Funciona, mas trava o mapa inteiro a cada acesso. ConcurrentHashMap é o padrão hoje."),
        E("Pode, se as threads só fizerem put.", "Puts simultâneos podem corromper a estrutura durante um resize."),
      ],
    },
    checklist: ["hashCode → índice do bucket", "equals dentro do bucket", "Árvore a partir de 8 colisões (Java 8)", "Load factor 0,75 e resize", "ConcurrentHashMap e compute/merge"],
  },
  {
    id: "excecao-negocio",
    block: "java",
    prompt: "Você vai implementar a regra \"saldo insuficiente\" numa transferência. Exceção checked ou unchecked? Como ela chega no cliente da API?",
    options: [
      P("Unchecked: uma SaldoInsuficienteException que estende RuntimeException. Ela não polui as assinaturas e faz o @Transactional dar rollback por padrão. Um @RestControllerAdvice converte em 422 com ProblemDetail.", "Isso: escolha, motivo (rollback e assinaturas) e como vira resposta HTTP."),
      L("Unchecked, porque é mais prática.", "Certo, mas sem o motivo técnico: o rollback padrão do Spring só vale para unchecked."),
      E("Lançar Exception genérica com a mensagem \"saldo insuficiente\".", "Fica impossível tratar esse caso de forma específica."),
      E("Retornar null e o controller verifica.", "Esconde o erro e espalha ifs pelo código."),
    ],
    followUp: {
      q: "Se um método @Transactional lançar uma exceção checked, o Spring faz rollback?",
      options: [
        P("Não, por padrão. O rollback automático só vale para RuntimeException e Error. Para checked, é preciso @Transactional(rollbackFor = ...).", "Isso: a regra exata e como mudar."),
        L("Depende da configuração.", "Verdade, mas sem dizer qual é o padrão."),
        E("Sim, qualquer exceção desfaz a transação.", "Esse é o erro clássico que deixa dado gravado pela metade."),
      ],
    },
    checklist: ["Exceção de negócio própria", "RuntimeException e rollback padrão", "@RestControllerAdvice", "Status 422 ou 409"],
  },
  {
    id: "contador-threads",
    block: "java",
    prompt: "Duas threads executam contador++ mil vezes cada. O resultado às vezes dá 1.947 em vez de 2.000. Por quê, e como corrigir?",
    code: `int contador = 0;\nRunnable r = () -> { for (int i = 0; i < 1000; i++) contador++; };`,
    options: [
      P("contador++ são três passos: ler, somar e gravar. As duas threads leem o mesmo valor e uma das somas se perde (lost update). Corrijo com AtomicInteger.incrementAndGet, que usa CAS, ou com synchronized. volatile não resolve, porque só garante visibilidade.", "Isso: nomeou a corrida, deu duas correções e descartou o volatile."),
      L("Falta synchronized.", "Resolve, mas sem explicar por que o ++ não é atômico."),
      E("Marcar o contador como volatile.", "volatile garante que todos veem o último valor, não que ler-somar-gravar seja atômico."),
      E("Colocar Thread.sleep entre os incrementos.", "Só diminui a chance. A corrida continua."),
    ],
    followUp: {
      q: "Agora são 3 instâncias da API atualizando o mesmo saldo no PostgreSQL. synchronized resolve?",
      options: [
        P("Não: synchronized vale só dentro de uma JVM. Uso o banco: UPDATE saldo = saldo - x WHERE saldo >= x, SELECT ... FOR UPDATE, ou lock otimista com @Version.", "Isso: o lock tem que estar onde está o dado."),
        L("Usaria um lock distribuído, com Redis por exemplo.", "Funciona, mas acrescenta uma peça. O banco já resolve com UPDATE atômico ou lock."),
        E("Sim, se o método do service for synchronized.", "Cada instância tem seu próprio lock: as três continuam competindo."),
      ],
    },
    checklist: ["++ não é atômico (ler, somar, gravar)", "AtomicInteger/CAS ou synchronized", "volatile não resolve", "Várias instâncias: lock no banco"],
  },
  {
    id: "virtual-threads",
    block: "java",
    prompt: "Nossa API em Spring MVC passa a maior parte do tempo esperando banco e APIs externas. Virtual threads ajudariam?",
    options: [
      P("Sim. Com I/O bloqueante, cada requisição ganha uma virtual thread barata, e a thread do sistema operacional fica livre enquanto ela espera. No Boot 3.2+ basta spring.threads.virtual.enabled=true. Não ajuda em trabalho pesado de CPU, e o gargalo pode passar para o pool de conexões.", "Isso: quando ajuda, como ligar e o limite."),
      L("Sim, virtual threads são mais leves que threads normais.", "Certo, mas sem dizer quando ajudam e quando não."),
      E("Não, só WebFlux resolve espera de I/O.", "Virtual threads existem justamente para ter o ganho sem reescrever para reativo."),
      E("Sim, deixam qualquer código mais rápido.", "Não aceleram CPU: só deixam esperar mais barato."),
    ],
    followUp: {
      q: "Depois de ligar virtual threads, começaram timeouts ao pegar conexão do Hikari. Por quê?",
      options: [
        P("Agora muito mais requisições chegam juntas ao banco, mas o pool continua com 10 conexões: o limite mudou de lugar. Dimensiono o pool pelo que o banco aguenta ou limito a concorrência (semáforo, bulkhead).", "Isso: entendeu que o gargalo se moveu."),
        L("É só aumentar o pool.", "Ajuda até o limite do banco. Falta pensar em quanto o banco aguenta."),
        E("Virtual threads vazam conexões.", "Não vazam: há mais gente na fila do mesmo pool."),
      ],
    },
    checklist: ["Ganho em I/O bloqueante", "Não ajuda CPU", "spring.threads.virtual.enabled", "Gargalo vai para o pool do banco"],
  },
  {
    id: "string-imutavel",
    block: "java",
    prompt: "Por que String é imutável em Java, e quando você usaria StringBuilder?",
    options: [
      P("Imutável permite o String pool, uso seguro como chave de HashMap e compartilhamento entre threads sem lock. Concatenar com + num loop cria um objeto novo por volta, então uso StringBuilder. StringBuffer só se o mesmo buffer for compartilhado entre threads, o que é raro.", "Isso: os benefícios da imutabilidade e o custo em loop."),
      L("StringBuilder é mais rápido que String.", "Incompleto: depende do uso. Fora de loop, + é otimizado pelo compilador."),
      E("String é mutável, mas a classe é final.", "final impede herança. A imutabilidade vem de não ter métodos que alteram o conteúdo."),
      E("StringBuffer é sempre a melhor escolha.", "É sincronizado e, sem compartilhamento, só custa mais."),
    ],
    followUp: {
      q: "Records ajudam a ter objetos imutáveis?",
      options: [
        P("Ajudam: geram campos final, construtor, equals, hashCode e toString. Mas a imutabilidade é rasa: uma List dentro do record ainda pode ser alterada, então copio com List.copyOf no construtor compacto.", "Isso: vantagem e pegadinha."),
        L("Sim, records são imutáveis.", "Quase: só os campos são final. O conteúdo de uma lista ainda muda."),
        E("Records têm setters gerados.", "Não têm setters."),
      ],
    },
    checklist: ["String pool", "Segura como chave e entre threads", "StringBuilder em loop", "Record: imutabilidade rasa"],
  },

  // ───────────────────────── Spring Boot ─────────────────────────
  {
    id: "injecao-construtor",
    block: "spring",
    prompt: "Por que preferir injeção por construtor em vez de @Autowired no campo?",
    options: [
      P("As dependências ficam explícitas e final, o objeto já nasce completo, dá para testar com new e mocks sem subir o Spring, e uma dependência circular aparece na hora de subir a aplicação, em vez de ficar escondida.", "Isso: quatro ganhos concretos."),
      L("É a boa prática recomendada pelo Spring.", "Certo, mas é argumento de autoridade. Falta o porquê."),
      E("Construtor é mais rápido em tempo de execução.", "Não há diferença de performance relevante."),
      E("Injeção no campo não funciona mais no Spring 6.", "Ainda funciona; só não é recomendada."),
    ],
    followUp: {
      q: "Uma classe tem 9 dependências no construtor. O que isso indica?",
      options: [
        P("Que a classe faz coisas demais (fere o princípio da responsabilidade única). Separo em classes menores por responsabilidade.", "Isso: o construtor grande é um sinal de design."),
        L("Uso o @RequiredArgsConstructor do Lombok para ficar menor.", "Esconde o sintoma sem tratar a causa."),
        E("Volto para injeção no campo para ficar mais limpo.", "Só esconde o problema."),
      ],
    },
    checklist: ["Dependências explícitas e final", "Teste sem Spring", "Circularidade aparece cedo", "Construtor grande = classe grande"],
  },
  {
    id: "transactional-interno",
    block: "spring",
    prompt: "O método confirmar() chama this.registrarPagamento(), que tem @Transactional. Em produção, não abriu transação. Por quê?",
    code: `@Service\nclass PedidoService {\n  public void confirmar(Long id) {\n    registrarPagamento(id);\n  }\n  @Transactional\n  public void registrarPagamento(Long id) { ... }\n}`,
    options: [
      P("O @Transactional é aplicado por um proxy em volta do bean. Uma chamada interna usa this e não passa pelo proxy, então não há transação. Movo o método para outro bean ou ponho @Transactional no método de entrada.", "Isso: proxy explica o comportamento e as duas correções."),
      L("@Transactional só funciona em métodos públicos.", "É verdade, mas o método aqui é público. A causa é a chamada interna."),
      E("Falta @EnableTransactionManagement.", "O Spring Boot já liga isso sozinho."),
      E("O método precisa ser static.", "Métodos static não passam por proxy nenhum."),
    ],
    followUp: {
      q: "Preciso gravar um log de auditoria mesmo se a operação principal der rollback. Como?",
      options: [
        P("Coloco a gravação em outro bean com @Transactional(propagation = REQUIRES_NEW): ela abre uma transação separada, que commita mesmo se a de fora desfizer.", "Isso: propagação certa, e em outro bean por causa do proxy."),
        L("Gravo o log no catch da exceção.", "Se o catch estiver dentro da mesma transação, o log também volta."),
        E("Uso propagation REQUIRED.", "REQUIRED entra na mesma transação e desfaz junto."),
      ],
    },
    checklist: ["Proxy do Spring", "Chamada interna não passa pelo proxy", "Mover para outro bean", "REQUIRES_NEW para auditoria"],
  },
  {
    id: "profiles-segredos",
    block: "spring",
    prompt: "Como você separa a configuração de desenvolvimento e de produção? E onde ficam as senhas?",
    options: [
      P("application.yml com profiles (dev, prod) e @ConfigurationProperties tipado. Senhas vêm de variável de ambiente ou de um gerenciador de segredos (AWS Secrets Manager, Vault), nunca do repositório.", "Isso: profiles, configuração tipada e segredo fora do código."),
      L("Um arquivo application.properties para cada ambiente.", "Funciona, mas não falou dos segredos."),
      E("Um if no código verificando em qual ambiente está.", "Mistura configuração com lógica."),
      E("Senhas no application-prod.yml, que não sobe para dev.", "Se está no repositório, já vazou."),
    ],
    followUp: {
      q: "Como garantir que a aplicação nem suba se faltar uma configuração obrigatória?",
      options: [
        P("@ConfigurationProperties com @Validated e @NotBlank nos campos: a aplicação falha na inicialização, com mensagem clara.", "Isso: falha cedo em vez de quebrar na primeira requisição."),
        L("Verifico no código quando for usar.", "Só descobre o erro em produção, na hora do uso."),
        E("Coloco um valor padrão para tudo.", "Esconde a configuração que faltou."),
      ],
    },
    checklist: ["Profiles", "@ConfigurationProperties", "Segredo em variável de ambiente ou secret manager", "Validação na subida"],
  },
  {
    id: "estereotipos",
    block: "spring",
    prompt: "Qual a diferença entre @Component, @Service e @Repository?",
    options: [
      P("As três registram um bean. @Service é só semântica, para indicar regra de negócio. @Repository também traduz exceções do banco para a hierarquia DataAccessException do Spring.", "Isso: lembrou da tradução de exceções, que é a diferença real."),
      L("Cada uma é para uma camada diferente.", "Certo, mas falta dizer que só @Repository muda comportamento."),
      E("@Service abre transação automaticamente.", "Transação só com @Transactional."),
    ],
    followUp: {
      q: "E @Controller x @RestController?",
      options: [
        P("@RestController é @Controller + @ResponseBody: o retorno dos métodos vira o corpo da resposta (JSON), em vez do nome de uma view.", "Isso."),
        L("Um é para REST e o outro para páginas.", "Certo, mas sem o mecanismo (@ResponseBody)."),
        E("@RestController só aceita GET.", "Aceita todos os verbos."),
      ],
    },
    checklist: ["Todas registram bean", "@Repository traduz exceções", "@RestController = @Controller + @ResponseBody"],
  },
  {
    id: "erros-padronizados",
    block: "spring",
    prompt: "Cada controller da nossa API devolve erro de um jeito. Como você padronizaria?",
    options: [
      P("Um @RestControllerAdvice com @ExceptionHandler por tipo de exceção, devolvendo ProblemDetail (RFC 9457) com o status certo. Erros de validação viram 400 com a lista de campos, e stack trace nunca vai para o cliente.", "Isso: um lugar só, formato padrão e cuidado com vazamento."),
      L("try/catch em cada controller devolvendo uma mensagem.", "Funciona, mas repete código e cada um acaba fazendo diferente."),
      E("Devolver 200 com um campo erro no JSON.", "Quebra a semântica HTTP: monitoramento e clientes não veem o erro."),
      E("Deixar o Spring mostrar a página de erro padrão.", "Vaza detalhes internos e não tem formato estável."),
    ],
    followUp: {
      q: "Que status você devolve quando uma regra de negócio é violada, como saldo insuficiente?",
      options: [
        P("422 (a requisição é válida, mas a regra impede), ou 409 se for conflito com o estado atual. Nunca 500, que é erro do servidor.", "Isso."),
        L("400.", "Aceitável, mas 400 costuma ser reservado para requisição mal formada."),
        E("500.", "500 diz que o servidor falhou, o que dispara alertas à toa."),
      ],
    },
    checklist: ["@RestControllerAdvice", "ProblemDetail (RFC 9457)", "400 com campos na validação", "422/409 para regra de negócio"],
  },
  {
    id: "boot-2-para-3",
    block: "spring",
    prompt: "Você vai migrar um serviço de Spring Boot 2.7 para 3. O que muda?",
    options: [
      P("Java 17 vira o mínimo, os pacotes javax.* viram jakarta.*, o Spring Security 6 usa SecurityFilterChain como bean (sai o WebSecurityConfigurerAdapter), a observabilidade passa para o Micrometer Observation e entra suporte a imagem nativa.", "Isso: as mudanças que quebram código."),
      L("É uma versão nova, com melhorias de performance.", "Genérico: não mostra que você já migrou ou estudou."),
      E("Deixa de usar Maven e passa a exigir Gradle.", "Os dois continuam suportados."),
    ],
    followUp: {
      q: "A migração quebrou centenas de imports javax.persistence. Como resolver sem fazer na mão?",
      options: [
        P("Uso o OpenRewrite com a receita de migração para Boot 3, que troca os imports para jakarta e atualiza a configuração. Depois confiro libs que ainda dependem de javax.", "Isso: ferramenta e o que conferir depois."),
        L("Buscar e substituir javax por jakarta.", "Funciona em parte, mas troca também javax.crypto, que não mudou."),
        E("Ficar no Java 11.", "Boot 3 exige Java 17."),
      ],
    },
    checklist: ["Java 17 mínimo", "javax → jakarta", "SecurityFilterChain", "OpenRewrite"],
  },

  // ───────────────────────── REST e segurança ─────────────────────────
  {
    id: "put-patch",
    block: "rest",
    prompt: "Qual a diferença entre PUT e PATCH? E quais verbos são idempotentes?",
    options: [
      P("PUT substitui o recurso inteiro (campo omitido é apagado) e PATCH altera só o que foi enviado. Idempotentes: GET, PUT, DELETE, HEAD e OPTIONS; repetir dá o mesmo estado final. POST não é, e PATCH pode não ser.", "Isso: semântica e idempotência com exemplo."),
      L("PUT atualiza tudo e PATCH atualiza parte.", "Certo, mas faltou idempotência."),
      E("PUT cria e PATCH atualiza.", "PUT pode criar, mas a diferença é substituir x alterar parte."),
    ],
    followUp: {
      q: "Por que idempotência importa na prática?",
      options: [
        P("Porque redes falham: cliente, gateway e retry automático reenviam requisições. Se a operação é idempotente, repetir é seguro.", "Isso: ligou ao mundo real (retries)."),
        L("Porque é uma regra do HTTP.", "É, mas não diz o problema que resolve."),
        E("Para deixar a API mais rápida.", "Não tem relação com velocidade."),
      ],
    },
    checklist: ["PUT substitui, PATCH altera parte", "Lista de idempotentes", "POST não é", "Retries tornam isso importante"],
  },
  {
    id: "401-403",
    block: "rest",
    prompt: "Qual a diferença entre 401 e 403?",
    options: [
      P("401 é \"não sei quem você é\": token ausente, inválido ou expirado; o cliente deve se autenticar. 403 é \"sei quem você é, mas você não pode\": autenticado sem permissão; repetir com o mesmo token não adianta.", "Isso: autenticação x autorização e o que o cliente faz em cada caso."),
      L("401 é não autenticado e 403 é não autorizado.", "Certo, mas falta o que o cliente faz em cada caso."),
      E("Os dois significam acesso negado e tanto faz.", "O cliente reage diferente: 401 pede login de novo."),
    ],
    followUp: {
      q: "Um usuário tenta ver o pedido de outro usuário pela URL /pedidos/123. O que você devolve?",
      options: [
        P("404, para não confirmar que o pedido existe (ou 403, conforme a política). E a checagem de dono tem que estar no backend, não só esconder o botão.", "Isso: falha de controle de acesso é o primeiro item do OWASP Top 10."),
        L("403.", "Correto, mas revela que o pedido 123 existe."),
        E("200, porque ele está logado.", "Isso é o furo de segurança mais comum em APIs."),
      ],
    },
    checklist: ["Autenticação x autorização", "O que o cliente faz em cada um", "Checagem de dono no backend", "Controle de acesso quebrado (OWASP)"],
  },
  {
    id: "pagamento-duplicado",
    block: "rest",
    prompt: "O app às vezes reenvia o POST /pagamentos quando a rede oscila, e cobramos o cliente duas vezes. Como evitar?",
    options: [
      P("Uso uma Idempotency-Key: o cliente gera um UUID por pagamento e manda no cabeçalho. Guardo a chave com UNIQUE no banco junto do resultado; se ela chegar de novo, devolvo a mesma resposta sem cobrar.", "Isso: chave do cliente e UNIQUE no banco evitam a corrida."),
      L("Verifico se existe um pagamento igual nos últimos minutos.", "Tem corrida (os dois checam ao mesmo tempo) e bloqueia compras legítimas repetidas."),
      E("Desabilito o botão no front depois do clique.", "Ajuda, mas o reenvio vem da rede e de retries, não do clique."),
      E("Troco POST por PUT.", "Mudar o verbo não muda o comportamento do servidor."),
    ],
    followUp: {
      q: "As duas requisições com a mesma chave chegam no mesmo milissegundo. E agora?",
      options: [
        P("A constraint UNIQUE decide: um INSERT vence e o outro falha. Quem falhou espera e lê o resultado do primeiro (ou recebe 409 enquanto ele processa).", "Isso: o banco serializa, não o código."),
        L("Uso synchronized no método.", "Não funciona com várias instâncias."),
        E("É raro demais para se preocupar.", "Retry automático faz isso acontecer bastante."),
      ],
    },
    checklist: ["Idempotency-Key gerada pelo cliente", "UNIQUE no banco", "Devolve a mesma resposta", "Corrida resolvida pela constraint"],
  },
  {
    id: "invalidar-jwt",
    block: "rest",
    prompt: "Um usuário trocou a senha porque foi invadido. Como invalidar o JWT dele antes de expirar?",
    options: [
      P("JWT é stateless, então não dá para \"apagar\". Uso access token curto (5 a 15 min) e refresh token guardado no servidor, que eu revogo. Para cortar na hora, guardo o jti numa lista de bloqueio no Redis até o token expirar, ou uma versão de token por usuário.", "Isso: entendeu o limite do stateless e as saídas."),
      L("Coloco uma expiração curta.", "Reduz a janela, mas não invalida na hora."),
      E("Apago o token do banco.", "JWT não fica no banco: a assinatura basta para ele ser aceito."),
      E("Troco a chave de assinatura.", "Funciona, mas desloga todos os usuários."),
    ],
    followUp: {
      q: "Como um microsserviço valida o token sem chamar o serviço de login a cada requisição?",
      options: [
        P("Com RS256: o serviço de login assina com a chave privada e publica a pública num endpoint JWKS. Cada serviço valida a assinatura e a expiração localmente (Resource Server do Spring Security).", "Isso."),
        L("Compartilhando o segredo HS256 entre os serviços.", "Funciona, mas qualquer serviço consegue emitir tokens."),
        E("Não dá: sempre precisa consultar o login.", "Validar sem consultar é a vantagem do JWT."),
      ],
    },
    checklist: ["JWT é stateless", "Access curto + refresh revogável", "Lista de bloqueio por jti", "RS256 e JWKS"],
  },
  {
    id: "versionar-api",
    block: "rest",
    prompt: "Precisamos mudar o formato da resposta de /clientes, mas três apps já usam a API. Como fazer sem quebrar ninguém?",
    options: [
      P("Mudança aditiva (campo novo) não quebra e dispensa versão. Se quebra, publico /v2 (ou versão em cabeçalho), mantenho /v1 com prazo de desligamento, aviso com o cabeçalho Deprecation e acompanho nos logs quem ainda chama a v1.", "Isso: separou mudança aditiva de quebra e planejou a saída."),
      L("Crio /v2 na URL.", "Certo, mas faltou como desligar a v1."),
      E("Mudo e aviso os times.", "Algum app vai quebrar em produção."),
    ],
    followUp: {
      q: "Que mudanças quebram contrato?",
      options: [
        P("Remover ou renomear campo, mudar tipo, tornar obrigatório um campo antes opcional, mudar status code ou significado. Adicionar campo opcional não quebra.", "Isso."),
        L("Qualquer mudança no JSON.", "Exagero: campo novo não quebra cliente bem feito."),
        E("Só mudanças na URL.", "Mudar o tipo de um campo quebra igual."),
      ],
    },
    checklist: ["Aditiva x quebra", "/v2 ou cabeçalho", "Prazo e Deprecation", "Medir quem ainda usa"],
  },
  {
    id: "api-externa-lenta",
    block: "rest",
    prompt: "A API de frete de um parceiro começou a demorar 30 segundos e derrubou a nossa API junto. O que você faz?",
    options: [
      P("Timeout curto no cliente HTTP (ex.: 2 s), retry só para erros temporários e com backoff, e circuit breaker (Resilience4j): depois de várias falhas, para de chamar por um tempo e usa um fallback, como frete padrão ou \"calcular depois\". Isolo as threads dessa chamada (bulkhead).", "Isso: o conjunto timeout, circuit breaker, fallback e bulkhead."),
      L("Coloco um timeout.", "Necessário, mas sozinho ainda gasta threads esperando a cada requisição."),
      E("Aumento o número de threads do Tomcat.", "Só adia: as novas threads também ficam presas."),
      E("Retry infinito até responder.", "Multiplica a carga sobre quem já está fora."),
    ],
    followUp: {
      q: "Por que retry sem backoff piora a situação?",
      options: [
        P("Todos os clientes repetem ao mesmo tempo e multiplicam a carga (retry storm). Backoff exponencial com jitter espalha as tentativas.", "Isso."),
        L("Porque gasta mais rede.", "Também, mas o problema é derrubar quem está se recuperando."),
        E("Não piora.", "Piora: é uma causa clássica de falha em cascata."),
      ],
    },
    checklist: ["Timeout", "Retry com backoff e jitter", "Circuit breaker", "Fallback", "Bulkhead"],
  },

  // ───────────────────────── SQL e JPA ─────────────────────────
  {
    id: "consulta-lenta",
    block: "dados",
    prompt: "Uma consulta que levava 50 ms passou a levar 8 segundos em produção. Qual o seu passo a passo?",
    options: [
      P("Pego a query real (log ou pg_stat_statements) e rodo EXPLAIN ANALYZE. Procuro Seq Scan em tabela grande e estimativa de linhas muito errada. Crio o índice que falta (composto, na ordem do filtro) ou reescrevo a query, e meço de novo. Também vejo se a tabela cresceu ou se as estatísticas estão velhas (ANALYZE).", "Isso: medir, ler o plano, corrigir, medir de novo."),
      L("Crio um índice na coluna do WHERE.", "Pode resolver, mas sem medir é chute."),
      E("Coloco cache na frente.", "Esconde o problema e cria dado velho."),
      E("Aumento a máquina do banco.", "Caro e não resolve um Seq Scan em 10 milhões de linhas."),
    ],
    followUp: {
      q: "Quando um índice piora a performance?",
      options: [
        P("Em tabela com muita escrita, porque todo INSERT e UPDATE atualiza cada índice. Também quando a coluna tem pouca seletividade (ex.: status com 3 valores), e o banco prefere ler a tabela inteira.", "Isso: custo na escrita e seletividade."),
        L("Quando há índices demais.", "Certo, mas sem o porquê."),
        E("Nunca, índice sempre ajuda.", "Toda escrita paga o custo de manter os índices."),
      ],
    },
    checklist: ["Pegar a query real", "EXPLAIN ANALYZE", "Seq Scan x Index Scan", "Índice composto e ordem", "Medir de novo"],
  },
  {
    id: "n-mais-1",
    block: "dados",
    prompt: "A tela \"meus pedidos\" faz 1 consulta para os pedidos e mais 1 para os itens de cada pedido. Com 200 pedidos, são 201 consultas. Como se chama e como resolve?",
    options: [
      P("É o problema N+1: a relação @OneToMany é LAZY e cada acesso a getItens() dispara uma consulta. Resolvo buscando junto com JOIN FETCH ou @EntityGraph, ou com uma projeção (DTO) só com o que a tela usa. Para achar, ligo o log de SQL ou conto as queries num teste.", "Isso: nome, causa, três correções e como detectar."),
      L("É N+1, resolvo com JOIN FETCH.", "Certo, mas faltou a causa (lazy) e como você perceberia."),
      E("Troco a relação para EAGER.", "EAGER continua fazendo N+1 em muitos casos e carrega itens em toda consulta, mesmo quando não precisa."),
      E("Coloco cache de segundo nível.", "Esconde o sintoma e complica a consistência."),
    ],
    followUp: {
      q: "JOIN FETCH com paginação (Pageable) dá algum problema?",
      options: [
        P("Sim: com coleção no JOIN FETCH, o Hibernate pagina em memória (aviso HHH90003004), trazendo tudo do banco. Pagino os IDs primeiro e busco os itens depois, ou uso @BatchSize.", "Isso: pegadinha real de produção."),
        L("Pode ficar lento.", "Vago."),
        E("Não, funciona normalmente.", "É um dos erros mais comuns com Spring Data."),
      ],
    },
    checklist: ["Nome: N+1", "Causa: LAZY acessado em loop", "JOIN FETCH, @EntityGraph ou DTO", "Detectar pelo log de SQL", "Cuidado com paginação"],
  },
  {
    id: "lazy-exception",
    block: "dados",
    prompt: "Ao serializar a entidade Pedido no controller, deu LazyInitializationException. Por quê?",
    options: [
      P("A coleção é LAZY e a sessão do Hibernate (a transação) já fechou quando o Jackson tentou ler. Não devolvo entidade na API: monto um DTO dentro da transação, buscando o que preciso com JOIN FETCH. E desligo spring.jpa.open-in-view para não esconder esse tipo de problema.", "Isso: causa, correção e o open-in-view."),
      L("Troco para EAGER.", "Resolve o erro, mas carrega dados demais em todo lugar."),
      E("Coloco @Transactional no controller.", "Mantém a transação aberta durante a serialização: esconde o problema e segura conexão."),
    ],
    followUp: {
      q: "Por que não devolver a entidade JPA diretamente na API?",
      options: [
        P("Expõe o modelo do banco (qualquer mudança quebra o contrato), pode vazar campos sensíveis, gera loops em relações bidirecionais e dispara lazy loading fora de hora.", "Isso."),
        L("Por questão de organização.", "Vago."),
        E("Não tem problema se usar @JsonIgnore.", "Remenda caso a caso e acopla a API ao banco."),
      ],
    },
    checklist: ["Sessão fechada + LAZY", "DTO montado na transação", "open-in-view desligado", "Não expor entidade"],
  },
  {
    id: "ultimo-item",
    block: "dados",
    prompt: "Dois clientes clicam em comprar o último item do estoque no mesmo instante e os dois conseguem. Como você evita?",
    options: [
      P("O código lê o estoque e depois grava: é lost update. Faço o banco decidir num comando só: UPDATE produto SET estoque = estoque - 1 WHERE id = ? AND estoque > 0, e confiro se afetou 1 linha. Alternativas: SELECT ... FOR UPDATE, ou @Version para lock otimista quando a disputa é rara.", "Isso: nomeou a corrida e deu a correção mais simples."),
      L("Coloco a operação dentro de uma transação.", "Em Read Committed (padrão do PostgreSQL), a transação sozinha não impede: os dois leem 1."),
      E("synchronized no método de compra.", "Não funciona com mais de uma instância."),
      E("Verifico o estoque duas vezes antes de gravar.", "A janela continua existindo."),
    ],
    followUp: {
      q: "E se forem 10 mil pessoas disputando 100 ingressos?",
      options: [
        P("A linha do estoque vira o gargalo (hot row) e todos esperam o mesmo lock. Uso fila virtual ou divido o estoque em lotes (várias linhas); lock otimista aqui desperdiça trabalho, porque quase todos recomeçam.", "Isso."),
        L("Lock otimista resolve.", "Com tanta disputa, quase todos falham e tentam de novo."),
        E("Não muda nada.", "Muda: a contenção numa linha limita a vazão."),
      ],
    },
    checklist: ["Lost update", "UPDATE atômico com WHERE", "FOR UPDATE ou @Version", "Read Committed não impede", "Hot row"],
  },
  {
    id: "sql-having",
    block: "dados",
    prompt: "Escreva a consulta: total de vendas por cliente nos últimos 30 dias, só de quem comprou mais de 3 vezes. Qual destas está certa?",
    options: [
      P("SELECT cliente_id, SUM(valor) FROM venda WHERE data >= now() - interval '30 days' GROUP BY cliente_id HAVING COUNT(*) > 3", "Isso: WHERE filtra linhas antes de agrupar; HAVING filtra grupos depois."),
      E("SELECT cliente_id, SUM(valor) FROM venda WHERE data >= now() - interval '30 days' AND COUNT(*) > 3 GROUP BY cliente_id", "COUNT não pode ir no WHERE: o WHERE roda antes do agrupamento."),
      L("SELECT cliente_id, SUM(valor) FROM venda GROUP BY cliente_id HAVING COUNT(*) > 3 AND MAX(data) >= now() - interval '30 days'", "Roda, mas soma vendas de todo o histórico e conta compras antigas."),
      E("SELECT cliente_id, valor FROM venda WHERE data >= now() - interval '30 days' GROUP BY cliente_id HAVING COUNT(*) > 3", "valor sem agregação dá erro no PostgreSQL."),
    ],
    followUp: {
      q: "Que índice ajudaria essa consulta?",
      options: [
        P("Um índice em venda(data), ou composto (data, cliente_id) incluindo valor (INCLUDE), para o banco ler só os 30 dias e talvez nem tocar na tabela.", "Isso: o filtro por data é o que reduz as linhas."),
        L("Índice em cliente_id.", "Ajuda o agrupamento, mas o banco ainda lê todo o histórico."),
        E("Índice em valor.", "valor não é filtrado nem agrupado."),
      ],
    },
    checklist: ["WHERE antes, HAVING depois", "GROUP BY com agregação", "Índice na coluna do filtro"],
  },
  {
    id: "transacao-isolamento",
    block: "dados",
    prompt: "O que é uma transação, o que significa ACID, e qual o nível de isolamento padrão do PostgreSQL?",
    options: [
      P("Um conjunto de operações que vale tudo ou nada. Atomicidade (tudo ou nada), Consistência (as regras e constraints valem no fim), Isolamento (transações simultâneas não se atrapalham, conforme o nível) e Durabilidade (commitou, sobrevive a queda). O padrão do PostgreSQL é Read Committed, que evita leitura suja, mas não lost update nem write skew.", "Isso: e já ligou o nível padrão às anomalias."),
      L("Transação é tudo ou nada; ACID são as quatro propriedades.", "Certo, mas faltou o isolamento na prática."),
      E("O padrão do PostgreSQL é Serializable.", "É Read Committed."),
    ],
    followUp: {
      q: "Se Serializable evita todas as anomalias, por que não usar sempre?",
      options: [
        P("Porque o banco aborta transações em conflito e a aplicação precisa repetir; com muita concorrência, isso vira muito retrabalho. Uso onde a regra exige e trato o erro com retry.", "Isso."),
        L("Porque é mais lento.", "Em parte. O ponto é ter que tratar abortos."),
        E("Porque não existe no PostgreSQL.", "Existe (SSI)."),
      ],
    },
    checklist: ["Tudo ou nada", "As quatro letras", "Read Committed é o padrão", "Serializable exige retry"],
  },

  // ───────────────────────── Microsserviços e mensageria ─────────────────────────
  {
    id: "outbox",
    block: "distribuidos",
    prompt: "O serviço de pedidos grava o pedido no banco e publica PedidoCriado no Kafka. Às vezes o pedido existe, mas o evento nunca saiu. Por quê, e como resolver?",
    options: [
      P("São dois sistemas sem transação comum: o app pode cair entre o commit e o envio (dual write). Uso Transactional Outbox: gravo o evento numa tabela outbox na mesma transação do pedido, e um processo (polling ou Debezium/CDC) publica e marca como enviado. Como pode publicar duas vezes, o consumidor precisa ser idempotente.", "Isso: nomeou o dual write, deu o outbox e a consequência (at-least-once)."),
      L("Publico o evento antes de gravar no banco.", "Inverte o problema: evento de um pedido que pode não existir."),
      E("Uso @Transactional no método que faz os dois.", "@Transactional não cobre o Kafka junto com o banco."),
      E("Retry no envio até dar certo.", "Se o processo cair, o retry morre junto."),
    ],
    followUp: {
      q: "Por que o consumidor precisa ser idempotente nesse desenho?",
      options: [
        P("Porque o relay pode publicar e cair antes de marcar como enviado, e o evento sai de novo. Guardo o id do evento processado (UNIQUE) e ignoro repetidos.", "Isso."),
        L("Por boa prática.", "Vago."),
        E("Não precisa: o Kafka garante entrega única.", "Exactly-once do Kafka não cobre o efeito no seu banco."),
      ],
    },
    checklist: ["Dual write", "Tabela outbox na mesma transação", "Relay por polling ou CDC", "At-least-once e consumidor idempotente"],
  },
  {
    id: "servico-caiu",
    block: "distribuidos",
    prompt: "O serviço de estoque caiu. O que acontece com o serviço de pedidos, que chama o estoque por REST?",
    options: [
      P("Sem proteção, as threads ficam presas esperando, o pedidos também cai e a falha se espalha em cascata. Protejo com timeout e circuit breaker, e penso se o pedido precisa mesmo de resposta síncrona: posso aceitar o pedido como pendente e reservar estoque por evento.", "Isso: cascata, proteção e repensar o acoplamento."),
      L("O pedidos retorna erro 503 para o cliente.", "Só se tiver timeout. Sem ele, trava antes."),
      E("Nada, cada serviço é independente.", "Chamada síncrona acopla a disponibilidade dos dois."),
    ],
    followUp: {
      q: "Qual o custo de trocar a chamada síncrona por evento?",
      options: [
        P("Consistência eventual: o pedido fica pendente até o estoque responder; preciso de estados intermediários, compensação (saga) se faltar estoque, e de monitorar mensagens paradas.", "Isso."),
        L("Fica mais complexo.", "Vago."),
        E("Nenhum.", "Sempre tem: o resultado deixa de ser imediato."),
      ],
    },
    checklist: ["Falha em cascata", "Timeout e circuit breaker", "Síncrono x assíncrono", "Consistência eventual e saga"],
  },
  {
    id: "ordem-kafka",
    block: "distribuidos",
    prompt: "Os eventos PedidoCriado, PedidoPago e PedidoEnviado de um mesmo pedido às vezes são processados fora de ordem. Como garantir a ordem?",
    options: [
      P("O Kafka só garante ordem dentro de uma partição. Publico com o id do pedido como chave: todos os eventos do pedido vão para a mesma partição e são lidos em ordem por um consumidor. Com produtor idempotente (padrão no Kafka 3+), retries não invertem a ordem.", "Isso: ordem por partição e chave certa."),
      L("Uso um tópico com uma partição só.", "Garante a ordem, mas mata o paralelismo."),
      E("O Kafka garante ordem no tópico inteiro.", "Só na partição."),
      E("Ordeno pelo timestamp no consumidor.", "O consumidor não sabe se um evento anterior ainda vai chegar."),
    ],
    followUp: {
      q: "Tenho 3 partições e 5 consumidores no mesmo grupo. O que acontece?",
      options: [
        P("Cada partição vai para um consumidor só do grupo: 3 trabalham e 2 ficam parados, de reserva. Para escalar além disso, preciso de mais partições.", "Isso: partições limitam o paralelismo."),
        L("Os 5 dividem a carga.", "Não: no máximo um consumidor por partição no grupo."),
        E("Cada mensagem é lida pelos 5.", "Isso acontece entre grupos diferentes, não no mesmo grupo."),
      ],
    },
    checklist: ["Ordem só na partição", "Chave = id do agregado", "Produtor idempotente", "Partições limitam consumidores"],
  },
  {
    id: "commit-offset",
    block: "distribuidos",
    prompt: "O consumidor processou a mensagem, gravou no banco e caiu antes de commitar o offset. O que acontece quando ele volta?",
    options: [
      P("Ele relê a partir do último offset commitado e processa a mesma mensagem de novo (at-least-once). Por isso o processamento precisa ser idempotente, por exemplo com o id do evento numa tabela com UNIQUE.", "Isso."),
      L("A mensagem é reprocessada.", "Certo, mas faltou como lidar."),
      E("A mensagem se perde.", "Perde se o commit vier antes do processamento (at-most-once). Aqui é o contrário."),
    ],
    followUp: {
      q: "Uma mensagem sempre falha (JSON inválido). Como evitar que ela trave a partição?",
      options: [
        P("Retry limitado com backoff e, depois disso, envio para um Dead Letter Topic (no Spring Kafka, DefaultErrorHandler + DeadLetterPublishingRecoverer), com alerta para alguém olhar.", "Isso."),
        L("Ignoro a mensagem.", "Perde dado sem ninguém saber."),
        E("Retry infinito.", "Trava a partição para sempre."),
      ],
    },
    checklist: ["Relê do último offset commitado", "At-least-once", "Consumidor idempotente", "Dead Letter Topic"],
  },
  {
    id: "kafka-rabbit",
    block: "distribuidos",
    prompt: "Quando você escolheria Kafka e quando RabbitMQ?",
    options: [
      P("Kafka é um log: guarda os eventos por um tempo, vários grupos leem o mesmo evento, dá para reprocessar desde o início e aguenta volume muito alto. RabbitMQ é fila com roteamento rico (exchanges direct, topic, fanout): a mensagem some depois do ack; é bom para tarefas e comandos com roteamento e prioridade.", "Isso: modelo de log x fila e casos de uso."),
      L("Kafka para muito volume, RabbitMQ para pouco.", "Simplifica demais: a diferença principal é log x fila."),
      E("São a mesma coisa.", "Os modelos são bem diferentes."),
    ],
    followUp: {
      q: "Precisamos reprocessar os eventos da semana passada porque havia um bug no consumidor. Qual dos dois facilita?",
      options: [
        P("Kafka: reseto o offset do grupo para a data desejada e reprocesso, desde que esteja dentro da retenção.", "Isso."),
        L("Os dois, se eu tiver backup.", "Possível, mas só o Kafka faz isso nativamente."),
        E("RabbitMQ, porque guarda tudo.", "O RabbitMQ apaga após o ack."),
      ],
    },
    checklist: ["Log x fila", "Retenção e replay", "Roteamento do RabbitMQ", "Caso de uso de cada um"],
  },
  {
    id: "monolito-microsservicos",
    block: "distribuidos",
    prompt: "Um time de 4 pessoas quer quebrar o monolito em 12 microsserviços. O que você acha?",
    options: [
      P("Provavelmente cedo demais. Microsserviços trocam complexidade de código por complexidade de operação: rede, deploy, observabilidade e consistência eventual. Com 4 pessoas, um monolito modular (módulos com fronteiras claras) dá a maior parte do ganho; extraio um serviço quando houver motivo concreto, como escala ou deploy independente.", "Isso: trade-off e alternativa intermediária."),
      L("Microsserviços escalam melhor, então vale.", "Escala por serviço é real, mas o custo de operação para 4 pessoas é alto."),
      E("Microsserviço é sempre melhor que monolito.", "Não existe sempre: depende do time e do problema."),
    ],
    followUp: {
      q: "Se for separar, um serviço pode ler direto o banco do outro?",
      options: [
        P("Não: cada serviço é dono dos seus dados. Ler o banco do outro acopla os dois pelo esquema; uso API ou eventos.", "Isso."),
        L("Só para leitura, pode.", "Ainda acopla: qualquer mudança de tabela quebra o outro."),
        E("Pode, é mais rápido.", "Vira um monolito distribuído."),
      ],
    },
    checklist: ["Custos de operação", "Monolito modular", "Motivo concreto para extrair", "Banco por serviço"],
  },

  // ───────────────────────── Testes, Git e boas práticas ─────────────────────────
  {
    id: "unidade-integracao",
    block: "qualidade",
    prompt: "Qual a diferença entre teste de unidade e de integração, e como você testaria um repositório com uma query nativa?",
    options: [
      P("Unidade testa uma classe isolada, rápido, com dependências falsas. Integração testa as peças juntas de verdade. A query nativa testo com @DataJpaTest e Testcontainers rodando o PostgreSQL real, porque H2 não se comporta igual (sintaxe, locks, tipos).", "Isso: e o motivo de não usar H2."),
      L("Unidade testa uma parte, integração testa o sistema todo.", "Certo, mas faltou o caso da query."),
      E("Testo a query com Mockito.", "Mock da query não testa a query."),
    ],
    followUp: {
      q: "Por que Testcontainers e não H2 em memória?",
      options: [
        P("H2 aceita SQL que o PostgreSQL rejeita e vice-versa, e não tem os mesmos locks e tipos (jsonb, arrays). Testcontainers sobe o banco igual ao de produção; com @ServiceConnection a configuração é automática.", "Isso."),
        L("Porque é mais moderno.", "Vago."),
        E("H2 é mais confiável.", "É mais rápido, não mais fiel."),
      ],
    },
    checklist: ["Isolado x junto", "@DataJpaTest", "Testcontainers", "H2 diverge do PostgreSQL"],
  },
  {
    id: "quando-nao-mockar",
    block: "qualidade",
    prompt: "Quando você NÃO usaria mock num teste?",
    options: [
      P("Para objetos de valor e lógica pura (é só usar o objeto real), para o banco (teste de integração vale mais) e para coisas que não são minhas, como o cliente HTTP de uma lib: aí uso um fake ou WireMock. Mock demais testa a implementação, não o comportamento, e quebra a cada refatoração.", "Isso: critério e o risco do excesso."),
      L("Quando a classe é simples.", "Vago."),
      E("Sempre uso mock para isolar.", "Testes ficam acoplados à implementação."),
    ],
    followUp: {
      q: "Como você testa um código que chama uma API externa de pagamento?",
      options: [
        P("Com WireMock simulando a API: resposta OK, erro 500, timeout e JSON inesperado. Assim testo meu cliente HTTP de verdade, inclusive timeout e retry.", "Isso: cobre os caminhos de falha."),
        L("Mock do service que chama a API.", "Não testa serialização, timeout nem erro HTTP."),
        E("Chamo a API real em sandbox.", "Teste lento, instável e dependente de terceiros."),
      ],
    },
    checklist: ["Objeto real para lógica pura", "Integração para banco", "WireMock para API externa", "Testar falhas"],
  },
  {
    id: "merge-rebase",
    block: "qualidade",
    prompt: "Qual a diferença entre merge e rebase, e quando não fazer rebase?",
    options: [
      P("Merge junta as histórias com um commit de merge e preserva tudo. Rebase reescreve os seus commits em cima da outra branch, deixando a história linear. Nunca faço rebase em branch que outras pessoas já usam, porque reescrever a história quebra o trabalho delas.", "Isso."),
      L("Rebase deixa a história mais limpa.", "Certo, mas faltou o risco."),
      E("São iguais, muda só o comando.", "Rebase reescreve commits."),
    ],
    followUp: {
      q: "Você subiu um commit com a senha do banco. O que faz?",
      options: [
        P("Primeiro troco a senha, porque ela já vazou. Depois removo do histórico (git filter-repo ou BFG) e passo a usar variável de ambiente ou secret manager.", "Isso: rotacionar vem antes de limpar."),
        L("git revert do commit.", "A senha continua no histórico."),
        E("Apago o arquivo e faço outro commit.", "Continua no histórico."),
      ],
    },
    checklist: ["Merge preserva, rebase reescreve", "Não rebasear branch compartilhada", "Rotacionar segredo vazado"],
  },
  {
    id: "inversao-dependencia",
    block: "qualidade",
    prompt: "Explique o princípio da Inversão de Dependência com um exemplo do seu dia a dia.",
    options: [
      P("O código de negócio depende de uma abstração, não do detalhe. Ex.: o service de cobrança depende de uma interface ProvedorPix; as implementações EfiPix e FakePix ficam no adaptador. Troco de provedor sem mexer na regra e testo com o fake. É a base da arquitetura hexagonal.", "Isso: definição, exemplo concreto e ganho."),
      L("Depender de abstrações e não de implementações.", "Definição certa, mas sem exemplo seu."),
      E("É o mesmo que injeção de dependência.", "DI é uma técnica que ajuda a aplicar o princípio."),
    ],
    followUp: {
      q: "Qual padrão de projeto você usou recentemente e por quê?",
      options: [
        P("Strategy: cada forma de cálculo de frete numa classe com a mesma interface, escolhida pelo tipo de entrega. Removeu um switch que crescia a cada novo tipo.", "Isso: padrão, onde e o problema resolvido."),
        L("Singleton, para ter uma instância só.", "Cuidado: os beans do Spring já são singletons e Singleton manual dificulta teste."),
        E("Não uso padrões, uso Spring.", "O Spring usa vários (proxy, factory, template)."),
      ],
    },
    checklist: ["Depender da abstração", "Exemplo real seu", "Troca e teste facilitados", "Padrão com problema que resolveu"],
  },
  {
    id: "tarefa-mal-especificada",
    block: "qualidade",
    prompt: "Você pegou uma tarefa na sprint e o critério de aceite está vago. O que faz?",
    options: [
      P("Antes de codar, levo dúvidas objetivas ao PO com exemplos (\"e se o cliente não tiver CPF?\"), escrevo os critérios combinados na própria tarefa e, se a dúvida for grande, divido a entrega para validar cedo.", "Isso: comunicação ativa e registro."),
      L("Pergunto ao PO.", "Certo, mas faltou registrar o combinado."),
      E("Faço do jeito que acho melhor e ajusto depois.", "Gera retrabalho."),
    ],
    followUp: {
      q: "Como você faz um bom code review?",
      options: [
        P("Olho primeiro se resolve o problema e se tem teste, depois design e legibilidade. Comento com o motivo e sugestão, separo o que bloqueia do que é opinião (\"nit\") e elogio o que está bom.", "Isso."),
        L("Procuro erros de padrão de código.", "Linter faz isso; o review é para o resto."),
        E("Aprovo se os testes passam.", "Teste passando não garante que resolve o problema certo."),
      ],
    },
    checklist: ["Perguntar cedo com exemplos", "Registrar critérios", "Entregar em partes", "Review com motivo"],
  },

  // ───────────────────────── Docker, CI/CD e observabilidade ─────────────────────────
  {
    id: "docker-multistage",
    block: "operacao",
    prompt: "Qual a diferença entre imagem e container, e por que usar Dockerfile multi-stage para uma app Java?",
    options: [
      P("Imagem é o pacote imutável em camadas; container é a imagem rodando, com seu próprio estado. No multi-stage, um estágio compila com Maven/JDK e o final copia só o .jar para uma imagem com JRE: fica bem menor, sem ferramentas de build e com menos superfície de ataque. Rodo como usuário não root.", "Isso: conceito e ganho concreto."),
      L("Container é a imagem em execução. Multi-stage deixa a imagem menor.", "Certo, mas faltou o porquê de ficar menor."),
      E("São a mesma coisa.", "Imagem é o molde; container é a instância."),
    ],
    followUp: {
      q: "Como passar a senha do banco para o container sem colocar na imagem?",
      options: [
        P("Variável de ambiente ou secret do orquestrador (Kubernetes Secret, ECS com Secrets Manager), injetada na hora de rodar. Nunca ENV ou COPY com segredo no Dockerfile, que fica gravado nas camadas.", "Isso."),
        L("Variável de ambiente.", "Certo, mas faltou o cuidado com o Dockerfile."),
        E("ENV DB_PASSWORD=... no Dockerfile.", "Fica gravado na imagem para quem tiver acesso."),
      ],
    },
    checklist: ["Imagem x container", "Build com JDK, runtime com JRE", "Usuário não root", "Segredo injetado ao rodar"],
  },
  {
    id: "api-lenta-15h",
    block: "operacao",
    prompt: "Todo dia, às 15h, a API fica lenta. Como você investiga?",
    options: [
      P("Começo pelas métricas: latência p95/p99 por endpoint, taxa de erro e vazão (RED), uso de CPU, GC e pool de conexões (Actuator + Micrometer no Grafana). Comparo com o que roda às 15h, como um job batch ou pico de tráfego. Depois sigo um trace lento (OpenTelemetry) e os logs com o mesmo ID de correlação.", "Isso: das métricas ao trace, com hipótese do horário."),
      L("Olho os logs.", "Logs ajudam, mas sem métricas você não sabe onde procurar."),
      E("Reinicio a aplicação às 14h50.", "Esconde o problema."),
    ],
    followUp: {
      q: "Por que olhar p95 e não a média de latência?",
      options: [
        P("A média esconde a cauda: 95% rápidas e 5% de 10 segundos ainda dão uma média boa. O p95 mostra o que 1 em cada 20 usuários sente.", "Isso."),
        L("Porque é o padrão do mercado.", "Vago."),
        E("Tanto faz.", "A média engana justamente quando há picos."),
      ],
    },
    checklist: ["Métricas RED", "JVM, GC e pool", "Correlacionar com o horário", "Trace e ID de correlação", "p95 x média"],
  },
  {
    id: "pipeline-rollback",
    block: "operacao",
    prompt: "Descreva uma pipeline de CI/CD para um serviço Spring Boot e como você faria rollback de um deploy com problema.",
    options: [
      P("No PR: build, testes de unidade e de integração (Testcontainers), análise de qualidade e cobertura. Na main: gera a imagem com a tag do commit, publica no registry e faz deploy gradual (rolling ou canary) observando erro e latência. Rollback é voltar para a tag anterior da imagem; migrações de banco precisam ser compatíveis com a versão anterior.", "Isso: etapas, imagem versionada e o cuidado com migração."),
      L("Build, testes e deploy no GitHub Actions.", "Certo, mas faltou rollback."),
      E("Rollback é reverter o commit e esperar a pipeline.", "Lento: a imagem anterior já existe."),
    ],
    followUp: {
      q: "O deploy incluiu uma migração que removeu uma coluna. O rollback da app quebrou. Como evitar?",
      options: [
        P("Migração em duas fases (expand and contract): primeiro adiciono o novo e paro de usar o antigo; só num deploy posterior removo a coluna. Assim a versão anterior sempre funciona com o banco atual.", "Isso."),
        L("Faço backup antes.", "Ajuda a recuperar, mas não evita a quebra."),
        E("Não dá para evitar.", "Dá: expand and contract."),
      ],
    },
    checklist: ["Etapas do PR e da main", "Imagem com tag do commit", "Deploy gradual", "Rollback por imagem", "Expand and contract"],
  },
  {
    id: "health-probes",
    block: "operacao",
    prompt: "Para que servem os health checks do Actuator, e qual a diferença entre liveness e readiness?",
    options: [
      P("Liveness diz se o processo está vivo; se falhar, o orquestrador reinicia o container. Readiness diz se está pronto para receber tráfego; se falhar, sai do balanceador sem reiniciar (ex.: ainda aquecendo ou sem banco). O Actuator expõe /actuator/health/liveness e /readiness.", "Isso: diferença e o que o orquestrador faz em cada caso."),
      L("Servem para saber se a aplicação está no ar.", "Faltou a diferença entre as duas."),
      E("São a mesma coisa.", "Uma reinicia, a outra só tira do tráfego."),
    ],
    followUp: {
      q: "Por que não colocar a checagem do banco no liveness?",
      options: [
        P("Se o banco cair, todos os containers reiniciam em loop sem resolver nada. Banco fora é caso de readiness.", "Isso."),
        L("Porque deixa o check lento.", "Também, mas o problema maior é o reinício em massa."),
        E("Deve colocar, para detectar tudo.", "Gera reinício em cascata."),
      ],
    },
    checklist: ["Liveness reinicia", "Readiness tira do tráfego", "Endpoints do Actuator", "Dependência externa só no readiness"],
  },
  {
    id: "logs-estruturados",
    block: "operacao",
    prompt: "Um cliente reclama de erro num pedido. Com 6 instâncias rodando, como você acha o log dessa requisição?",
    options: [
      P("Logs estruturados em JSON enviados para um lugar central (ELK, Loki, CloudWatch), com um ID de correlação (traceId) em cada linha. Com o traceId da requisição, filtro todos os logs dela em todos os serviços.", "Isso: centralização + correlação."),
      L("Entro em cada instância e procuro no arquivo de log.", "Funciona com 1 instância; com 6 e vários serviços, não escala."),
      E("Peço para o cliente repetir a operação.", "E se não repetir?"),
    ],
    followUp: {
      q: "O que nunca deve ir para o log?",
      options: [
        P("Senhas, tokens, dados de cartão e dados pessoais sensíveis (LGPD). Mascaro CPF e e-mail.", "Isso."),
        L("Informação demais.", "Vago."),
        E("Pode logar tudo, o log é interno.", "Log interno também vaza."),
      ],
    },
    checklist: ["JSON estruturado", "Log centralizado", "traceId / correlação", "Sem dados sensíveis"],
  },
];

export const questionsOf = (block: BlockId) => JAVA_PLENO.filter((q) => q.block === block);
export const getQuestion = (id: string) => JAVA_PLENO.find((q) => q.id === id);
