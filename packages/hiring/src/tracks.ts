/**
 * Catálogo de vagas: área → stack → senioridade.
 * Cada combinação só fica jogável quando tem pesquisa profunda de mercado
 * (requisitos das vagas, temas com peso, faixa salarial com fontes e perguntas-base).
 * Hoje só Java Pleno tem. O resto aparece como "pesquisa pendente".
 */

export type Level = "junior" | "pleno" | "senior";

export const LEVELS: { id: Level; title: string; years: string }[] = [
  { id: "junior", title: "Júnior", years: "0 a 2 anos" },
  { id: "pleno", title: "Pleno", years: "2 a 5 anos" },
  { id: "senior", title: "Sênior", years: "5+ anos" },
];

export type AreaId = "backend" | "frontend" | "fullstack" | "mobile" | "devops" | "dados" | "qa";

export interface Stack {
  id: string;
  area: AreaId;
  title: string;
  /** Tecnologias que as vagas costumam pedir (resumo, antes da pesquisa profunda). */
  techs: string[];
  /** Senioridades com pesquisa pronta. */
  ready: Level[];
}

export const AREAS: { id: AreaId; title: string; summary: string }[] = [
  { id: "backend", title: "Back-end", summary: "APIs, regras de negócio, banco de dados e mensageria." },
  { id: "frontend", title: "Front-end", summary: "Interfaces web, estado, performance e acessibilidade." },
  { id: "fullstack", title: "Full stack", summary: "Do banco à tela: API e front na mesma vaga." },
  { id: "mobile", title: "Mobile", summary: "Apps Android e iOS, nativos ou multiplataforma." },
  { id: "devops", title: "DevOps / SRE", summary: "Nuvem, infraestrutura como código, CI/CD e confiabilidade." },
  { id: "dados", title: "Dados", summary: "Pipelines, SQL, modelagem e processamento em lote ou streaming." },
  { id: "qa", title: "QA / Testes", summary: "Automação de testes, qualidade e estratégia de testes." },
];

export const STACKS: Stack[] = [
  { id: "java", area: "backend", title: "Java e Spring Boot", techs: ["Java 17+", "Spring Boot", "JPA", "Kafka", "PostgreSQL"], ready: ["pleno"] },
  { id: "node", area: "backend", title: "Node.js e TypeScript", techs: ["Node.js", "TypeScript", "NestJS ou Express", "PostgreSQL", "Redis"], ready: [] },
  { id: "python", area: "backend", title: "Python", techs: ["Python", "Django ou FastAPI", "PostgreSQL", "Celery", "Docker"], ready: [] },
  { id: "dotnet", area: "backend", title: "C# e .NET", techs: [".NET 8", "ASP.NET Core", "Entity Framework", "SQL Server", "Azure"], ready: [] },
  { id: "go", area: "backend", title: "Go", techs: ["Go", "gRPC", "PostgreSQL", "Kubernetes"], ready: [] },
  { id: "react", area: "frontend", title: "React", techs: ["React", "TypeScript", "Next.js", "testes com Testing Library"], ready: [] },
  { id: "angular", area: "frontend", title: "Angular", techs: ["Angular", "TypeScript", "RxJS", "NgRx"], ready: [] },
  { id: "vue", area: "frontend", title: "Vue", techs: ["Vue 3", "TypeScript", "Pinia", "Nuxt"], ready: [] },
  { id: "java-react", area: "fullstack", title: "Java e React", techs: ["Java", "Spring Boot", "React", "TypeScript", "PostgreSQL"], ready: [] },
  { id: "node-react", area: "fullstack", title: "Node.js e React", techs: ["Node.js", "TypeScript", "React", "Next.js", "PostgreSQL"], ready: [] },
  { id: "python-react", area: "fullstack", title: "Python e React", techs: ["Python", "Django ou FastAPI", "React", "TypeScript", "PostgreSQL"], ready: ["pleno"] },
  { id: "dotnet-angular", area: "fullstack", title: ".NET e Angular", techs: ["C#", ".NET", "Angular", "SQL Server"], ready: [] },
  { id: "android", area: "mobile", title: "Android (Kotlin)", techs: ["Kotlin", "Jetpack Compose", "Coroutines", "Room"], ready: [] },
  { id: "ios", area: "mobile", title: "iOS (Swift)", techs: ["Swift", "SwiftUI", "Combine", "Core Data"], ready: [] },
  { id: "flutter", area: "mobile", title: "Flutter", techs: ["Dart", "Flutter", "Bloc ou Riverpod"], ready: [] },
  { id: "react-native", area: "mobile", title: "React Native", techs: ["React Native", "TypeScript", "Expo"], ready: [] },
  { id: "aws-k8s", area: "devops", title: "AWS, Kubernetes e Terraform", techs: ["AWS", "Kubernetes", "Terraform", "CI/CD", "Prometheus e Grafana"], ready: ["pleno"] },
  { id: "azure", area: "devops", title: "Azure e Azure DevOps", techs: ["Azure", "AKS", "Bicep ou Terraform", "Azure DevOps"], ready: [] },
  { id: "sre", area: "devops", title: "SRE (confiabilidade)", techs: ["SLO e SLI", "observabilidade", "incidentes", "Kubernetes", "Linux"], ready: [] },
  { id: "data-eng", area: "dados", title: "Engenharia de dados", techs: ["Python", "SQL", "Spark", "Airflow", "dbt"], ready: [] },
  { id: "qa-auto", area: "qa", title: "Automação de testes", techs: ["Cypress ou Playwright", "Selenium", "testes de API", "CI"], ready: [] },
];

export const stacksOf = (area: AreaId) => STACKS.filter((s) => s.area === area);
export const getStack = (id: string) => STACKS.find((s) => s.id === id);
export const isReady = (stack: string, level: Level) => !!getStack(stack)?.ready.includes(level);
export const trackTitle = (stack: string, level: Level) => `${getStack(stack)?.title ?? stack} · ${LEVELS.find((l) => l.id === level)!.title}`;

/** Pesquisa de mercado de uma stack e senioridade (o que fica salvo no banco). */
export interface MarketProfile {
  stack: string;
  level: Level;
  researchedAt: string;
  /** Faixa mensal CLT típica (R$). */
  band: [number, number];
  sources: { label: string; value: string; url: string }[];
  /** Temas que as vagas mais pedem, com peso de 1 a 3. */
  topics: { title: string; weight: number }[];
}
