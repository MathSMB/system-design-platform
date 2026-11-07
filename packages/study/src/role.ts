/**
 * Montador de cargo: área → back/front/full-stack → linguagens → senioridade.
 * Sai um nome padronizado ("Dev full-stack Java e React pleno"), que ajuda a pesquisa
 * a achar as vagas certas e a reaproveitar pesquisas do mesmo cargo.
 */

export type RoleArea = "dev" | "mobile" | "devops" | "dados" | "qa" | "seguranca";
export type DevFocus = "back" | "front" | "full";
export type RoleLevel = "junior" | "pleno" | "senior";

export interface RoleOption {
  id: string;
  title: string;
  /** Como aparece no nome do cargo. */
  short: string;
  /** Tecnologias que costumam vir junto (ponto de partida da pesquisa). */
  techs: string[];
}

export const ROLE_AREAS: { id: RoleArea; title: string; summary: string }[] = [
  { id: "dev", title: "Desenvolvimento", summary: "Back-end, front-end ou full-stack." },
  { id: "mobile", title: "Mobile", summary: "Apps Android e iOS." },
  { id: "devops", title: "DevOps / SRE", summary: "Nuvem, infraestrutura e confiabilidade." },
  { id: "dados", title: "Dados", summary: "Engenharia, análise e ciência de dados." },
  { id: "qa", title: "QA / Testes", summary: "Qualidade e automação de testes." },
  { id: "seguranca", title: "Cibersegurança", summary: "Defesa, testes de invasão e segurança de aplicações." },
];

export const DEV_FOCUS: { id: DevFocus; title: string; short: string }[] = [
  { id: "back", title: "Back-end", short: "back-end" },
  { id: "front", title: "Front-end", short: "front-end" },
  { id: "full", title: "Full-stack", short: "full-stack" },
];

export const BACK_LANGS: RoleOption[] = [
  { id: "java", title: "Java", short: "Java", techs: ["Java 17+", "Spring Boot", "JPA", "PostgreSQL"] },
  { id: "node", title: "Node.js / TypeScript", short: "Node.js", techs: ["Node.js", "TypeScript", "NestJS ou Express", "PostgreSQL"] },
  { id: "python", title: "Python", short: "Python", techs: ["Python", "Django ou FastAPI", "PostgreSQL"] },
  { id: "dotnet", title: "C# / .NET", short: ".NET", techs: ["C#", ".NET", "ASP.NET Core", "SQL Server"] },
  { id: "go", title: "Go", short: "Go", techs: ["Go", "gRPC", "PostgreSQL"] },
  { id: "php", title: "PHP", short: "PHP", techs: ["PHP", "Laravel", "MySQL"] },
  { id: "kotlin", title: "Kotlin", short: "Kotlin", techs: ["Kotlin", "Spring Boot", "PostgreSQL"] },
  { id: "ruby", title: "Ruby", short: "Ruby", techs: ["Ruby", "Rails", "PostgreSQL"] },
];

export const FRONT_LANGS: RoleOption[] = [
  { id: "react", title: "React", short: "React", techs: ["React", "TypeScript", "Next.js"] },
  { id: "angular", title: "Angular", short: "Angular", techs: ["Angular", "TypeScript", "RxJS"] },
  { id: "vue", title: "Vue", short: "Vue", techs: ["Vue 3", "TypeScript", "Nuxt"] },
];

/** As opções de cada área que não é "dev" (lá a escolha é feita pelas linguagens). */
export const AREA_OPTIONS: Record<Exclude<RoleArea, "dev">, RoleOption[]> = {
  mobile: [
    { id: "android", title: "Android (Kotlin)", short: "Dev Android", techs: ["Kotlin", "Jetpack Compose", "Coroutines"] },
    { id: "ios", title: "iOS (Swift)", short: "Dev iOS", techs: ["Swift", "SwiftUI", "Combine"] },
    { id: "flutter", title: "Flutter", short: "Dev mobile Flutter", techs: ["Dart", "Flutter"] },
    { id: "react-native", title: "React Native", short: "Dev mobile React Native", techs: ["React Native", "TypeScript", "Expo"] },
  ],
  devops: [
    { id: "aws", title: "DevOps com AWS", short: "DevOps AWS", techs: ["AWS", "Kubernetes", "Terraform", "CI/CD"] },
    { id: "azure", title: "DevOps com Azure", short: "DevOps Azure", techs: ["Azure", "AKS", "Azure DevOps"] },
    { id: "gcp", title: "DevOps com GCP", short: "DevOps GCP", techs: ["GCP", "GKE", "Terraform"] },
    { id: "sre", title: "SRE (confiabilidade)", short: "SRE", techs: ["SLO e SLI", "observabilidade", "Kubernetes", "Linux"] },
  ],
  dados: [
    { id: "eng", title: "Engenharia de dados", short: "Engenheiro de dados", techs: ["Python", "SQL", "Spark", "Airflow"] },
    { id: "analise", title: "Análise de dados", short: "Analista de dados", techs: ["SQL", "Power BI", "Python"] },
    { id: "ciencia", title: "Ciência de dados", short: "Cientista de dados", techs: ["Python", "estatística", "machine learning"] },
  ],
  qa: [
    { id: "auto", title: "Automação de testes", short: "QA automação", techs: ["Cypress ou Playwright", "testes de API", "CI"] },
    { id: "analista", title: "Analista de QA", short: "Analista de QA", techs: ["casos de teste", "testes exploratórios", "BDD"] },
  ],
  seguranca: [
    { id: "soc", title: "Analista de segurança (SOC)", short: "Analista de segurança (SOC)", techs: ["SIEM", "resposta a incidentes", "redes"] },
    { id: "pentest", title: "Pentest", short: "Pentester", techs: ["OWASP", "Burp Suite", "Kali Linux"] },
    { id: "appsec", title: "Segurança de aplicações (AppSec)", short: "Engenheiro AppSec", techs: ["OWASP", "SAST e DAST", "threat modeling"] },
    { id: "cloudsec", title: "Segurança em nuvem", short: "Engenheiro de segurança em nuvem", techs: ["AWS ou Azure", "IAM", "CSPM"] },
    { id: "grc", title: "Governança e conformidade (GRC)", short: "Analista de GRC", techs: ["ISO 27001", "LGPD", "gestão de riscos"] },
  ],
};

export const ROLE_LEVELS: { id: RoleLevel; title: string; short: string }[] = [
  { id: "junior", title: "Júnior", short: "júnior" },
  { id: "pleno", title: "Pleno", short: "pleno" },
  { id: "senior", title: "Sênior", short: "sênior" },
];

export interface RoleSpec {
  area: RoleArea;
  /** Só em "dev". */
  focus?: DevFocus;
  back?: string;
  front?: string;
  /** Nas outras áreas. */
  option?: string;
  level: RoleLevel;
}

const one = <T extends { id: string }>(list: T[], id: unknown) => list.find((x) => x.id === id);

/** Limpa o que veio da tela. Devolve null se faltar algum passo. */
export function cleanRoleSpec(x: unknown): RoleSpec | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const area = one(ROLE_AREAS, o.area)?.id;
  const level = one(ROLE_LEVELS, o.level)?.id;
  if (!area || !level) return null;
  if (area === "dev") {
    const focus = one(DEV_FOCUS, o.focus)?.id;
    if (!focus) return null;
    const back = focus !== "front" ? one(BACK_LANGS, o.back)?.id : undefined;
    const front = focus !== "back" ? one(FRONT_LANGS, o.front)?.id : undefined;
    if ((focus !== "front" && !back) || (focus !== "back" && !front)) return null;
    return { area, focus, ...(back ? { back } : {}), ...(front ? { front } : {}), level };
  }
  const option = one(AREA_OPTIONS[area], o.option)?.id;
  return option ? { area, option, level } : null;
}

/** "Dev full-stack Java e React pleno", "Dev back-end Python júnior", "Pentester sênior". */
export function roleName(s: RoleSpec): string {
  const lv = one(ROLE_LEVELS, s.level)!.short;
  if (s.area === "dev") {
    const f = one(DEV_FOCUS, s.focus)!.short;
    const langs = [one(BACK_LANGS, s.back)?.short, one(FRONT_LANGS, s.front)?.short].filter(Boolean).join(" e ");
    return `Dev ${f} ${langs} ${lv}`;
  }
  return `${one(AREA_OPTIONS[s.area], s.option)!.short} ${lv}`;
}

/** Tecnologias do cargo, para orientar a pesquisa. */
export function roleTechs(s: RoleSpec): string[] {
  if (s.area === "dev") return [...(one(BACK_LANGS, s.back)?.techs ?? []), ...(one(FRONT_LANGS, s.front)?.techs ?? [])];
  return one(AREA_OPTIONS[s.area], s.option)?.techs ?? [];
}
