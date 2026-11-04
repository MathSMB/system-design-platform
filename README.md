# System Design Lab

Plataforma para treinar entrevistas de system design: **desenhe** a arquitetura num canvas com visual neon de diagrama de arquitetura, **simule** carga e concorrência de verdade e receba **avaliação por IA**.

A base técnica do projeto (conceitos, como simular cada um, cenários de entrevista, referências) está em [`docs/base-tecnica.md`](docs/base-tecnica.md).

## O que já funciona

- **Canvas de carga** (`/canvas`): arraste componentes (usuários, load balancer, servidor, cache, CDN, banco, fila, serviço externo), conecte e clique em Simular. A simulação mostra req/s, erros, p50/p99, gráfico no tempo e um painel "onde quebrou". Dá para derrubar um componente num segundo específico (ex.: derrubar o cache e ver a avalanche no banco).
- **Trilha de 0 a 1 milhão de usuários**: arquiteturas prontas para começar.
- **Réplicas de leitura com replication lag**: o banco pode ter réplicas (leituras nas réplicas, escritas no primário). Os usuários fazem uma fração de escritas e releem logo depois; o simulador conta quantas leituras voltam **sem a escrita do próprio usuário** e mostra o lag. A opção *read-your-writes* (ler do primário por um tempo após escrever) corrige, e dá para ver a carga voltando para o primário. Trilha "4. Réplicas de leitura".
- **Laboratório de concorrência** (`/concorrencia`): avance duas transações passo a passo e veja race conditions acontecendo. O botão "testar todas as ordens possíveis" enumera todas as intercalações e mostra em quantas a regra quebra. Cenários: último ingresso (lost update) e três correções (UPDATE atômico, SELECT FOR UPDATE, lock otimista), write skew, deadlock e cache-aside com valor velho.
- **Tour da tela**: na primeira visita ao canvas aparece um convite para um tour (ou o botão "?" ao lado de Simular). A tela escurece e só o elemento explicado fica aceso.
- **Treinos guiados** (`/treinos`): um mentor conduz cases no roteiro de entrevista do Renato Augusto (requisitos, estimativas, desenho incremental, gargalos, trade-offs). Cada etapa é uma pergunta, uma conta ou uma tarefa no canvas que o sistema confere sozinho e explica. Cases: de 0 a 1 milhão de usuários, cache-aside e avalanche, réplicas de leitura, encurtador de URL.
- **Desafio sorteado** (`/desafio`): sorteia um problema (Black Friday, placar da Copa, feed, e-mail de pedido, ingressos, pagamentos) e mostra só o enunciado e a carga. Você monta, simula e entrega; a nota sai em estrelas (erros, latência p99 e folga para pico).
- **Avaliação por IA** (aba Avaliação no canvas): dois avaliadores (big tech e staff de startup) dão nota por dimensão, perguntas de follow-up e próximos passos, usando os números da simulação como evidência.

## Rodando localmente

Pré-requisitos: Node 22+ e pnpm (`corepack enable`).

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

### IA com a sua assinatura do Claude (padrão)

A avaliação usa o **Claude Code** instalado na sua máquina, logado com a sua assinatura (Pro/Max):

```bash
npm install -g @anthropic-ai/claude-code
claude              # faça login uma vez com a sua conta
```

O app chama `claude -p` por baixo. Isso só funciona **rodando localmente e para uso pessoal**: a assinatura não pode alimentar um app publicado para outras pessoas. Para publicar, use a API:

```bash
# apps/web/.env.local
AI_PROVIDER=api
ANTHROPIC_API_KEY=...
```

### Banco: salvo no seu computador, sem configurar nada

O banco guarda os desenhos, o histórico das suas entrevistas, a pesquisa de cada vaga, as contas com o hábito de cada perfil e a Central de estudos.

**Sem `DATABASE_URL`, a plataforma usa um Postgres embutido (PGlite) salvo em `apps/web/.data/`.** É só rodar `pnpm dev`: as tabelas são criadas sozinhas e tudo continua lá na próxima vez. Para fazer backup, copie a pasta `apps/web/.data/` com o `pnpm dev` fechado. Só um processo usa a pasta por vez, então feche o `pnpm dev` antes de abrir o `pnpm --filter web db:studio`.

Quando o projeto ganhar tabelas novas, elas são aplicadas sozinhas ao subir o `pnpm dev` (migrações em `apps/web/drizzle/`). Quem mexer no schema roda `pnpm --filter web db:generate` para criar a migração.

**Opcional: Neon (Postgres na nuvem, grátis)**, para ter os mesmos dados em outro computador:

1. Crie uma conta em [neon.tech](https://neon.tech) e um projeto (região São Paulo, `sa-east-1`).
2. Em **Connect**, copie a connection string (começa com `postgresql://`).
3. Crie `apps/web/.env.local` a partir de `apps/web/.env.example` e cole em `DATABASE_URL`.
4. Crie as tabelas: `pnpm --filter web db:push`, e reinicie o `pnpm dev`.

Para um Postgres local com Docker: `docker compose up -d` e `DATABASE_URL=postgres://sdp:sdp@localhost:5432/sdp`.

### Central de estudos (`/estudos`)

Junta tudo o que você estuda para conseguir a vaga do perfil:

- **Pesquisa da vaga:** você escreve o cargo e a IA (o seu Claude Code, com busca na web) lê de 15 a 30 anúncios reais, conta quantos pedem cada habilidade e salva a pesquisa com fontes, faixa salarial e temas de entrevista. Leva alguns minutos, roda em segundo plano e vale por 6 meses.
- **O que as vagas pedem:** gráfico com a % de anúncios de cada habilidade. Você marca "não sei", "estudando" ou "domino".
- **Pronto para a vaga:** % que pesa cada habilidade pela frequência nas vagas, e a lista do que mais falta.
- **Trilhas:** pós, certificação, livro, curso, projeto. O botão **Conversar com a IA** monta a trilha com você (matérias, capítulos, módulos, prazo, quantas vezes por semana e o tamanho de cada sessão). Também dá para adicionar à mão.
- **Projetos:** a IA sugere 3 projetos de portfólio que cobrem o que falta; o escolhido vira trilha com as entregas.
- **Cronograma:** a partir do seu tempo livre em cada dia da semana (com folga para imprevistos), a IA monta as próximas 2 semanas em blocos curtos, com revisão espaçada e treinos com nota na plataforma. Cada trilha entra só as vezes por semana combinadas. Replanejar (todo domingo, ou quando a semana muda) refaz daqui para frente e nunca muda o passado.
- **Meta do dia:** o item "Cumprir o cronograma do dia" pode entrar na meta da placa-mãe. Ele conta sozinho quando você marca todos os blocos do dia.

As regras ficam em `packages/study`; os prompts da IA, em `packages/ai/src/study.ts`.

### Hábito (`/habito`)

Entre em `/conta` (um clique, sem senha; login com Google e GitHub está nas pendências) e crie um perfil: stack, senioridade e meta diária.

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

## Ver online (Vercel)

Canvas, simulação e laboratório de concorrência rodam no navegador, então funcionam publicados sem configurar nada:

1. Entre em [vercel.com/new](https://vercel.com/new) com a sua conta do GitHub e importe `system-design-platform`.
2. Em **Root Directory**, escolha `apps/web` (a Vercel detecta Next.js e o pnpm do monorepo).
3. Clique em Deploy. Cada PR ganha um link de preview automático.

A avaliação por IA publicada precisa de `AI_PROVIDER=api` e `ANTHROPIC_API_KEY` nas variáveis de ambiente do projeto na Vercel (a assinatura só vale rodando local). Sem `DATABASE_URL`, os desenhos ficam salvos no navegador.

## Estrutura

```
apps/web               Next.js (canvas com React Flow + ícones lucide, Tailwind, Zustand, uPlot)
packages/sim-engine    Motor de carga: simulação de eventos discretos (roda num Web Worker)
packages/race-sim      Motor de concorrência: intercalação passo a passo + mini-banco com locks
packages/ai            Avaliação por IA: Claude Code local (assinatura) ou API da Anthropic
docs/                  Base técnica
```

## Como o simulador garante correção

- **Motor de carga**: cada componente é uma fila com N workers, tempo de serviço aleatório (lognormal por padrão) e fila limitada. Tudo com seed fixa, então o mesmo desenho dá o mesmo resultado. Os testes conferem o motor contra a teoria: fila M/M/1 (latência média = 1/(μ − λ)), Lei de Little, amplificação de retries e avalanche de cache.
- **Réplicas**: cada réplica tem os mesmos workers do primário para leituras e aplica as escritas numa thread só, em ordem (como o replay do WAL no PostgreSQL). Lag = atraso de rede + espera na fila de replay + aplicar. Aplicar custa 5% do tempo de serviço da query (aproximação: o replay não faz parse, plano nem lock). Os testes conferem que, com escrita acima da capacidade de replay, o lag no fim é T·(1 − μ/λ), como numa fila sobrecarregada.
- **Motor de concorrência**: modela Read Committed como no PostgreSQL (escritas dentro de BEGIN só aparecem no COMMIT; UPDATE e SELECT FOR UPDATE travam a linha até o fim da transação). Os testes garantem que o cenário com bug quebra em alguma ordem e que as correções nunca quebram.

```bash
pnpm test        # testes dos três pacotes
pnpm typecheck
```

## Limitações conhecidas (próximos passos)

- O servidor libera o worker enquanto espera dependências (modelo assíncrono, tipo Node). Pool de conexões bloqueante ainda não é modelado.
- Ainda não há sharding nem autoscaling no simulador. Réplicas não disputam CPU/disco entre leitura e replay, e o cache não guarda dado velho (escritas invalidam a chave).
- Cargas muito altas reduzem a duração simulada para não travar o navegador (o app avisa).
