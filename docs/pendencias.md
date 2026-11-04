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
- Habit tracker, fases 1 e 2 prontas (nov/2026): contas com entrada de um clique, perfis, meta do seu jeito (itens que você marca + automáticos, com um padrão sugerido), ofensiva com failover e a placa-mãe que monta, se desgasta, é consertada e recomeça se queimar. Proposta: https://claude.ai/artifact/JYRg1yEgxVYe1aREvvUEPo
- Login de verdade com Google e GitHub (Auth.js), no lugar da entrada de um clique sem senha. Necessário antes de publicar o site.
- Habit tracker, fase 3: lembretes por e-mail ou notificação no celular (depois do deploy), efeitos novos no overclock (clock subindo, RGB novo a cada marco, adesivos de troféu), o dano cair na peça do seu tema mais fraco e meta em dobro consertando 2 níveis.
- ~~Plano de estudos com check de progresso~~: feito como Central de estudos (`/estudos`): pesquisa da vaga com IA e busca na web, gráfico de habilidades, "pronto para a vaga", trilhas (pós, certificação, livro, curso, projeto) montadas conversando com a IA, 3 projetos sugeridos e cronograma em blocos curtos com revisão espaçada e replanejamento, ligado à meta do dia.
- Central de estudos, próximos passos: lembrete do replanejamento de domingo (junto com os lembretes do hábito), importar as pesquisas prontas de Java, Python+React e DevOps como pesquisa da vaga, ligar a nota de cada pergunta das entrevistas a uma habilidade da pesquisa.
- Publicar o site na Vercel (Root Directory `apps/web`); a IA publicada precisa de `AI_PROVIDER=api`.
- System Design, próximos casos: rate limiter, pagamentos, sharding, autoscaling e pool de conexões bloqueante.
