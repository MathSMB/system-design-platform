# System Design Lab

Plataforma para treinar entrevistas de system design: **desenhe** a arquitetura num canvas com visual neon de diagrama de arquitetura, **simule** carga e concorrência de verdade e receba **avaliação por IA**.

A base técnica do projeto (conceitos, como simular cada um, cenários de entrevista, referências) está em [`docs/base-tecnica.md`](docs/base-tecnica.md).

## O que já funciona

- **Canvas de carga** (System Design, `/canvas`): arraste componentes (usuários, load balancer, servidor, cache, CDN, banco, fila, serviço externo), conecte e clique em Simular. A simulação mostra req/s, erros, p50/p99, gráfico no tempo e um painel "onde quebrou". Dá para derrubar um componente num segundo específico (ex.: derrubar o cache e ver a avalanche no banco).
- **Trilha de 0 a 1 milhão de usuários**: arquiteturas prontas para começar.
- **Réplicas de leitura com replication lag**: o banco pode ter réplicas (leituras nas réplicas, escritas no primário). Os usuários fazem uma fração de escritas e releem logo depois; o simulador conta quantas leituras voltam **sem a escrita do próprio usuário** e mostra o lag. A opção *read-your-writes* (ler do primário por um tempo após escrever) corrige, e dá para ver a carga voltando para o primário. Trilha "4. Réplicas de leitura".
- **Laboratório de concorrência** (System Design, `/concorrencia`): avance duas transações passo a passo e veja race conditions acontecendo. O botão "testar todas as ordens possíveis" enumera todas as intercalações e mostra em quantas a regra quebra. Cenários: último ingresso (lost update) e três correções (UPDATE atômico, SELECT FOR UPDATE, lock otimista), write skew, deadlock e cache-aside com valor velho.
- **Tour da tela**: na primeira visita ao canvas aparece um convite para um tour (ou o botão "?" ao lado de Simular). A tela escurece e só o elemento explicado fica aceso.
- **Treinos guiados** (`/treinos`): um mentor conduz cases no roteiro de entrevista do Renato Augusto (requisitos, estimativas, desenho incremental, gargalos, trade-offs). Cada etapa é uma pergunta, uma conta ou uma tarefa no canvas que o sistema confere sozinho e explica. Cases: de 0 a 1 milhão de usuários, cache-aside e avalanche, réplicas de leitura, encurtador de URL.
- **Desafio sorteado** (`/desafio`): sorteia um problema (Black Friday, placar da Copa, feed, e-mail de pedido, ingressos, pagamentos) e mostra só o enunciado e a carga. Você monta, simula e entrega; a nota sai em estrelas (erros, latência p99 e folga para pico).
- **Avaliação por IA** (aba Avaliação no canvas): dois avaliadores (big tech e staff de startup) dão nota por dimensão, perguntas de follow-up e próximos passos, usando os números da simulação como evidência.

## Os apps

A plataforma é um monorepo com um app por parte. Cada um roda na sua porta, mas todos usam o mesmo banco e a mesma conta: entrando no Painel, você já está dentro de todos.

| App | Porta | O que tem |
|---|---|---|
| Painel (`apps/painel`) | 3000 | Entrar, conta e perfis (meta do dia), atalhos para os apps e os últimos eventos |
| System Design (`apps/system-design`) | 3001 | System Design e Concorrência e dados, nos modos Estudo e Entrevista técnica, canvas livre, laboratório, glossário, bibliografia e a capa animada |
| Entrevista (`apps/entrevista`) | 3002 | Processo seletivo por área, stack e senioridade (do RH à contratação), treino Java e o histórico |
| Estudos (`apps/estudos`) | 3003 | Central de estudos: pesquisa da vaga, trilhas, projetos e cronograma |
| Hábito (`apps/habito`) | 3004 | A placa-mãe neon da meta diária |
| Pair Programming (`apps/pair`) | 3005 | Um mentor de IA que programa com você passo a passo: ambiente, Git e código linha por linha |

Os apps não precisam estar abertos juntos. O que acontece em um (uma resposta avaliada, uma etapa do processo, um desenho avaliado) vira um **evento** gravado no banco, e quem precisa lê depois: o Hábito, por exemplo, conta esses eventos para a meta do dia quando você abre a placa-mãe.

## Rodando localmente

Pré-requisitos: Node 22+, pnpm (`corepack enable`) e o **Docker Desktop** aberto (para o Postgres).

```bash
pnpm install
pnpm dev                  # sobe o Postgres no Docker, cria as tabelas e abre os 6 apps
```

Abra o Painel em http://localhost:3000. Para abrir um app só:

```bash
pnpm dev:painel           # http://localhost:3000
pnpm dev:system-design    # http://localhost:3001
pnpm dev:entrevista       # http://localhost:3002
pnpm dev:estudos          # http://localhost:3003
pnpm dev:habito           # http://localhost:3004
pnpm dev:pair             # http://localhost:3005
```

Configuração (opcional): copie `.env.example` para `.env` **na raiz**. Ele vale para todos os apps (`DATABASE_URL`, `AUTH_SECRET`, `AI_PROVIDER`). Se você tinha um `apps/web/.env.local`, passe o que estava lá para esse `.env`.

### Banco: Postgres no Docker

Todos os apps usam o mesmo Postgres, o do `docker-compose.yml` (`postgres://sdp:sdp@localhost:5434/sdp`, dados no volume `pgdata`). O `pnpm dev` já sobe o container e aplica as migrações, mas dá para fazer à mão:

```bash
pnpm db:up                # sobe o Postgres (docker compose up -d)
pnpm db:migrate           # cria ou atualiza as tabelas
pnpm db:studio            # abre o Drizzle Studio para ver os dados
pnpm db:down              # para o Postgres (os dados ficam)
```

O schema e as migrações ficam em `packages/db` (`src/schema.ts` e `drizzle/`). Quem mudar o schema roda `pnpm db:generate` para criar a migração nova.

**Trazendo os dados do banco embutido antigo.** Antes da separação, o app guardava tudo num Postgres embutido em `apps/web/.data/pglite`. Essa pasta continua no seu computador (o Git não apaga). Com o Postgres no ar, rode uma vez:

```bash
pnpm db:importar-pglite   # copia contas, perfis, atividades, histórico, desenhos e estudos
```

Pode rodar de novo sem duplicar nada. Se a pasta estiver em outro lugar, passe o caminho: `pnpm db:importar-pglite /caminho/para/pglite`.

### Login único

A conta é uma só para os 6 apps. O Painel cria a conta e os perfis (um clique, sem senha por enquanto) e grava um cookie com um token assinado (JWT). Como os cookies de `localhost` valem para todas as portas, todos os apps leem o mesmo cookie e sabem quem é você e qual perfil está ativo. O código fica em `packages/auth`; quando entrar Google ou GitHub, muda só lá.

### API de eventos

Todo app tem `POST /api/eventos` com `{ type, ref?, payload? }`. O evento entra na tabela `events` (outbox) em nome da conta e do perfil ativo, e o `ref` evita gravar o mesmo fato duas vezes. Quem lê guarda até onde leu na tabela `event_cursors`, então nada se perde se o app estiver fechado. Os tipos ficam em `packages/events/src/types.ts` e a lista aparece no Painel, em `/eventos`.

| Evento | Quem grava | Quem lê |
|---|---|---|
| `resposta.avaliada` | Entrevista | Hábito (meta do dia) |
| `etapa.concluida` | Entrevista | Hábito |
| `processo.concluido` | Entrevista | Hábito |
| `design.avaliado` | System Design | Hábito |
| `estudo.item-feito` | Estudos | Painel (só mostra) |

### IA com a sua assinatura do Claude (padrão)

A avaliação usa o **Claude Code** instalado na sua máquina, logado com a sua assinatura (Pro/Max):

```bash
npm install -g @anthropic-ai/claude-code
claude              # faça login uma vez com a sua conta
```

Os apps chamam `claude -p` por baixo. Isso só funciona **rodando localmente e para uso pessoal**: a assinatura não pode alimentar um app publicado para outras pessoas. Por isso a plataforma roda só no seu computador. Para usar a API paga em vez da assinatura, coloque no `.env` da raiz:

```bash
AI_PROVIDER=api
ANTHROPIC_API_KEY=...
```

### Central de estudos (app Estudos, porta 3003)

Junta tudo o que você estuda para conseguir a vaga do perfil:

- **Pesquisa da vaga:** você escreve o cargo e a IA (o seu Claude Code, com busca na web) lê de 15 a 30 anúncios reais, conta quantos pedem cada habilidade e salva a pesquisa com fontes, faixa salarial e temas de entrevista. Leva alguns minutos, roda em segundo plano e vale por 6 meses.
- **O que as vagas pedem:** gráfico com a % de anúncios de cada habilidade. Você marca "não sei", "estudando" ou "domino".
- **Pronto para a vaga:** % que pesa cada habilidade pela frequência nas vagas, e a lista do que mais falta.
- **Trilhas:** pós, certificação, livro, curso, projeto. O botão **Conversar com a IA** monta a trilha com você (matérias, capítulos, módulos, prazo, quantas vezes por semana e o tamanho de cada sessão). Também dá para adicionar à mão.
- **Projetos:** a IA sugere 3 projetos de portfólio que cobrem o que falta; o escolhido vira trilha com as entregas.
- **Cronograma:** a partir do seu tempo livre em cada dia da semana (com folga para imprevistos), a IA monta as próximas 2 semanas em blocos curtos, com revisão espaçada e treinos com nota na plataforma. Cada trilha entra só as vezes por semana combinadas. Replanejar (todo domingo, ou quando a semana muda) refaz daqui para frente e nunca muda o passado.
- **Meta do dia:** o item "Cumprir o cronograma do dia" pode entrar na meta da placa-mãe. Ele conta sozinho quando você marca todos os blocos do dia.

As regras ficam em `packages/study`; os prompts da IA, em `packages/ai/src/study.ts`.

### Pair Programming (app Pair, porta 3005)

Um mentor de IA que programa do seu lado como um sênior com um júnior. Você conta o que quer construir ("uma API REST em Java, nunca configurei o ambiente") e ele:

- **Monta o roteiro** do ambiente até o projeto publicado e mostra em que passo você está.
- **Entrega um passo por vez:** o que fazer (onde clicar, o que digitar, no Windows), por que fazer e como conferir. Só segue quando você clica em **Pode continuar**.
- **Explica o código linha por linha.** Clicar numa linha de qualquer bloco de código pede a explicação dela. Também há **Explica mais devagar**, **Deu erro** e **Confere pra mim**.
- **Confere o que você fez**, se você informar a pasta do projeto: o Claude Code lê os arquivos e roda só `git status/log/diff/branch` (nada de escrever ou apagar).
- **Liga aos Estudos, se você quiser:** escolha uma trilha ou projeto e ele já sabe os passos, o repositório, os últimos commits e o que você marcou como "domino".
- **Projetos na lateral:** embaixo das conversas ficam os projetos dos Estudos (feitos à mão ou sugeridos pela IA). Clicar abre a conversa daquele projeto, e o mentor já monta o roteiro a partir das entregas. O botão **Acoplar** cadastra um projeto novo (nome, o que precisa ter, entregas, repositório e pasta): ele entra nos Estudos e a conversa já começa.

Tudo é IA: não há resposta pronta nem guardada para reaproveitar. O banco guarda só as conversas (`pair_chats` e `pair_messages`), agrupadas por dia, para você continuar de onde parou. Para a IA vão o resumo da conversa (que ela mesma atualiza) e as últimas 10 mensagens. Cada passo concluído grava o evento `pair.passo-concluido`, que conta como avanço no projeto na meta do Hábito.

O jeito de ensinar fica numa **skill do repositório**, `.claude/skills/pair-programming/SKILL.md`. O app lê esse arquivo como instrução da IA, e você também pode usar `/pair-programming` no Claude Code no terminal, dentro da pasta do repo. O formato da resposta e o código da IA ficam em `packages/ai/src/pair.ts`.

### Hábito (app Hábito, porta 3004)

Entre no Painel, em `/conta` (um clique, sem senha; login com Google e GitHub está nas pendências) e crie um perfil: stack, senioridade e meta diária.

A meta é sua. O padrão sugerido é "30 min de estudo do seu jeito + 1 resposta avaliada pela IA", mas dá para escolher um modelo pronto (Leve, Regular, Intensa) ou montar a sua lista de itens:

- **Itens que você marca:** o seu tipo de estudo, ex. "1 hora de Spring Boot". Você dá o check no dia (ou no dia seguinte, se esqueceu).
- **Itens automáticos:** respostas avaliadas pela IA, etapas e processos seletivos e casos de system design, contados sozinhos pela plataforma.

A meta conta com todos os itens ou com qualquer um deles. Trocar a meta não muda o passado: a antiga continua valendo para os dias anteriores.

A tela mostra uma placa-mãe vista de cima:

- Cada dia cumprido instala uma peça (15 ao todo, do processador ao RGB). Com a placa completa, cada dia vira overclock.
- São 2 failovers por semana. Dia perdido com failover não quebra nada.
- Sem failover, a máquina sobe um nível de desgaste: poeira, superaquecimento, curto-circuito, cabo rompido, vazamento e, no 6º, fogo.
- O próximo dia cumprido conserta um nível antes de instalar peça nova, e as ventoinhas voltam aos poucos.
- No 6º nível a máquina queima: todas as peças saem e a montagem recomeça do zero (fica a marca de queimado).

A tela anima o que mudou desde a sua última visita. As regras ficam em `packages/habit`.

## Estrutura

```
apps/painel            Entrar, conta e perfis, atalhos e eventos (porta 3000)
apps/system-design     Canvas (React Flow), simulação, concorrência, Estudo e Entrevista técnica (3001)
apps/entrevista        Processo seletivo, treino Java e histórico (3002)
apps/estudos           Central de estudos (3003)
apps/habito            Placa-mãe do hábito (3004)
apps/pair              Pair Programming: mentor passo a passo (3005)
packages/db            Schema do Postgres (Drizzle), migrações e scripts do banco
packages/auth          Login único: sessão em JWT, rotas de conta e perfis
packages/events        API de eventos: gravar na outbox e ler com cursor
packages/ui            Tema neon, cabeçalho comum, tela de conta e componentes compartilhados
packages/sim-engine    Motor de carga: simulação de eventos discretos (roda num Web Worker)
packages/race-sim      Motor de concorrência e as entrevistas de concorrência
packages/ai            Avaliação por IA: Claude Code local (assinatura) ou API da Anthropic
packages/hiring        Conteúdo e regras do processo seletivo
packages/study         Regras da central de estudos
packages/habit         Regras do hábito (placa-mãe)
.claude/skills          Skill pair-programming (a persona do mentor)
docs/                  Base técnica e docs/features (como replicar cada feature)
```

## Como o simulador garante correção

- **Motor de carga**: cada componente é uma fila com N workers, tempo de serviço aleatório (lognormal por padrão) e fila limitada. Tudo com seed fixa, então o mesmo desenho dá o mesmo resultado. Os testes conferem o motor contra a teoria: fila M/M/1 (latência média = 1/(μ − λ)), Lei de Little, amplificação de retries e avalanche de cache.
- **Réplicas**: cada réplica tem os mesmos workers do primário para leituras e aplica as escritas numa thread só, em ordem (como o replay do WAL no PostgreSQL). Lag = atraso de rede + espera na fila de replay + aplicar. Aplicar custa 5% do tempo de serviço da query (aproximação: o replay não faz parse, plano nem lock). Os testes conferem que, com escrita acima da capacidade de replay, o lag no fim é T·(1 − μ/λ), como numa fila sobrecarregada.
- **Motor de concorrência**: modela Read Committed como no PostgreSQL (escritas dentro de BEGIN só aparecem no COMMIT; UPDATE e SELECT FOR UPDATE travam a linha até o fim da transação). Os testes garantem que o cenário com bug quebra em alguma ordem e que as correções nunca quebram.

```bash
pnpm test        # testes dos pacotes
pnpm typecheck
```

## Limitações conhecidas (próximos passos)

- O servidor libera o worker enquanto espera dependências (modelo assíncrono, tipo Node). Pool de conexões bloqueante ainda não é modelado.
- Ainda não há sharding nem autoscaling no simulador. Réplicas não disputam CPU/disco entre leitura e replay, e o cache não guarda dado velho (escritas invalidam a chave).
- Cargas muito altas reduzem a duração simulada para não travar o navegador (o app avisa).
