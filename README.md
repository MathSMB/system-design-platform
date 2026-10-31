# System Design Lab

Plataforma para treinar entrevistas de system design: **desenhe** a arquitetura num canvas estilo Excalidraw, **simule** carga e concorrência de verdade e receba **avaliação por IA**.

A base técnica do projeto (conceitos, como simular cada um, cenários de entrevista, referências) está em [`docs/base-tecnica.md`](docs/base-tecnica.md).

## O que já funciona

- **Canvas de carga** (`/canvas`): arraste componentes (usuários, load balancer, servidor, cache, CDN, banco, fila, serviço externo), conecte e clique em Simular. A simulação mostra req/s, erros, p50/p99, gráfico no tempo e um painel "onde quebrou". Dá para derrubar um componente num segundo específico (ex.: derrubar o cache e ver a avalanche no banco).
- **Trilha de 0 a 1 milhão de usuários**: arquiteturas prontas para começar.
- **Laboratório de concorrência** (`/concorrencia`): avance duas transações passo a passo e veja race conditions acontecendo. O botão "testar todas as ordens possíveis" enumera todas as intercalações e mostra em quantas a regra quebra. Cenários: último ingresso (lost update) e três correções (UPDATE atômico, SELECT FOR UPDATE, lock otimista), write skew, deadlock e cache-aside com valor velho.
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

### Banco (opcional)

Sem banco, os desenhos ficam salvos no navegador. Para usar Postgres:

```bash
docker compose up -d
cp apps/web/.env.example apps/web/.env.local
pnpm --filter web db:push
```

## Estrutura

```
apps/web               Next.js (canvas com React Flow + rough.js, Tailwind, Zustand, uPlot)
packages/sim-engine    Motor de carga: simulação de eventos discretos (roda num Web Worker)
packages/race-sim      Motor de concorrência: intercalação passo a passo + mini-banco com locks
packages/ai            Avaliação por IA: Claude Code local (assinatura) ou API da Anthropic
docs/                  Base técnica
```

## Como o simulador garante correção

- **Motor de carga**: cada componente é uma fila com N workers, tempo de serviço aleatório (lognormal por padrão) e fila limitada. Tudo com seed fixa, então o mesmo desenho dá o mesmo resultado. Os testes conferem o motor contra a teoria: fila M/M/1 (latência média = 1/(μ − λ)), Lei de Little, amplificação de retries e avalanche de cache.
- **Motor de concorrência**: modela Read Committed como no PostgreSQL (escritas dentro de BEGIN só aparecem no COMMIT; UPDATE e SELECT FOR UPDATE travam a linha até o fim da transação). Os testes garantem que o cenário com bug quebra em alguma ordem e que as correções nunca quebram.

```bash
pnpm test        # testes dos três pacotes
pnpm typecheck
```

## Limitações conhecidas (próximos passos)

- O servidor libera o worker enquanto espera dependências (modelo assíncrono, tipo Node). Pool de conexões bloqueante ainda não é modelado.
- Ainda não há réplicas de leitura com replication lag, sharding nem autoscaling no simulador.
- Cargas muito altas reduzem a duração simulada para não travar o navegador (o app avisa).
