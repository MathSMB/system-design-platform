# Pendências

Lista viva do que falta fazer. Cada pacote novo atualiza esta lista.

## Pesquisa profunda de vagas (Processo seletivo)

Uma vaga só abre no Processo seletivo depois de uma pesquisa profunda de mercado. Cada pesquisa precisa entregar:

- requisitos das vagas reais e temas com peso (como os 7 blocos do Java Pleno);
- faixa salarial CLT com fontes e data (Glassdoor, Indeed, vagas anunciadas), para BH e remoto;
- perguntas-base com o que o entrevistador quer ouvir (Java Pleno tem 40);
- vaga e faixa de cada empresa (banco digital, consultoria, software house) para a stack;
- escrever o conteúdo em `packages/hiring/src/tracks/` (como `python-fullstack.ts` e `devops.ts`), registrar em `TRACKS`, que vai para a tabela `market_profiles` no banco, e marcar a senioridade em `ready` no catálogo (`packages/hiring/src/tracks.ts`).

Renovar cada pesquisa a cada 6 meses.

| Área | Stack | Júnior | Pleno | Sênior |
|---|---|---|---|---|
| Back-end | Java e Spring Boot | pendente | **pronto (nov/2026)** | pendente |
| Back-end | Node.js e TypeScript | pendente | pendente | pendente |
| Back-end | Python | pendente | pendente | pendente |
| Back-end | C# e .NET | pendente | pendente | pendente |
| Back-end | Go | pendente | pendente | pendente |
| Front-end | React | pendente | pendente | pendente |
| Front-end | Angular | pendente | pendente | pendente |
| Front-end | Vue | pendente | pendente | pendente |
| Full stack | Java e React | pendente | pendente | pendente |
| Full stack | Node.js e React | pendente | pendente | pendente |
| Full stack | Python e React | pendente | **pronto (nov/2026)** | pendente |
| Full stack | .NET e Angular | pendente | pendente | pendente |
| Mobile | Android, iOS, Flutter, React Native | pendente | pendente | pendente |
| DevOps / SRE | AWS, Kubernetes e Terraform | pendente | **pronto (nov/2026)** | pendente |
| DevOps / SRE | Azure e Azure DevOps | pendente | pendente | pendente |
| DevOps / SRE | SRE (confiabilidade) | pendente | pendente | pendente |
| Dados | Engenharia de dados | pendente | pendente | pendente |
| QA | Automação de testes | pendente | pendente | pendente |

Prioridade citada pelo Matheus: Java Júnior e Sênior, Full stack Python e DevOps.

## Outras

- Renovar as pesquisas prontas (Java, Python e React, DevOps · Pleno) em mai/2027.
- Treino avulso em Entrevista técnica para Full stack Python e DevOps (hoje só Java Pleno tem a página de blocos; as perguntas já existem no pacote `hiring`).
- Habit tracker com contas de usuário (cada perfil com o seu); fazer análise e proposta antes de implementar.
- Publicar o site na Vercel (Root Directory `apps/web`); a IA publicada precisa de `AI_PROVIDER=api`.
- System Design, próximos casos: rate limiter, pagamentos, sharding, autoscaling e pool de conexões bloqueante.
