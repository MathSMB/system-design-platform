// Dados de exemplo da Central de estudos (pesquisa pronta, trilhas, projetos e cronograma)
// para a conta de demonstração. Uso: node scripts/demos/semear-estudos.mjs <profileId>
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../packages/db/package.json"));
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL || "postgres://sdp:sdp@localhost:5434/sdp", { onnotice: () => {} });
const pid = process.argv[2];
const day = (offset) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + offset * 864e5));
const today = day(0);
const ROLE = "Desenvolvedor Java Pleno";

const sk = (name, frequency, category, must) => ({ name, frequency, category, must });
const research = {
  role: ROLE,
  level: "pleno",
  summary: "Vagas de Java pleno pedem Spring Boot com APIs REST, banco relacional e mensageria. Testes automatizados e Docker aparecem em quase todas; nuvem e observabilidade são o diferencial mais comum.",
  postingsAnalyzed: 64,
  skills: [
    sk("Java 17+", 97, "Linguagem", true),
    sk("Spring Boot", 94, "Framework", true),
    sk("APIs REST", 88, "Arquitetura", true),
    sk("SQL e PostgreSQL", 81, "Banco de dados", true),
    sk("JUnit e Mockito", 72, "Práticas", true),
    sk("Docker", 66, "Infra", true),
    sk("Kafka ou RabbitMQ", 58, "Mensageria", false),
    sk("AWS", 47, "Nuvem", false),
    sk("Microsserviços", 44, "Arquitetura", false),
    sk("Observabilidade", 31, "Práticas", false),
  ],
  band: [7500, 11500],
  questions: ["Como você evita N+1 no JPA?", "Exceção checked ou unchecked para regra de negócio?", "Como garante idempotência num consumidor Kafka?"],
  sources: [{ label: "Anúncios de vagas analisados", url: "https://www.linkedin.com/jobs/" }],
  researchedAt: day(-12),
};
const u = (titles, done = 0) => titles.map((title, i) => ({ id: `u${i + 1}`, title, done: i < done }));
const trails = [
  { id: "tlivro", kind: "livro", title: "Java Efetivo (Joshua Bloch)", why: "Base de Java que as entrevistas de pleno cobram.", importance: 3, perWeek: 3, sessionMin: 25, deadline: null, skills: ["Java 17+"], units: u(["Criar e destruir objetos", "Métodos comuns", "Classes e interfaces", "Genéricos", "Enums e anotações", "Lambdas e streams", "Exceções", "Concorrência"], 5) },
  { id: "tcert", kind: "certificacao", title: "AWS Cloud Practitioner", why: "AWS aparece em quase metade das vagas.", importance: 2, perWeek: 2, sessionMin: 30, deadline: day(40), skills: ["AWS"], units: u(["Conceitos de nuvem", "Segurança", "Tecnologia", "Cobrança", "Simulado"], 1) },
  { id: "tproj", kind: "projeto", title: "API de pagamentos com Kafka", why: "Projeto de portfólio que pratica as lacunas: mensageria e testes.", importance: 3, perWeek: 3, sessionMin: 40, deadline: null, skills: ["Spring Boot", "Kafka ou RabbitMQ", "JUnit e Mockito"], units: u(["API de transferências com Spring Boot", "Postgres e migrações", "Evento no Kafka com idempotência", "Testes com Testcontainers", "Docker Compose e README"], 2) },
];
const projectOptions = [
  { title: "API de pagamentos com Kafka", pitch: "Transferências com saldo, evento por transferência e consumidor idempotente.", skills: ["Spring Boot", "Kafka ou RabbitMQ", "JUnit e Mockito"], deliverables: ["API de transferências", "Postgres e migrações", "Evento no Kafka", "Testes com Testcontainers", "Docker Compose"], weeks: 5 },
  { title: "Encurtador de URL observável", pitch: "Encurtador com cache, métricas e painel no Grafana.", skills: ["Docker", "Observabilidade"], deliverables: ["API", "Cache Redis", "Métricas", "Painel"], weeks: 3 },
  { title: "Agenda de consultas na AWS", pitch: "CRUD com autenticação, deploy na AWS e fila de lembretes.", skills: ["AWS", "APIs REST"], deliverables: ["API", "Login", "Deploy", "Fila de lembretes"], weeks: 4 },
];
let n = 0;
const it = (d, title, kind, minutes, trailId, unitId, skill, why) => ({ id: `demo-${++n}`, day: day(d), title, kind, minutes, trailId, unitId, skill, why });
const items = [
  it(-1, "Java Efetivo: cap. 5, Enums e anotações", "estudo", 25, "tlivro", "u5", "Java 17+", "Livro essencial, 3x por semana."),
  it(-1, "Revisão: genéricos (cap. 4)", "revisao", 10, "tlivro", "u4", "Java 17+", "Revisão espaçada: 7 dias depois."),
  it(0, "Projeto: evento no Kafka com idempotência", "projeto", 40, "tproj", "u3", "Kafka ou RabbitMQ", "Maior lacuna da vaga."),
  it(0, "Treino com nota: 3 perguntas de Spring", "teste", 15, null, null, "Spring Boot", "Testa o que você estudou na semana."),
  it(1, "AWS: Segurança", "estudo", 30, "tcert", "u2", "AWS", "Prova em 40 dias."),
  it(1, "Revisão: Enums e anotações", "revisao", 10, "tlivro", "u5", "Java 17+", "Revisão espaçada: 2 dias depois."),
  it(2, "Java Efetivo: cap. 6, Lambdas e streams", "estudo", 25, "tlivro", "u6", "Java 17+", "Livro essencial."),
  it(2, "Projeto: testes com Testcontainers", "projeto", 40, "tproj", "u4", "JUnit e Mockito", "Testes aparecem em 72% das vagas."),
  it(3, "AWS: Tecnologia", "estudo", 30, "tcert", "u3", "AWS", "Prova em 40 dias."),
];
const schedule = {
  createdAt: day(-1), from: day(-1), until: day(12), items,
  outline: [{ week: day(7), focus: "Fechar o projeto de pagamentos e o capítulo de exceções" }, { week: day(14), focus: "Simulado AWS e entrevistas com nota" }],
  notes: "Blocos curtos nos dias úteis e o projeto no sábado. Revisão espaçada de 2 e 7 dias para o livro.",
};
const availability = { minutes: [60, 60, 45, 60, 45, 120, 0], targetDate: day(60), slack: 0.2, notes: "Domingo é folga" };
const skillStatus = { "Java 17+": 2, "Spring Boot": 2, "APIs REST": 2, "SQL e PostgreSQL": 1, "Docker": 1 };

await sql`delete from role_research where id = 'desenvolvedor-java-pleno:pleno'`;
await sql`insert into role_research (id, role, level, status, data, researched_at) values ('desenvolvedor-java-pleno:pleno', ${ROLE}, 'pleno', 'done', ${sql.json(research)}, ${research.researchedAt})`;
await sql`delete from study_centers where profile_id = ${pid}`;
await sql`insert into study_centers (profile_id, target_role, availability, trails, project_options, skill_status, schedule)
  values (${pid}, ${ROLE}, ${sql.json(availability)}, ${sql.json(trails)}, ${sql.json(projectOptions)}, ${sql.json(skillStatus)}, ${sql.json(schedule)})`;
await sql`delete from checkins where profile_id = ${pid} and item_id like 'c:%'`;
await sql`insert into checkins (profile_id, day, item_id) values (${pid}, ${day(-1)}, 'c:demo-1'), (${pid}, ${day(-1)}, 'c:demo-2')`;
console.log("ok", today);
await sql.end();
