# 5. Pair Programming: mentor passo a passo

App `apps/pair`, porta 3005, cor-assinatura amarela (`--warn`). Issue #32.

## O que é

Um mentor de IA que programa do lado da pessoa, como um dev sênior com um júnior. Ele explica o ambiente (IDE, JDK, variáveis de ambiente), o Git e o código **linha por linha**, entrega **um passo por vez** e só segue quando a pessoa diz **"pode continuar"**.

Decisão do Matheus (07/11/2026): o app é **100% IA**. Não há guia pronto nem resposta guardada para reaproveitar. O banco guarda só as conversas, para retomar o contexto.

## Telas

- **Sem conta:** a landing (vídeo com legendas, seções com prints). Entrar sempre leva ao Painel.
- **Nova conversa** (`#pair-nova`): o que quer construir (com 4 ideias de exemplo), linguagem/stack (chips ou texto livre) e, recolhido em "Ligar aos Estudos e à pasta do projeto (opcional)", a trilha dos Estudos e a pasta do projeto no computador.
- **Conversas** (`#pair-conversas`): lista agrupada por dia (Hoje, Ontem, dd/mm), com "passo N de M". Apagar no hover.
- **Conversa** (`#pair-chat`):
  - topo com título, stack, "ligado aos Estudos", "pasta ligada / não encontrada" e o botão de ajustes (pasta e trilha);
  - barra do roteiro: "PASSO 7/12" + título do passo; clicar abre o roteiro inteiro (feitos riscados, atual em amarelo);
  - mensagens do mentor em Markdown. Em todo bloco de código, cada linha é clicável e manda "Explica essa linha, parte por parte";
  - atalhos: **Pode continuar** (quando a resposta espera ação), **Explica mais devagar**, **Deu erro** (preenche a caixa), **Confere pra mim** (com pasta ou trilha);
  - a caixa de texto: Enter envia, Shift+Enter quebra a linha.

## A IA

- **Persona:** `.claude/skills/pair-programming/SKILL.md`. É uma skill de projeto do Claude Code (`/pair-programming` no terminal) e, ao mesmo tempo, o prompt de sistema do app: `loadPairPersona()` procura o arquivo subindo a partir da pasta do app e tira o cabeçalho. Sem o arquivo, usa um resumo embutido.
- **Formato:** `packages/ai/src/pair.ts` junta a persona com `PAIR_FORMAT` e pede o JSON `{ reply, plan, step, waiting, summary }`:
  - `reply`: Markdown, código em bloco com a linguagem e o caminho do arquivo em negrito na linha de cima;
  - `plan`: o roteiro inteiro quando é criado ou muda, senão `[]`;
  - `step`: índice do passo atual (só avança quando a pessoa diz que pode continuar);
  - `waiting`: a resposta espera a pessoa fazer algo;
  - `summary`: resumo da conversa inteira, que substitui as mensagens antigas.
- **Contexto que vai a cada mensagem:** objetivo, stack, Windows, quem é (cargo, experiência, perfil), o roteiro com o passo atual, o resumo (quando há mais de 10 mensagens) e as últimas 10 mensagens. Com trilha ligada: título, passos marcados, repositório, últimos 5 commits e as habilidades em "domino"/"estudando" dos Estudos (lido do banco na hora, sem IA).
- **Conferir a pasta:** com a pasta do projeto existente, o Claude Code roda com `cwd` e `--add-dir` nela e com as ferramentas `Read, Glob, Grep` e `Bash` liberado só para `git status`, `git log`, `git diff`, `git branch` e `git remote -v`. Sempre com `WebSearch` e `WebFetch` para conferir versões e documentação. Pela API (`AI_PROVIDER=api`) não há acesso à pasta: o mentor pede a saída dos comandos.
- Timeout de 6 minutos.

## Dados

- `pair_chats`: `profile_id`, `title`, `day` (dia em Brasília, agrupa a lista), `summary`, `setup` (`{ goal, stack, trailId?, folder? }`), `plan` (títulos), `step`, `pending_since` (a tela espera a resposta mesmo se a janela fechou; trava depois de 7 min).
- `pair_messages`: `chat_id`, `role`, `text`, `data` (`{ step, waiting }`).
- Migração `packages/db/drizzle/0005_pair_programming.sql`.

## API

- `GET /api/pair/conversas` lista; `?id=` traz a conversa com as mensagens.
- `POST /api/pair/conversas` abre `{ goal, stack, trailId?, folder? }`; a tela manda a primeira mensagem em seguida.
- `PATCH /api/pair/conversas` muda `{ id, folder?, trailId?, title? }`; `DELETE ?id=` apaga.
- `POST /api/pair/conversa` `{ chatId, text, retry? }`: grava a mensagem, chama a IA e grava a resposta.
- `GET /api/pair/estudos`: as trilhas dos Estudos para ligar (projetos primeiro).

## Eventos

Quando o passo avança sem o roteiro mudar de tamanho, cada passo que ficou para trás grava `pair.passo-concluido` (`ref` = `<conversa>:<índice>`, payload `{ step, title, day }`). O Hábito conta como `project` (avanço no projeto).

## Demonstração

`scripts/demos/semear-pair.mjs <profileId>` cria 4 conversas de exemplo (depois de `semear.mjs` e `semear-estudos.mjs`). `scripts/demos/pair.mjs <cookie>` grava o vídeo (respostas da IA simuladas) e `SO=pair node scripts/demos/prints.mjs <cookie> <profileId>` refaz os prints.
