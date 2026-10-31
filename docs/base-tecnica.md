# Base técnica: plataforma de treino de System Design

> Documento de fundação do projeto. Objetivo: garantir que tudo o que a plataforma ensina, desenha e **simula** esteja tecnicamente correto. Escrito com olhar de engenheiro staff/principal.
> Data: 30/10/2026 · Status: v1 (vai evoluir junto com o produto)

---

## Sumário

1. [Resumo executivo](#1-resumo-executivo)
2. [Pesquisa de mercado e referências](#2-pesquisa-de-mercado-e-referências)
3. [Visão do produto: os 3 pilares](#3-visão-do-produto-os-3-pilares)
4. [Fundamentos técnicos (o que precisa estar certo)](#4-fundamentos-técnicos)
5. [Concorrência e race conditions (em profundidade)](#5-concorrência-e-race-conditions)
6. [Como simular: o motor da plataforma](#6-como-simular-o-motor-da-plataforma)
7. [Escalando de 0 a 1 milhão de usuários (trilha guiada)](#7-escalando-de-0-a-1-milhão-de-usuários)
8. [Catálogo de cenários de entrevista](#8-catálogo-de-cenários-de-entrevista)
9. [Framework de entrevista e rubrica de avaliação](#9-framework-de-entrevista-e-rubrica-de-avaliação)
10. [Design de produto e stack sugerida](#10-design-de-produto-e-stack-sugerida)
11. [Livros, papers e cursos](#11-livros-papers-e-cursos)
12. [Erros técnicos comuns (checklist de correção)](#12-erros-técnicos-comuns)
13. [Próximos passos / MVP](#13-próximos-passos--mvp)

---

## 1. Resumo executivo

A plataforma é um **ambiente de treino para entrevistas de system design** com três peças:

1. **Canvas (whiteboard)** estilo Excalidraw, onde a pessoa monta a arquitetura arrastando componentes (cliente, load balancer, servidor, cache, banco, fila, CDN...) e conectando-os.
2. **Simulador**: o desenho não é só um desenho. Cada componente tem capacidade, latência e modos de falha. Você joga carga (ex.: 1 milhão de usuários, pico de Black Friday) e vê **onde quebra**. Para concorrência, você vê **duas requisições se intercalando** e o dado ficando errado (race condition).
3. **Avaliação**: cenários de entrevista com requisitos, rubrica e feedback (inclusive por IA), cobrindo o que o entrevistador realmente cobra: requisitos, estimativas, trade-offs.

O diferencial frente ao que existe hoje: **a maioria das ferramentas avalia o desenho, mas não executa o desenho**. Simular de verdade (com números corretos) é o que transforma "decorar arquitetura" em "entender por que ela funciona".

---

## 2. Pesquisa de mercado e referências

### 2.1 Lucas Montano: System Design Arena

- Site: [systemdesignarena.com](https://systemdesignarena.com) (listado em [lucasmontano.com](https://lucasmontano.com/)).
- O que é: espaço de prática de system design, gratuito.
- Funcionalidades encontradas:
  - **Canvas "blueprint"** com drag-and-drop de componentes, conexões e anotações.
  - **Suporte a Mermaid** (você pode escrever o diagrama como código em vez de desenhar).
  - **Dois juízes de IA** com filosofias diferentes (rigor vs pragmatismo) que pontuam, debatem e chegam a um veredito de consenso, com feedback escrito.
  - **Biblioteca com ~27 artigos** (caching, sharding, filas, real-time...).
  - Problemas com dificuldade e tags: URL Shortener (fácil), News Feed, Rate Limiter, Chat (médios), Uber "motoristas próximos" e Video Streaming (difíceis).
- O que **não** encontrei: simulação de carga/falha. O foco é desenho + avaliação por IA.
- Lição para nós: a ideia de **dois avaliadores com visões opostas** é ótima e barata. O espaço livre é a **simulação**.

### 2.2 Ana Neri (Ana Neri Dev)

- Canal: [youtube.com/@AnaNeriDev](https://www.youtube.com/@AnaNeriDev). Engenheira de software sênior, foco em Java/Spring Boot ([sobre](https://ananeri.dev/aboutme-slug)).
- Palestra relevante: **"Seu sistema está pronto para o caos?"** (Platform Days 2025), sobre chaos engineering e testes de resiliência em sistemas distribuídos ([link](https://www.platform.rocks/en/speaker/ana-neri)).
- **Não consegui encontrar publicamente a plataforma de system design dela.** Se você tiver o link (Instagram, vídeo, landing page), me manda que eu complemento esta seção. O tema de **chaos engineering** dela encaixa perfeitamente no nosso simulador (injeção de falhas, seção 6.5).

### 2.3 Renato Augusto (referência técnica)

- Canal "renatoaugustotech" no YouTube. Temas mapeados: **CQRS** (banco normalizado para escrita + read model desnormalizado sincronizado via CDC, ex. Debezium/Kafka), **Server-Sent Events vs WebSockets**, microsserviços vs monolito e DDD, requisitos não funcionais (escalabilidade, alta disponibilidade, load balancing, picos de tráfego). Tem uma playlist de System Design (há um repositório de estudo de terceiros seguindo a playlist, com projetos de SSE + Redis Pub/Sub e load balancing: [github.com/rafaelcsilvadev/system-design-ranato-augusto](https://github.com/rafaelcsilvadev/system-design-ranato-augusto)).
- Ele também tem um roadmap chamado "The Architect's Map".
- **Não confirmei quais livros ele recomenda**; a seção 11 lista os livros canônicos que praticamente todo material de system design usa (DDIA, Alex Xu etc.).

### 2.4 Outras referências do mercado

| Referência | O que tem de útil para nós |
|---|---|
| [wander4747/system-design-simulator](https://github.com/wander4747/system-design-simulator) (open source, PT-BR) | **É o mais próximo do nosso simulador.** Modelo de fluxo ("fluid model") com passo de 0,1 s; usuários × req/s; LB round-robin/least-loaded; servidores e bancos com capacidade e fila limitada; cache com hit rate (e efeito avalanche quando o cache cai); fila absorvendo picos; injeção de falhas ("chaos"); painel "onde quebrou". Ótimo ponto de partida para estudar, com limitações (p99 é estimado, não medido; sem ciclos no grafo). |
| Hello Interview | Guias de entrevista muito bem estruturados (framework de entrevista, "deep dives"). Boa referência de **conteúdo** e rubrica. |
| ByteByteGo (Alex Xu) | Diagramas didáticos excelentes. Referência de **linguagem visual**. |
| Excalidraw | Referência de **UX de canvas**: traço "à mão", atalhos de teclado, simplicidade. Open source (MIT). |
| The System Design Primer (GitHub, donnemartin) | Conteúdo gratuito e amplo; bom índice de tópicos. |

---

## 3. Visão do produto: os 3 pilares

```
┌──────────────┐     ┌────────────────┐     ┌──────────────────┐
│   CANVAS     │ ──▶ │   SIMULADOR    │ ──▶ │   AVALIAÇÃO      │
│ (desenhar)   │     │ (executar)     │     │ (feedback/nota)  │
└──────────────┘     └────────────────┘     └──────────────────┘
  componentes          carga, falhas,          rubrica, IA,
  tipados +            concorrência,           métricas do
  conexões             métricas p50/p99        simulador
```

Ponto-chave de arquitetura: **o desenho precisa ser um grafo tipado** (nó = componente com parâmetros; aresta = chamada síncrona, assíncrona ou replicação). Um desenho livre de Excalidraw não é simulável. A solução é ter os dois: nós "inteligentes" (simuláveis) + anotações livres (setas, textos, rabiscos) no mesmo canvas.

Dois modos de simulação (detalhe na seção 6):

- **Modo Macro (escala)**: "aguenta 1M usuários?" Modelo de fluxo/filas, rápido, roda no navegador.
- **Modo Micro (concorrência)**: "o que acontece quando duas compras do último ingresso chegam ao mesmo tempo?" Simulação passo a passo de intercalações (interleavings), com linha do tempo.

---

## 4. Fundamentos técnicos

Esta seção é a "fonte da verdade" do conteúdo. Tudo que a plataforma ensinar ou simular deve bater com isto.

### 4.1 Números que todo engenheiro deve saber (ordens de grandeza)

Valores aproximados para hardware moderno; o que importa é a **ordem de grandeza**, não o número exato.

| Operação | Ordem de grandeza |
|---|---|
| Referência ao cache L1 | ~1 ns |
| Acesso à memória principal (RAM) | ~100 ns |
| Leitura aleatória em SSD NVMe | ~10–100 µs |
| Ler 1 MB sequencial da RAM | ~10–50 µs |
| Ler 1 MB sequencial de SSD | ~0,1–1 ms |
| Round trip dentro do mesmo datacenter | ~0,5 ms |
| Seek de disco rígido (HDD) | ~5–10 ms |
| Round trip entre continentes (ex. Brasil ↔ EUA leste) | ~100–150 ms |

Regras de bolso:
- RAM é ~1.000× mais rápida que SSD em acesso aleatório; rede no mesmo DC custa mais que uma leitura de SSD.
- **Distância física tem limite**: a luz na fibra anda ~200.000 km/s. Não existe otimização de software que tire 100 ms de um round trip intercontinental. Por isso CDNs e regiões existem.

### 4.2 Estimativas "back-of-the-envelope"

Fórmulas base:
- 1 dia = 86.400 s ≈ **10⁵ s** (arredondamento padrão em entrevista).
- **QPS médio** = (DAU × requisições por usuário por dia) / 86.400.
- **QPS de pico** ≈ 2× a 10× o médio (depende do domínio; e-commerce em Black Friday pode passar disso).
- **Armazenamento** = itens novos por dia × tamanho médio × dias de retenção × fator de replicação (geralmente 3).
- **Banda** = QPS × tamanho médio da resposta.

Exemplo (1M DAU, 20 requisições/usuário/dia, 70% leitura):
- 20M req/dia ÷ ~86.400 ≈ **~230 QPS médio**; pico (5×) ≈ **~1.200 QPS**.
- Isso **não** é muito. Um único servidor de aplicação bem feito aguenta isso; o gargalo costuma ser o banco, a latência de dependências e a disponibilidade (ter mais de uma máquina). Esta é uma das lições mais importantes: **1 milhão de usuários cadastrados ≠ 1 milhão de requisições por segundo.**

Capacidades típicas para estimar (muito dependentes de hardware, consulta e payload; use como ponto de partida, não como verdade):
- Servidor de aplicação stateless: centenas a alguns milhares de req/s por instância.
- PostgreSQL/MySQL em uma máquina: milhares a dezenas de milhares de queries simples por segundo (leituras indexadas); escritas são mais caras.
- Redis (uma instância): da ordem de ~100 mil operações simples por segundo.
- Kafka: centenas de MB/s por broker com batching.

> No simulador, esses valores devem ser **parâmetros editáveis** com defaults razoáveis, e a UI deve deixar claro que são aproximações.

### 4.3 Teoria de filas (a base matemática do simulador)

- **Lei de Little**: `L = λ × W`. Itens no sistema = taxa de chegada × tempo médio no sistema. Vale para qualquer sistema estável. Ex.: 1.000 req/s com 200 ms de latência ⇒ ~200 requisições simultâneas em voo (útil para dimensionar pool de conexões e threads).
- **Utilização** `ρ = λ / μ` (chegada ÷ capacidade). Se ρ ≥ 1, a fila cresce sem limite.
- **Latência explode perto de 100%**: no modelo M/M/1, tempo médio no sistema `W = 1 / (μ − λ)`. Com ρ = 50%, W = 2× o tempo de serviço; com ρ = 90%, **10×**; com 99%, **100×**. Por isso se opera com folga (ex. alvo de 60–70% de CPU), e por isso "está a 90% de CPU mas funcionando" é perigoso.
- **Latência de cauda (p99)**: médias escondem problemas. Se uma requisição de usuário faz *fan-out* para 100 serviços e cada um tem 1% de chance de ser lento, ~63% das requisições (1 − 0,99¹⁰⁰) pegam pelo menos um lento ("The Tail at Scale", Dean & Barroso). O simulador deve **medir** p50/p95/p99, não estimar.

### 4.4 Escalabilidade: vertical, horizontal e stateless

- **Vertical** (máquina maior): simples, tem teto e é ponto único de falha.
- **Horizontal** (mais máquinas): exige que o app seja **stateless**; sessão vai para um store compartilhado (Redis) ou token (JWT).
- **Load balancer**:
  - L4 (TCP/UDP): rápido, não olha conteúdo.
  - L7 (HTTP): roteia por path/header, termina TLS, faz retries.
  - Algoritmos: round robin, least connections, *power of two choices* (sorteia 2, pega o menos carregado: ótimo custo/benefício), hashing consistente (afinidade).
  - **Health checks** tiram instâncias doentes da rotação.

### 4.5 Cache

Padrões:
- **Cache-aside (lazy loading)**: app lê do cache; em miss, lê do banco e popula. O mais comum.
- **Read-through / write-through**: o cache fica no caminho; write-through escreve no cache e no banco de forma síncrona.
- **Write-behind (write-back)**: escreve no cache e persiste depois. Rápido, mas pode perder dados.

Problemas que o simulador deve mostrar:
- **Cache stampede (thundering herd)**: uma chave quente expira e milhares de requisições vão juntas ao banco. Soluções: *request coalescing* (singleflight: só uma busca no banco e as outras esperam), lock por chave, expiração antecipada probabilística, TTL com jitter.
- **Avalanche**: o cache inteiro cai (ou muitas chaves expiram ao mesmo tempo) e o banco recebe 100% do tráfego. Se o banco foi dimensionado assumindo 95% de hit rate, ele recebe **20×** a carga normal (de 5% para 100%) e cai.
- **Inconsistência no cache-aside** (race clássica): leitor A tem miss e lê valor antigo do banco → escritor B atualiza o banco e apaga a chave do cache → A grava o valor antigo no cache → cache fica stale até o TTL. Mitigações: TTL curto, *leases* (paper do Memcache no Facebook), versionamento, "delete atrasado". Este é um excelente cenário para o **Modo Micro**.
- **Hot key**: uma chave (celebridade, produto em promoção) satura um único nó do cache. Soluções: réplicas de leitura da chave, cache local (L1 in-process) com TTL curto, sufixar a chave e espalhar.
- Políticas de remoção: LRU, LFU, TTL.

### 4.6 Bancos de dados

- **SQL vs NoSQL** não é "escala vs não escala". A pergunta certa é: modelo de dados, padrões de acesso, necessidade de transações e joins, consistência.
- **Índices**: B-tree (leitura boa, padrão em Postgres/MySQL) vs LSM-tree (escrita muito alta; Cassandra, RocksDB). Índice acelera leitura e **encarece escrita**.
- **Replicação**:
  - Líder-seguidor (primary/replica): escritas no líder, leituras nas réplicas. Replicação assíncrona gera **replication lag**: o usuário edita o perfil, recarrega, cai numa réplica atrasada e vê o dado antigo. Solução: *read-your-writes* (ler do líder por alguns segundos após escrever, ou por versão).
  - Multi-líder: escrita em várias regiões; exige resolução de conflitos.
  - Sem líder (Dynamo/Cassandra): quóruns. Com N réplicas, escreve em W e lê de R; **se W + R > N**, os conjuntos se sobrepõem e a leitura vê pelo menos uma cópia da última escrita confirmada. Atenção: isso **não** garante linearizabilidade sozinho (há casos de borda com escritas concorrentes, *sloppy quorum*, falhas no meio da escrita; ver DDIA cap. 5).
- **Particionamento (sharding)**:
  - Por faixa (range): bom para consultas por intervalo; risco de hotspot (ex. tudo de "hoje" no mesmo shard).
  - Por hash: distribui bem; perde consultas por intervalo.
  - **Hash consistente** com nós virtuais: ao adicionar/remover um nó, só ~K/N chaves se movem (e não quase todas, como no `hash % N`).
  - Escolha da chave de partição é a decisão mais importante: ela define hotspots e quais queries viram *scatter-gather*.
- **Transações e ACID**: ver seção 5 (níveis de isolamento).

### 4.7 Consistência, CAP e PACELC

- **CAP** (forma correta): durante uma **partição de rede**, você escolhe entre consistência (linearizável) e disponibilidade. Fora de partições, o teorema não diz nada. "CA" não é uma opção real em sistema distribuído, porque partições acontecem.
- **PACELC**: se há Partição, A ou C; **Else** (operação normal), Latência ou Consistência. Mais útil no dia a dia.
- Modelos de consistência (do mais forte ao mais fraco, simplificando): linearizável → sequencial → causal → *read-your-writes* / leituras monotônicas → eventual.
- **Consenso** (Raft, Paxos): um cluster de 2f + 1 nós tolera f falhas (3 nós toleram 1; 5 toleram 2). Usado em etcd, ZooKeeper, Consul, e internamente em bancos como CockroachDB.

### 4.8 Mensageria e processamento assíncrono

- **Fila** (RabbitMQ, SQS): cada mensagem processada por um consumidor; bom para jobs.
- **Log/stream** (Kafka): mensagens retidas, vários grupos de consumidores leem de forma independente; **ordem garantida só dentro de uma partição**.
- **Semânticas de entrega**:
  - *at-most-once*: pode perder.
  - *at-least-once*: pode duplicar (o padrão prático).
  - *exactly-once* de ponta a ponta na prática = **at-least-once + processamento idempotente** (ou transações dentro do próprio ecossistema, como as transações do Kafka entre tópicos Kafka).
- **Idempotência**: processar a mesma mensagem 2× tem o mesmo efeito que 1×. Técnicas: *idempotency key* (ex. header `Idempotency-Key` em pagamento), tabela de mensagens processadas, upsert, operações condicionais.
- **Back-pressure**: a fila absorve picos, mas se a produção for maior que o consumo por muito tempo, ela cresce sem fim. É preciso limite, descarte ou desacelerar o produtor.
- **Outbox pattern**: para não ter "salvei no banco mas não publiquei o evento" (*dual write*), grava o evento numa tabela outbox na **mesma transação** e um processo (ou CDC, ex. Debezium) publica depois.
- **Sagas** vs **2PC**: 2PC é bloqueante (se o coordenador cai, participantes ficam travados); sagas usam passos locais com **compensações**, aceitando consistência eventual.
- **CQRS** (Renato Augusto cobre bem): separar modelo de escrita e de leitura; o read model é eventualmente consistente.

### 4.9 Resiliência

- **Timeouts** em toda chamada de rede. Sem timeout, uma dependência lenta esgota threads/conexões e derruba quem chama (falha em cascata).
- **Retries com backoff exponencial + jitter** (de preferência "full jitter"). Retry sem jitter sincroniza os clientes e cria ondas de carga.
- **Retry storm**: se cada uma de 3 camadas faz 3 tentativas, uma falha no fundo pode virar 3³ = **27×** a carga. Solução: retry em uma camada só, *retry budget*, circuit breaker.
- **Circuit breaker**: após X falhas, abre e falha rápido; depois testa (*half-open*).
- **Bulkhead**: isolar pools de recursos para que uma dependência ruim não consuma tudo.
- **Rate limiting e load shedding**: rejeitar cedo (HTTP 429/503) é melhor que aceitar e travar.
- **Degradação graciosa**: desligar recomendações, mas manter o checkout.
- **Disponibilidade**: 99,9% = ~8,8 h fora por ano (~43 min/mês); 99,99% = ~53 min por ano. Componentes **em série** multiplicam disponibilidade (0,999 × 0,999 ≈ 0,998); **redundância em paralelo** aumenta (1 − 0,001² = 0,999999, assumindo falhas independentes, o que raramente é totalmente verdade).

### 4.10 Algoritmos de rate limiting

| Algoritmo | Como funciona | Prós / contras |
|---|---|---|
| Token bucket | Balde com capacidade B, recarrega r tokens/s; cada req gasta 1 | Permite rajadas até B; muito usado |
| Leaky bucket | Fila que escoa a taxa fixa | Suaviza saída; rajadas viram espera ou descarte |
| Janela fixa | Contador por janela (ex. por minuto) | Simples; na virada da janela permite até ~2× o limite |
| Log de janela deslizante | Guarda timestamp de cada req | Exato; caro em memória |
| Contador de janela deslizante | Média ponderada da janela atual e anterior | Aproximação boa e barata |

Em ambiente distribuído, o contador costuma ficar no Redis, e a operação "ler + incrementar + checar" precisa ser **atômica** (script Lua ou `INCR` + `EXPIRE`). Senão, vira race condition (ver seção 5).

### 4.11 Comunicação em tempo real

- **Polling**: simples, desperdiça requisições.
- **Long polling**: servidor segura a requisição até ter dado.
- **SSE (Server-Sent Events)**: servidor → cliente, sobre HTTP, texto, reconexão automática no browser. Em HTTP/1.1 o browser limita ~6 conexões por domínio (problema com várias abas); em HTTP/2 isso some por multiplexação.
- **WebSocket**: bidirecional, conexão persistente. Exige pensar em LB com conexões longas, *sticky sessions* ou um pub/sub (Redis, Kafka) para entregar mensagens a usuários conectados em outro servidor.

### 4.12 Outros blocos recorrentes

- **IDs únicos distribuídos**: UUID v4 (aleatório, ruim para índice B-tree), UUID v7/ULID (ordenáveis no tempo), **Snowflake** (64 bits: 1 bit de sinal + 41 de timestamp em ms + 10 de máquina + 12 de sequência ⇒ 4.096 IDs/ms por máquina).
- **Bloom filter**: "talvez esteja" ou "certamente não está". **Não tem falso negativo**, só falso positivo.
- **Geoespacial**: geohash, quadtree, S2/H3 (para "motoristas próximos").
- **CDN**: conteúdo estático (e às vezes dinâmico) perto do usuário; invalidação é o ponto difícil.
- **Object storage** (S3): para blobs (imagens, vídeos); o banco guarda só os metadados e a URL.
- **Busca**: índice invertido (Elasticsearch/OpenSearch), alimentado por CDC ou eventos.

---

## 5. Concorrência e race conditions

Este é o tema em que a plataforma pode ser **muito** melhor que tudo o que existe, porque race condition é difícil de explicar com diagrama estático e fácil de entender quando você vê a intercalação.

### 5.1 O que é

Uma race condition acontece quando o resultado depende da **ordem (intercalação)** de operações concorrentes sobre um estado compartilhado, e alguma ordem produz um resultado errado.

### 5.2 Anomalias clássicas (cada uma vira um cenário do Modo Micro)

**a) Lost update (atualização perdida)**: o mais comum.
```
estoque = 1
T1: lê estoque (1)
T2: lê estoque (1)
T1: escreve estoque = 0   → vendeu
T2: escreve estoque = 0   → vendeu de novo!  (overselling)
```
Correções, da mais simples à mais complexa:
1. **Operação atômica no banco**: `UPDATE produtos SET estoque = estoque - 1 WHERE id = ? AND estoque > 0` e checar *linhas afetadas*. Resolve a maioria dos casos.
2. **Lock pessimista**: `SELECT ... FOR UPDATE` dentro da transação.
3. **Lock otimista**: coluna `version`; `UPDATE ... SET ..., version = version + 1 WHERE id = ? AND version = ?`; se 0 linhas, tenta de novo.
4. **Compare-and-set** em stores chave-valor (ex. `WATCH`/`MULTI` no Redis, condicional no DynamoDB).

**b) Write skew**: duas transações leem o mesmo conjunto, cada uma escreve em uma linha **diferente**, e juntas violam uma regra.
Exemplo clássico (DDIA): pelo menos 1 médico deve estar de plantão. Alice e Bob estão de plantão; os dois pedem para sair ao mesmo tempo; cada transação vê "tem 2, posso sair"; os dois saem; zero de plantão. Lock de linha simples não resolve, porque cada um escreve numa linha diferente. Correções: isolamento **Serializable**, `SELECT ... FOR UPDATE` nas linhas lidas, ou materializar o conflito (uma linha que ambos precisam travar).

**c) Double booking / double spending**: variação de write skew (dois usuários reservam o mesmo assento/horário). Correções: constraint de unicidade no banco (`UNIQUE (assento_id, sessao_id)`), lock, ou reserva com expiração.

**d) Leitura suja / leitura não repetível / phantom**: ver tabela 5.3.

**e) Check-then-act fora do banco**: "se o usuário não existe, cria" em duas chamadas → dois registros. Correção: constraint `UNIQUE` + tratar erro de duplicidade (ou upsert).

**f) Duplicidade por retry**: o cliente dá timeout, tenta de novo, e a primeira tentativa na verdade tinha funcionado → cobrança dupla. Correção: **idempotency key**.

### 5.3 Níveis de isolamento (atenção aos detalhes: é onde mais se erra)

| Nível (padrão SQL) | Previne | Ainda permite |
|---|---|---|
| Read Uncommitted | — | dirty read, e todo o resto |
| Read Committed | dirty read | non-repeatable read, lost update, write skew, phantom |
| Repeatable Read | + non-repeatable read | (no padrão SQL) phantom; write skew |
| Serializable | tudo | — (ao custo de locks ou abortos) |

Detalhes por banco que a plataforma **precisa** acertar:
- **PostgreSQL**: padrão é **Read Committed**. Seu *Repeatable Read* é, na prática, **Snapshot Isolation**: não tem phantom, e detecta lost update (aborta com erro de serialização quando duas transações atualizam a mesma linha), mas **permite write skew**. *Serializable* usa **SSI** (Serializable Snapshot Isolation) e previne write skew abortando uma das transações; a aplicação precisa **tentar de novo**.
- **MySQL/InnoDB**: padrão é **Repeatable Read**, mas o comportamento é diferente do Postgres: leituras comuns usam snapshot, porém `UPDATE` e leituras com lock enxergam a versão mais recente, e o padrão "ler com SELECT, calcular na aplicação, gravar com UPDATE" **sofre lost update sem erro**. Usa *gap locks* / *next-key locks* para reduzir phantoms em leituras com lock.
- Moral para o conteúdo: **o nome do nível não diz exatamente o que o banco garante**. Ensinar com exemplos executáveis é o caminho.

### 5.4 Locks distribuídos

- Lock no Redis (`SET chave valor NX PX 30000`) funciona como **otimização** (evitar trabalho duplicado), mas não é seguro para **correção** sozinho: se o processo pausa (GC, swap) além do TTL, o lock expira, outro processo pega, e os dois acham que têm o lock.
- A correção exige **fencing tokens**: o serviço de lock entrega um número crescente; o recurso protegido rejeita escritas com token menor que o último visto (argumento de Martin Kleppmann, "How to do distributed locking", 2016, crítica ao Redlock).
- Para coordenação forte use algo com consenso (etcd, ZooKeeper) ou, frequentemente, **o próprio banco** (constraint, `SELECT FOR UPDATE`, advisory locks).
- Esse cenário (processo pausa, lock expira, dois escritores) é perfeito para o Modo Micro com um botão "pausar processo (GC)".

### 5.5 Relógios e ordenação

- Relógios de máquinas diferentes divergem (*clock skew*); NTP ajusta, mas pode até voltar no tempo. **Last-write-wins por timestamp pode descartar escritas silenciosamente.**
- Ordenação lógica: relógios de Lamport, *vector clocks*. O Spanner usa TrueTime (incerteza de relógio limitada, com espera ativa) para ter ordenação global.

---

## 6. Como simular: o motor da plataforma

### 6.1 Princípio

> A simulação precisa ser **determinística e reproduzível** (mesma seed ⇒ mesmo resultado), **explicável** (todo número tem um porquê na UI) e **honesta** (deixa claro o que é modelo simplificado).

### 6.2 Dois motores

**Motor Macro: simulação de eventos discretos (DES) com amostragem**, ou modelo de fluxo para escala muito grande.
- Fila de eventos (priority queue por tempo) + RNG com seed.
- Cada nó é uma estação de serviço: `capacidade` (workers/concorrência), `tempo de serviço` (distribuição, ex. lognormal, que tem cauda mais realista que a exponencial), `tamanho da fila`, `timeout`.
- Requisições são entidades que percorrem o grafo; isso permite **medir** p50/p95/p99 de verdade.
- Para "1 milhão de usuários" não é preciso simular 1M de entidades: simula-se a **taxa** (ex. 1.200 req/s) e, se for pesado demais, faz-se amostragem (simular 1 em cada k requisições e escalar) ou usa-se o modelo de fluxo, como o simulador do wander4747.
- Recomendação: **DES como padrão** (mede cauda, timeouts e retries corretamente) com fallback de fluxo para cargas gigantes. Rodar em **Web Worker** para não travar a UI.

**Motor Micro: intercalação de passos (concorrência)**.
- Cada "transação/requisição" é uma lista de **passos atômicos** sobre um estado compartilhado: `read(x)`, `compute`, `write(x)`, `lock(x)`, `unlock(x)`, `begin`, `commit`.
- Um **scheduler** escolhe qual passo roda a seguir:
  - modo manual (o usuário clica em quem anda: ótimo para aprender);
  - modo aleatório com seed;
  - modo **exaustivo**: enumera todas as intercalações (viável para 2–3 transações com poucos passos) e mostra "em X de Y ordens possíveis o estoque fica negativo". Isso é, na prática, um *model checker* simples, e é um diferencial forte.
- Implementar um **mini-banco** com: locks de linha, versão (lock otimista) e snapshots (MVCC simplificado) para mostrar a diferença entre Read Committed, Snapshot Isolation e Serializable.
- Visualização: **diagrama de sequência / linha do tempo** com uma raia por transação e o estado compartilhado ao lado.
- Invariantes declarativas por cenário (ex. `estoque >= 0`, `plantonistas >= 1`): o simulador destaca o passo exato em que a invariante quebrou.

### 6.3 Parâmetros por componente (defaults editáveis)

| Componente | Parâmetros | Comportamento a modelar |
|---|---|---|
| Cliente/usuários | usuários, req/usuário, padrão (constante, onda, rampa, pico) | gerador de carga |
| DNS/CDN | hit rate, latência de borda | serve hits; miss vai à origem |
| Load balancer | algoritmo, health check | distribui; tira nós doentes |
| Servidor app | instâncias, workers, tempo de serviço, timeout | fila + saturação; autoscaling opcional (com atraso de minutos!) |
| Cache | hit rate, TTL, capacidade, ops/s | stampede, avalanche, hot key |
| Banco | réplicas, lag de replicação, conexões máx., tempo de leitura/escrita, shards | pool esgota, lag, hotspot de shard |
| Fila/stream | partições, taxa de consumo, tamanho máx. | acúmulo, back-pressure, reordenação entre partições |
| Workers assíncronos | instâncias, tempo por mensagem | consumo; duplicatas (at-least-once) |
| Object storage | latência, banda | blobs |
| Serviço externo | latência, taxa de erro | dependência lenta ⇒ cascata |

Arestas: **síncrona** (soma latência, propaga erro, respeita timeout), **assíncrona** (não soma latência para o usuário), **replicação** (com lag).

### 6.4 Métricas exibidas

- Throughput (req/s) por nó e aresta; utilização (ρ); tamanho de fila.
- Latência p50/p95/p99 de ponta a ponta e por nó.
- Taxa de erro (timeouts, rejeições, drops).
- Custo estimado (opcional, ótimo para trade-offs: "reduzi p99 em 40% mas dobrei o custo").
- **Painel "onde quebrou"**: identifica o gargalo (nó com maior ρ ou que causa mais erro) e sugere padrões (cache, réplica, fila, shard).

### 6.5 Injeção de falhas (chaos engineering, ponte com o tema da Ana Neri)

- Derrubar nó / zona / região.
- Latência extra numa dependência.
- Partição de rede entre dois nós (para CAP na prática: o sistema escolhe rejeitar escrita ou aceitar e divergir).
- Cache flush total (avalanche).
- Pausa de processo (GC) para o cenário de lock distribuído.
- Perda/duplicação/reordenação de mensagens na fila.

### 6.6 Validação do próprio simulador (para garantir correção)

- **Testes contra teoria**: para um nó M/M/1 simulado, a latência média medida deve convergir para `1/(μ − λ)`; a Lei de Little deve valer nas métricas medidas. Estes testes entram no CI.
- **Testes de cenário dourado**: o cenário "lost update" com Read Committed e leitura-cálculo-escrita **deve** produzir a anomalia em alguma intercalação; com `UPDATE ... WHERE estoque > 0` **nunca** deve.
- Revisão técnica de cada cenário antes de publicar (checklist da seção 12).

---

## 7. Escalando de 0 a 1 milhão de usuários

Trilha guiada clássica (inspirada no cap. 1 do *System Design Interview* de Alex Xu e nos vídeos de escala). Cada etapa é um nível no simulador: o usuário recebe a carga, vê quebrar, aplica a melhoria e vê o efeito.

| Etapa | Arquitetura | O que quebra / por que evoluir |
|---|---|---|
| 0 | Tudo em 1 servidor (app + banco) | Ponto único de falha; CPU/RAM compartilhadas |
| 1 | App e banco separados | Escalam de forma independente; ainda SPOF |
| 2 | Load balancer + N servidores stateless | Sessão precisa sair da memória do servidor |
| 3 | Réplicas de leitura do banco | Leitura escala; aparece **replication lag** (ensinar read-your-writes) |
| 4 | Cache (Redis) | Banco alivia; aparecem invalidação, stampede, avalanche |
| 5 | CDN para estáticos | Latência global cai; invalidação de CDN |
| 6 | Filas + workers para tarefas lentas | Latência do usuário cai; aparecem duplicatas e idempotência |
| 7 | Múltiplas zonas / datacenters | Disponibilidade; aparecem roteamento geográfico e replicação entre regiões |
| 8 | Sharding do banco | Escrita escala; aparecem chave de partição, hotspot, queries entre shards |
| 9 | Observabilidade + autoscaling | Métricas, logs, tracing; autoscaling tem atraso (não salva pico instantâneo) |

Mensagem pedagógica central: **cada passo resolve um gargalo e cria um problema novo**. Entrevista de system design é sobre saber esse trade-off, não sobre empilhar componentes.

Conta de sanidade para o nível final (1M DAU, ver 4.2): ~230 QPS médio e ~1.200 QPS de pico. O usuário deve perceber que, para esse número, a etapa 8 (sharding) **provavelmente é desnecessária**; ela entra quando a escrita ou o volume de dados passam do que uma máquina aguenta. Ensinar a **não** superdimensionar também conta ponto em entrevista.

---

## 8. Catálogo de cenários de entrevista

Cada cenário tem: requisitos funcionais e não funcionais, estimativas esperadas, pontos de deep dive, armadilhas e o que dá para simular.

| # | Cenário | Nível | Conceitos centrais | Simulação de destaque |
|---|---|---|---|---|
| 1 | Encurtador de URL | Fácil | geração de ID (base62: 7 caracteres ≈ 3,5 trilhões de combinações), cache de leitura (muito mais leitura que escrita), redirect 301 vs 302 (302 permite contar cliques) | hot links + cache; colisão de ID |
| 2 | Rate limiter | Médio | algoritmos da 4.10, Redis atômico, onde colocar (gateway) | rajada na virada da janela fixa; race sem atomicidade |
| 3 | Venda de ingressos / estoque (Ticketmaster, Black Friday) | Médio | lost update, double booking, reserva temporária com expiração, fila virtual | **Modo Micro**: overselling e as 4 correções |
| 4 | Feed de notícias (Twitter/Instagram) | Médio | fan-out on write vs on read, híbrido para celebridades, cache de timeline | celebridade com 10M seguidores no fan-out on write |
| 5 | Chat (WhatsApp) | Médio | WebSocket, presença, ordenação por conversa, entrega offline, pub/sub entre servidores | servidor de conexões cai; mensagens fora de ordem |
| 6 | Notificações | Médio | filas, retries, idempotência, preferências, provedores externos lentos | provedor de push lento ⇒ back-pressure |
| 7 | Pagamentos / carteira | Difícil | idempotency key, ledger de dupla entrada, sagas, reconciliação, exatamente-uma-vez | timeout + retry ⇒ cobrança dupla; correção com idempotência |
| 8 | Motoristas próximos (Uber) | Difícil | geohash/quadtree, atualizações de localização em alta frequência, matching | escrita intensa de localização |
| 9 | Streaming de vídeo (YouTube/Netflix) | Difícil | upload, transcoding assíncrono, CDN, adaptive bitrate (HLS/DASH) | pico de lançamento; CDN miss |
| 10 | Autocomplete / busca | Médio | trie, top-k, índice invertido, atualização em batch | latência p99 com fan-out |
| 11 | Key-value store distribuído (Dynamo) | Difícil | hash consistente, quóruns, vector clocks, hinted handoff, gossip | partição de rede + quórum |
| 12 | Web crawler | Médio | fila de URLs, politeness, dedup (Bloom filter), DNS | domínio lento; dedup |
| 13 | Contador de visualizações / likes em alta escala | Médio | contadores agregados em shards, eventual consistency, batching | hot key de post viral |
| 14 | Distributed job scheduler | Difícil | lease, at-least-once, lock com fencing token | pausa de GC ⇒ job duplicado |
| 15 | Escalar para 1M usuários (trilha) | Progressivo | seção 7 | todos |

Sugestão de ordem para o MVP: 1, 2, 3, 4, 15 (cobre leitura pesada, atomicidade, concorrência, fan-out e escala).

---

## 9. Framework de entrevista e rubrica de avaliação

### 9.1 Roteiro (45–60 min) que a plataforma deve guiar

1. **Requisitos (5–10 min)**: funcionais (o que faz) e não funcionais (escala, latência, consistência, disponibilidade). Definir o que está **fora** do escopo.
2. **Estimativas (≈5 min)**: QPS, armazenamento, banda; só as que mudam decisões.
3. **API e modelo de dados (≈5 min)**: endpoints principais e entidades.
4. **Desenho de alto nível (10–15 min)**: o caminho de uma requisição de ponta a ponta.
5. **Deep dives (15–20 min)**: 2–3 pontos difíceis (gargalo, consistência, falha).
6. **Trade-offs e evolução**: o que muda com 10× de carga; o que monitorar.

### 9.2 Rubrica (o que entrevistadores avaliam)

| Dimensão | Sinal forte | Sinal fraco |
|---|---|---|
| Escopo e requisitos | Pergunta, prioriza, define não funcionais com números | Começa desenhando sem perguntar |
| Estimativas | Conta simples que muda uma decisão | Contas longas e irrelevantes, ou nenhuma |
| Desenho | Fluxo claro de leitura e escrita | Caixas soltas, sem fluxo de dados |
| Profundidade | Explica *como* (ex. como o cache é invalidado) | Só nomeia tecnologias ("usa Kafka") |
| Trade-offs | Compara alternativas e justifica | Uma única opção, sem justificar |
| Falhas | Pensa em "e se X cair?" | Assume que nada falha |
| Comunicação | Conduz, verifica com o entrevistador | Monólogo ou silêncio |

### 9.3 Avaliação na plataforma

- **Métricas objetivas do simulador**: o design aguenta a carga-alvo? p99 dentro do SLO? sobrevive à falha injetada? A invariante do Modo Micro se mantém em todas as intercalações?
- **Avaliação por IA** com a rubrica acima (a ideia dos "dois juízes" do System Design Arena funciona bem; podemos ter juízes como "entrevistador de big tech" e "staff pragmático de startup").
- **Mock interview**: IA no papel de entrevistador, fazendo perguntas de follow-up ("e se o Redis cair?") com timer.

---

## 10. Design de produto e stack sugerida

### 10.1 Referências visuais (linha "dev")

- **Excalidraw**: traço à mão (via rough.js), simplicidade, atalhos. Referência principal para o canvas.
- **Linear / Vercel / Raycast**: estética dev moderna (dark mode bem feito, tipografia limpa, densidade de informação).
- **ByteByteGo**: clareza de diagrama didático.
- Tipografia: uma sans para UI (Inter ou Geist) + uma mono para métricas e código (JetBrains Mono ou Geist Mono). Para o traço à mão, Excalidraw usa a fonte "Excalifont"/Virgil.
- Canvas com grade de pontos, tema escuro e claro, cores semânticas para estado dos nós: verde (ok), amarelo (sob pressão), laranja (saturado), vermelho (caído). Animação de "partículas" nas arestas proporcional ao throughput ajuda muito a entender o fluxo.

### 10.2 Stack sugerida

| Camada | Opção recomendada | Por quê |
|---|---|---|
| Frontend | React + TypeScript (Next.js ou Vite) | Ecossistema de canvas está em React |
| Canvas de grafo | **React Flow (xyflow)**, MIT | Feito para grafos tipados (nós/arestas com dados), o que é exatamente o que o simulador precisa |
| Visual "à mão" | **rough.js** (MIT) para desenhar nós e arestas | Dá o estilo Excalidraw sem herdar um editor livre |
| Anotações livres | Camada simples própria, ou embutir Excalidraw (MIT) | Rabiscos, textos e setas que não entram na simulação |
| Alternativa | tldraw SDK | Excelente, mas **verificar a licença** para uso comercial (versões recentes exigem chave de licença) |
| Motor de simulação | TypeScript puro, sem DOM, em **Web Worker** | Testável isoladamente; não trava a UI |
| Gráficos de métricas | uPlot ou Recharts | Séries temporais leves |
| Backend | Node (NestJS/Fastify) ou o que for mais confortável; Postgres | Salvar designs, cenários, histórico |
| IA (juízes/entrevistador) | API de LLM com a rubrica e o JSON do grafo + resultados da simulação | Feedback fundamentado em dados, não só no desenho |
| Colaboração (futuro) | Yjs (CRDT) | Mock interview com duas pessoas no mesmo canvas |

Formato interno do design: **JSON do grafo** (nós com tipo e parâmetros, arestas com tipo). Exportar/importar Mermaid é um bom "extra" (o System Design Arena já faz isso).

---

## 11. Livros, papers e cursos

### 11.1 Livros (prioridade de leitura)

1. **Designing Data-Intensive Applications (DDIA)**, Martin Kleppmann (O'Reilly). A bíblia de fundamentos: replicação, particionamento, transações, consistência, stream processing. Há uma 2ª edição em produção/lançamento com Chris Riccomini como coautor; vale conferir qual está disponível. Capítulos 5, 6, 7 e 9 são essenciais para este projeto.
2. **System Design Interview – An Insider's Guide**, vol. 1 (Alex Xu) e vol. 2 (Alex Xu e Sahn Lam). O formato de entrevista; cenários prontos. Fonte da trilha da seção 7.
3. **Understanding Distributed Systems**, Roberto Vitillo. Curto, prático, ótimo como ponte entre Alex Xu e DDIA.
4. **Site Reliability Engineering** e **The Site Reliability Workbook** (Google, gratuitos online em sre.google). SLOs, falhas em cascata, load shedding.
5. **Release It!**, Michael Nygard. Padrões de estabilidade (circuit breaker, bulkhead, timeouts).
6. **Database Internals**, Alex Petrov. B-tree, LSM, replicação e consenso por dentro (para quem quer aprofundar).
7. **Acing the System Design Interview**, Zhiyong Tan. Outra visão do formato de entrevista.
8. **Web Scalability for Startup Engineers**, Artur Ejsmont. Bom para a trilha de 0 a 1M.

### 11.2 Papers clássicos (base dos cenários "difíceis")

- *Dynamo: Amazon's Highly Available Key-value Store* (2007): quóruns, hash consistente, vector clocks.
- *Bigtable* (2006) e *Spanner* (2012): armazenamento em larga escala; TrueTime.
- *In Search of an Understandable Consensus Algorithm* (Raft, 2014).
- *Scaling Memcache at Facebook* (NSDI 2013): leases, thundering herd, invalidação.
- *The Tail at Scale* (Dean & Barroso, 2013): latência de cauda.
- *Kafka: a Distributed Messaging System for Log Processing* (2011).
- Martin Kleppmann, *How to do distributed locking* (blog, 2016).
- AWS Architecture Blog, *Exponential Backoff and Jitter*.

### 11.3 Conteúdo online e criadores

- Renato Augusto (YouTube, PT-BR): CQRS, SSE vs WebSocket, microsserviços/DDD, NFRs.
- Lucas Montano (YouTube, PT-BR) e [System Design Arena](https://systemdesignarena.com).
- Ana Neri (YouTube, PT-BR): resiliência e chaos engineering.
- Hello Interview (guias e mock interviews), ByteByteGo (newsletter e vídeos), The System Design Primer (GitHub).
- Simulador open source em PT-BR para estudar a modelagem: [wander4747/system-design-simulator](https://github.com/wander4747/system-design-simulator).

---

## 12. Erros técnicos comuns

Checklist para revisar **todo** conteúdo e cenário antes de publicar. Cada item é um erro que aparece com frequência em material de system design:

- [ ] Confundir usuários totais/DAU com requisições por segundo (seção 4.2).
- [ ] Dizer que um sistema distribuído pode ser "CA" no CAP.
- [ ] Dizer que W + R > N garante consistência forte/linearizável sem ressalvas.
- [ ] Tratar "exactly-once" como garantia de entrega da rede, em vez de at-least-once + idempotência.
- [ ] Dizer que Kafka garante ordem global (é por partição).
- [ ] Assumir que Repeatable Read tem o mesmo comportamento em Postgres e MySQL.
- [ ] Usar lock no Redis com TTL como garantia de correção sem fencing token.
- [ ] Usar média de latência como métrica principal (usar percentis).
- [ ] Ignorar que latência cresce de forma não linear perto de 100% de utilização.
- [ ] Ignorar replication lag ao ler de réplica logo após escrever.
- [ ] Retry sem backoff/jitter, ou retry em várias camadas (retry storm).
- [ ] Achar que autoscaling resolve pico instantâneo (ele leva minutos).
- [ ] Usar `hash % N` para shards e esquecer o custo de rebalancear.
- [ ] Dizer que Bloom filter pode dar falso negativo.
- [ ] Last-write-wins por timestamp de máquina sem discutir clock skew.
- [ ] Indicar sharding/microsserviços sem que os números justifiquem.

---

## 13. Próximos passos / MVP

**MVP sugerido (ordem):**

1. **Canvas** com ~10 componentes tipados (React Flow + rough.js), salvar/carregar JSON.
2. **Motor Macro** (DES em Web Worker) com: gerador de carga, LB, servidor, cache, banco com réplica, fila. Métricas p50/p99, erro, utilização, painel "onde quebrou". Testes contra Lei de Little e M/M/1.
3. **Trilha "0 a 1M usuários"** (seção 7) como primeiro conteúdo jogável.
4. **Motor Micro** com o cenário de **estoque/ingresso** (lost update) e as 4 correções; depois write skew e cache-aside stale.
5. **Cenários** 1, 2, 3, 4 do catálogo, com rubrica.
6. **Avaliação por IA** usando a rubrica + resultados da simulação.

**Decisões em aberto (para conversarmos):**
- Público: só você estudando, ou produto aberto para outras pessoas?
- Idioma do conteúdo: PT-BR primeiro (há pouca coisa boa em PT-BR, é um diferencial) e inglês depois?
- Tecnologia de backend preferida.
- Link da plataforma da Ana Neri, para completar a seção 2.2.
