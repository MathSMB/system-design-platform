# Features da plataforma: documentação para replicar

Esta pasta descreve as quatro features da plataforma com detalhe suficiente para outro projeto (ou outro app do futuro monorepo) recriar cada uma do zero: o que faz, como funciona por dentro, dados, prompts de IA e, principalmente, o visual.

| # | Feature | Documento | Onde está o código hoje |
|---|---------|-----------|-------------------------|
| 1 | System Design + Concorrência e dados (Estudo e Entrevista técnica, canvas, simulação, capa animada) | [01-system-design.md](01-system-design.md) | `main` |
| 2 | Simulador de processo seletivo e entrevista por stack (área → stack → senioridade → empresa, do RH à contratação) | [02-processo-seletivo.md](02-processo-seletivo.md) | `main` (PRs #1 a #5) |
| 3 | Central de estudos (`/estudos`) | [03-central-de-estudos.md](03-central-de-estudos.md) | só no PR #6 |
| 4 | Hábito com a placa-mãe neon (`/habito`, `/conta`) | [04-habito-placa-mae.md](04-habito-placa-mae.md) | só no PR #6 |

Depois da separação em apps, o código de cada feature fica em `apps/system-design` (1), `apps/entrevista` (2), `apps/estudos` (3) e `apps/habito` + `apps/painel` (4); o que é comum fica em `packages/` (tema e cabeçalho em `packages/ui`, banco em `packages/db`, login em `packages/auth`, eventos em `packages/events`).

Referência de código usada para escrever estes documentos: branch `claude/project-thread-sdljix`, commit `f8213fe` (main + PR #6). Os arquivos mais difíceis de descrever em texto (tema CSS, nó do canvas, placa-mãe em SVG, regras do hábito) estão copiados, sem alteração, em [`anexos/`](anexos/). Eles são a fonte de verdade do visual: se o texto e o anexo divergirem, vale o anexo.

Prints de tela ficam em [`img/`](img/). A base técnica de system design (conceitos, cenários, referências) continua em [`../base-tecnica.md`](../base-tecnica.md).

---

## Design system compartilhado ("terminal neon")

As quatro features usam o mesmo tema. Quem for replicar qualquer uma delas precisa disto primeiro. Arquivo completo: [`anexos/globals.css`](anexos/globals.css).

### Stack de front

- Next.js (App Router) + React 19 + TypeScript.
- Tailwind CSS 4 com `@theme inline` apontando para variáveis CSS (as classes viram `bg-panel`, `text-accent`, `border-border` etc.).
- Ícones: `lucide-react` (traço 1.75 a 2, sempre com `drop-shadow` da cor quando são "neon").
- Fontes via `@fontsource`: **Press Start 2P** (títulos, pixel), **Chakra Petch** 400/500/600/700 (texto), **JetBrains Mono** 400/700 (números, rótulos HUD, código, inputs).

### Cores (tokens)

| Token | Hex | Uso |
|---|---|---|
| `--bg` | `#05060b` | fundo da página (quase preto azulado) |
| `--panel` | `#0b0e17` | painéis |
| `--panel-2` | `#111626` | painel elevado, trilho de barras |
| `--border` | `#1d2540` | bordas finas |
| `--text` | `#e6f1ff` | texto principal |
| `--muted` | `#7d8bab` | texto secundário |
| `--accent` | `#22e4ff` | ciano neon: cor principal, Estudo, botões |
| `--accent-2` | `#ff3cac` | magenta neon: Entrevista técnica, Central de estudos |
| `--ok` | `#39ff8f` | verde: sucesso, Hábito |
| `--warn` | `#ffe14d` | amarelo: atenção |
| `--bad` | `#ff9a3c` | laranja: gargalo, Processo seletivo |
| `--down` | `#ff4d6d` | vermelho: erro, fora do ar |
| `--ink` | `#9fb4ff` | azul claro auxiliar |

Cada área da plataforma tem uma cor-assinatura: **Estudo = ciano**, **Entrevista técnica = magenta**, **Processo seletivo = laranja (`bad`)**, **Central de estudos = magenta**, **Hábito = verde**. O rótulo do topo da página, o destaque do título e o brilho do hover dos cards seguem essa cor.

### Fundo e textura

- `body` tem dois brilhos radiais fixos: ciano a 8% no canto superior esquerdo (`1200x600` em `10% -10%`) e magenta a 7% no canto superior direito (`900x500` em `110% 0%`), com `background-attachment: fixed`.
- Seleção de texto: ciano a 30%.
- Barras de rolagem finas (`#26304f`).

### Utilitários (Tailwind `@utility`)

- `glow`: `text-shadow` duplo com a cor atual (6px a 70% e 18px a 35%). Usado em títulos e números importantes.
- `panel`: gradiente vertical `rgba(17,22,38,.92)` → `rgba(11,14,23,.92)`, borda 1px `--border`, raio 10px, brilho interno de 1px no topo.
- `btn-neon`: fundo ciano, texto `#001218`, negrito, MAIÚSCULAS com `letter-spacing .04em`, raio 6px, sombra ciano `0 0 12px` (hover `0 0 22px`), desce 1px ao clicar.
- `btn-ghost`: borda `--border`, fundo `rgba(17,22,38,.6)`; no hover a borda e o texto ficam ciano com brilho suave.
- `hud-label`: JetBrains Mono 10px, MAIÚSCULAS, `letter-spacing .18em`, ciano a 85%. Aparece como `// treino de system design para entrevistas` e em todos os rótulos de seção.
- Inputs, selects e textareas: fundo `#0a0e1a`, borda `--border`, fonte mono 13px; foco com borda ciano e halo `0 0 10px`.

### Animações globais

| Classe | O que faz |
|---|---|
| `cursor-blink` | cursor `_` piscando (1.1s, steps) no logo e em "SIMULANDO_" |
| `pop-in` | entrada 0.35s: sobe 6px e cresce de 0.98 |
| `pulse-bad` | borda e sombra vermelhas pulsando (valor ruim) |
| `scanline` | faixa ciano varrendo a tela de cima para baixo (1.6s) enquanto simula |
| `loading-bar` | barrinha correndo da esquerda para a direita |
| `shake` | tremidinha a cada 2s (transação esperando lock) |
| `pulse-cue` | botão que o roteiro pede para clicar: pulsa e cresce 6% |
| `slide-in` | painel entrando pela direita (glossário) |
| `tour-spot` | "buraco" iluminado do tour: sombra de 9999px escurecendo o resto e halo ciano pulsando |
| `flame`, `heat`, `ping-ring`, `damage`, `glitch`, `node-down`, `blink-warn` | animações dos nós do canvas (ver doc 1) |

Todas respeitam `prefers-reduced-motion: reduce` (animações viram 0.01ms e uma iteração).

### Cabeçalho (layout comum)

Arquivo: [`anexos/layout.tsx`](anexos/layout.tsx).

- Altura 48px, borda inferior, fundo `bg/80` com `backdrop-blur`.
- Logo à esquerda em Press Start 2P 11px ciano com glow: `> SYSTEM_DESIGN_LAB_` (o `>` em magenta, o `_` piscando). No celular vira `> SDL_`.
- Navegação em MAIÚSCULAS 12px, `tracking .1em`, cinza; cada link acende na cor da sua área no hover. Rola na horizontal sem barra no celular.
- À direita: chip da conta (nome e perfil ativo) e botão "SABER MAIS" (abre o glossário; no celular só "?").
- Linha neon de 1px sob o cabeçalho: gradiente transparente → ciano (30%) → magenta (70%) → transparente, 60% de opacidade.

### Padrões de página

- Container `max-w-5xl` (ou `6xl`) com `px-4 py-12`.
- Topo de página: `hud-label` com ícone na cor da área → título em Press Start 2P (`text-xl`, `leading-relaxed`) com a segunda parte na cor da área e `glow` → parágrafo `text-muted`.
  Exemplos: "Do RH à **contratação.**", "Sua **máquina.**", "Do anúncio da vaga à **meta de hoje.**", "Qual **entrevista?**".
- Cards de escolha: `panel` com ícone grande (34 a 42px) com `drop-shadow` da cor, título em Press Start 2P, texto cinza, e no hover a borda e um brilho `0 0 24px` da cor da área.
- Listas numeradas como fases de jogo: "AULA 01", "BLOCO 03" em Press Start 2P 10px.
- Barras de progresso: trilho `bg-border` de 6px, preenchido na cor da área com sombra (`shadow-[0_0_6px_var(--accent)]`); etapas concluídas em verde a 70%.
- Resultado: card centralizado com ícone (Trophy amarelo, Flag, CheckCircle verde, CircleX vermelho), título Press Start 2P com glow, estrelas (Star preenchida em `warn`, entrando com `pop-in` em sequência).
- Textos e números em pt-BR (`toLocaleString("pt-BR")`), datas `dd/mm`, dinheiro `R$ 8.500`.

### Mobile

- Grades viram uma coluna abaixo de `md` (`md:grid-cols-2/3`).
- O canvas e o laboratório usam três colunas fixas no desktop (paleta 200 a 340px, canvas, painel 360 a 380px); os modos guiados de concorrência empilham com `lg:grid-cols-[380px_1fr]`.
- Cabeçalho com navegação rolável e logo curto.
- Placa-mãe e calendário anual escalam pela largura (SVG com `viewBox`) e o calendário rola na horizontal, já posicionado no fim (hoje).

---

## Integração local com a IA (vale para as 4 features)

Arquivo: [`anexos/ai-claude-code.ts`](anexos/ai-claude-code.ts).

A IA roda pela **assinatura do Claude** do próprio usuário, via **Claude Code instalado na máquina**, sem API paga. Só serve para uso pessoal e local.

1. O servidor Next.js (rota com `runtime = "nodejs"`, `maxDuration = 300`) chama `createProvider()`.
2. `AI_PROVIDER` decide: `claude-code` (padrão) ou `api` (Anthropic API com `ANTHROPIC_API_KEY`, só para publicar).
3. O provedor Claude Code faz `spawn("claude", args)` com o prompt no **stdin** e estes argumentos:
   ```
   -p --output-format json --json-schema '<schema JSON>' --system-prompt '<prompt de sistema>'
   --tools ""                                   # sem ferramentas
   # ou, quando precisa pesquisar na web:
   --tools WebSearch,WebFetch --allowedTools WebSearch,WebFetch
   --no-session-persistence [--model <CLAUDE_CODE_MODEL>]
   ```
4. Remove `ANTHROPIC_API_KEY` do ambiente do processo filho, para o Claude Code usar o login da assinatura.
5. Lê o envelope JSON do stdout: se `is_error`, lança erro; senão usa `structured_output` (validado pelo schema) ou extrai o primeiro `{...}` de `result`.
6. Timeout padrão de 180s; pesquisa de vagas 20 min; conversa de estudos 5 min; cronograma 6 min. `ENOENT` vira a mensagem "Claude Code não encontrado. Instale (`npm i -g @anthropic-ai/claude-code`) e rode `claude` uma vez para fazer login."
7. Toda resposta passa por uma função `normalize*` que garante tipos, limites (notas 0 a 10) e listas sempre presentes, porque a tela nunca confia no formato cru.

No provedor de API, os mesmos prompts e schemas são usados com `max_tokens: 16000` e, quando precisa de web, a ferramenta `web_search` (até 20 usos).

## Banco de dados (visão geral)

- Drizzle ORM com Postgres. Na `main`: Neon ou Postgres via `docker compose` (`DATABASE_URL`), com fallback para `localStorage` quando não há banco.
- No PR #6: sem `DATABASE_URL`, abre um **Postgres embutido (PGlite)** salvo em `apps/web/.data/pglite` e aplica as migrações de `apps/web/drizzle/` na partida (as consultas esperam as migrações terminarem).
- Esquema completo em [`anexos/schema-inicial.sql`](anexos/schema-inicial.sql). Cada documento lista as tabelas da sua feature.
- Plano para os próximos passos (fora deste PR): monorepo com um app por feature, Postgres em Docker compartilhado, login único e API de eventos (`POST /api/eventos` + outbox).
