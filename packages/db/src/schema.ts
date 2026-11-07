import { bigint, bigserial, index, jsonb, pgTable, primaryKey, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** Um desenho salvo: o grafo (com posições no canvas) em JSON. */
export const designs = pgTable("designs", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  problem: text("problem"),
  document: jsonb("document").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Design = typeof designs.$inferSelect;

/**
 * Uma entrevista feita na plataforma (processo seletivo ou treino), com todas
 * as respostas, o feedback de cada uma e o feedback geral. É o seu histórico.
 */
export const interviewRuns = pgTable("interview_runs", {
  /** Gerado no navegador, para salvar de novo sem duplicar. */
  id: uuid("id").primaryKey(),
  kind: text("kind").notNull(), // "processo" | "treino"
  /** Conta e perfil de quem fez (vazio quando foi sem entrar). */
  userId: uuid("user_id"),
  profileId: uuid("profile_id"),
  stack: text("stack").notNull(),
  level: text("level").notNull(),
  company: text("company"),
  title: text("title").notNull(),
  /** Resultado em uma frase: contratado, eliminado em..., média do treino. */
  outcome: text("outcome"),
  /** Nível que as respostas mostraram. */
  levelShown: text("level_shown"),
  /** Nota de 0 a 10. */
  score: real("score"),
  /** Estado completo da entrevista (respostas e avaliações). */
  state: jsonb("state").notNull(),
  /** Feedback geral da IA. */
  feedback: jsonb("feedback"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Pesquisa de mercado de uma stack e senioridade, feita uma vez e reaproveitada
 * (sem gastar token de novo): requisitos, temas, faixa salarial e fontes.
 */
export const marketProfiles = pgTable("market_profiles", {
  /** "<stack>:<nível>", ex. "java:pleno". */
  id: text("id").primaryKey(),
  stack: text("stack").notNull(),
  level: text("level").notNull(),
  data: jsonb("data").notNull(),
  researchedAt: text("researched_at").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InterviewRun = typeof interviewRuns.$inferSelect;
export type MarketProfile = typeof marketProfiles.$inferSelect;

/**
 * Conta de usuário. Entra com GitHub, com Google ou, sem chaves configuradas,
 * com um clique (uso pessoal, local).
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  avatarUrl: text("avatar_url"),
  /** Cargo de hoje (ex. "Desenvolvedor júnior", "Estudante"). */
  jobTitle: text("job_title"),
  /** Tempo de experiência: "0" | "1-2" | "3-5" | "6+". */
  experience: text("experience"),
  /** Objetivo: "primeiro-emprego" | "trocar-empresa" | "subir-nivel" | "mudar-area" | "afiado". */
  objective: text("objective"),
  /** Contas conectadas (login com GitHub e Google). */
  githubId: text("github_id").unique(),
  githubLogin: text("github_login"),
  googleId: text("google_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Um perfil = uma vaga que a pessoa treina (stack + senioridade), com a sua meta diária e o seu rack. */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  stack: text("stack").notNull(),
  level: text("level").notNull(),
  /** Modelo da meta: "sugerida" | "leve" | "regular" | "intensa" | "personalizada". */
  goal: text("goal").notNull(),
  /** Itens da meta diária ({ mode, items }); vazio = o plano do modelo. */
  plan: jsonb("plan"),
  /** Metas anteriores ([{ until, plan }]): trocar a meta não muda o passado. */
  planHistory: jsonb("plan_history"),
  /** Primeiro dia do rack (AAAA-MM-DD, horário de Brasília). */
  startDay: text("start_day").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Cada coisa feita na plataforma que conta para a meta do dia, marcada sozinha. */
export const activities = pgTable(
  "activities",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: uuid("profile_id").notNull(),
    /** "answer" | "stage" | "process" | "design" */
    kind: text("kind").notNull(),
    /** Dia em Brasília (AAAA-MM-DD). */
    day: text("day").notNull(),
    /** Evita contar duas vezes a mesma etapa ou processo (ex. "<id do processo>:tecnica"). */
    ref: text("ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("activities_once").on(t.profileId, t.kind, t.ref), index("activities_day").on(t.profileId, t.day)],
);

/** Itens manuais da meta marcados como feitos em um dia (o seu tipo de estudo). */
export const checkins = pgTable(
  "checkins",
  {
    profileId: uuid("profile_id").notNull(),
    /** Dia em Brasília (AAAA-MM-DD). */
    day: text("day").notNull(),
    itemId: text("item_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.day, t.itemId] })],
);

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;

/**
 * Central de estudos de um perfil: cargo alvo, disponibilidade, trilhas (pós, livro,
 * certificação, projeto…), projetos sugeridos, o que você já domina e o cronograma.
 */
export const studyCenters = pgTable("study_centers", {
  profileId: uuid("profile_id").primaryKey(),
  /** Ex. "Desenvolvedor Java Pleno". */
  targetRole: text("target_role"),
  /** { hours: [seg..dom], targetDate?, slack } */
  availability: jsonb("availability"),
  /** Trilhas com unidades (capítulos, matérias, módulos). */
  trails: jsonb("trails"),
  /** Opções de projeto sugeridas pela IA (escolher uma vira trilha). */
  projectOptions: jsonb("project_options"),
  /** { "<habilidade>": 0 | 1 | 2 } = não sei, estudando, domino. */
  skillStatus: jsonb("skill_status"),
  /** O cronograma atual (itens por dia) e o esboço das próximas semanas. */
  schedule: jsonb("schedule"),
  /** O cargo montado passo a passo: { area, focus, back, front, option, level }. */
  roleSpec: jsonb("role_spec"),
  /** A pesquisa do histórico que o cronograma usa (study_research.id). */
  researchId: uuid("research_id"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Pesquisa de vagas de um cargo (feita pela IA com busca na web), reaproveitada por 6 meses. */
export const roleResearch = pgTable("role_research", {
  /** "<cargo normalizado>:<nível>". */
  id: text("id").primaryKey(),
  role: text("role").notNull(),
  level: text("level").notNull(),
  /** "running" | "done" | "error" */
  status: text("status").notNull(),
  data: jsonb("data"),
  error: text("error"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  researchedAt: text("researched_at"),
});

export type StudyCenter = typeof studyCenters.$inferSelect;
export type RoleResearchRow = typeof roleResearch.$inferSelect;

/**
 * Histórico de pesquisas de vaga de cada perfil: uma linha por pesquisa, com tudo o que
 * ela gerou. Nada é sobrescrito; você escolhe qual delas o cronograma usa.
 */
export const studyResearch = pgTable(
  "study_research",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").notNull(),
    role: text("role").notNull(),
    level: text("level").notNull(),
    /** O cargo montado, quando veio do montador. */
    roleSpec: jsonb("role_spec"),
    /** "running" | "done" | "error" */
    status: text("status").notNull(),
    /** A pesquisa inteira (RoleResearch): habilidades, resumo, faixa, perguntas, fontes. */
    data: jsonb("data"),
    error: text("error"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    /** Dia em Brasília (AAAA-MM-DD) em que terminou. */
    researchedAt: text("researched_at"),
  },
  (t) => [index("study_research_profile").on(t.profileId, t.startedAt)],
);

/** Uma conversa com a IA da Central de estudos. */
export const studyChats = pgTable(
  "study_chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").notNull(),
    /** A primeira frase dele, para achar a conversa na lista. */
    title: text("title").notNull().default(""),
    /** Resumo curto da conversa, atualizado pela IA: vai no lugar das mensagens antigas (economiza token). */
    summary: text("summary").notNull().default(""),
    /** A IA está respondendo desde (para a tela mostrar e esperar, mesmo se a janela fechou). */
    pendingSince: timestamp("pending_since", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("study_chats_profile").on(t.profileId, t.updatedAt)],
);

/** Cada mensagem de uma conversa. */
export const studyChatMessages = pgTable(
  "study_chat_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    chatId: uuid("chat_id").notNull(),
    /** "user" | "assistant" */
    role: text("role").notNull(),
    text: text("text").notNull(),
    /** O que veio junto: { action, trail, used, attachments: [ids] }. */
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("study_chat_messages_chat").on(t.chatId, t.id)],
);

/** Print ou PDF anexado numa conversa. O arquivo fica numa pasta local; aqui vai o caminho e o que a IA leu dele. */
export const studyAttachments = pgTable(
  "study_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").notNull(),
    chatId: uuid("chat_id"),
    name: text("name").notNull(),
    mime: text("mime").notNull(),
    size: bigint("size", { mode: "number" }).notNull(),
    /** Caminho do arquivo na pasta de anexos (relativo a ela). */
    path: text("path").notNull(),
    /** O que a IA leu do anexo na primeira vez: as mensagens seguintes usam isso, sem reenviar o arquivo. */
    extracted: text("extracted"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("study_attachments_chat").on(t.chatId)],
);

/** Cada versão do cronograma gerada, com a pesquisa usada, o tempo livre e o "ideal x real". */
export const studySchedules = pgTable(
  "study_schedules",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    profileId: uuid("profile_id").notNull(),
    researchId: uuid("research_id"),
    availability: jsonb("availability").notNull(),
    schedule: jsonb("schedule").notNull(),
    /** Ritmo calculado e dicas da IA para chegar perto do ideal. */
    pace: jsonb("pace"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("study_schedules_profile").on(t.profileId, t.createdAt)],
);

export type StudyResearchRow = typeof studyResearch.$inferSelect;
export type StudyChat = typeof studyChats.$inferSelect;
export type StudyChatMessage = typeof studyChatMessages.$inferSelect;
export type StudyAttachment = typeof studyAttachments.$inferSelect;

/**
 * Eventos entre os apps (tabela outbox). Cada app grava aqui o que aconteceu
 * (uma resposta avaliada, um processo terminado, um desenho avaliado) e quem
 * se interessa lê depois, no seu ritmo. Os apps não precisam estar abertos juntos.
 */
export const events = pgTable(
  "events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    /** Ex. "resposta.avaliada", "etapa.concluida", "processo.concluido", "design.avaliado". */
    type: text("type").notNull(),
    /** App que gravou: "system-design", "entrevista", "estudos", "habito", "pair", "painel". */
    source: text("source").notNull(),
    userId: uuid("user_id"),
    profileId: uuid("profile_id"),
    /** Evita gravar o mesmo evento duas vezes (ex. "<id do processo>:tecnica"). */
    ref: text("ref"),
    payload: jsonb("payload").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("events_once").on(t.type, t.profileId, t.ref), index("events_profile").on(t.profileId, t.id)],
);

/** Até onde cada leitor de eventos já leu (ex. o app Hábito). */
export const eventCursors = pgTable("event_cursors", {
  consumer: text("consumer").primaryKey(),
  lastId: bigint("last_id", { mode: "number" }).notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type EventRow = typeof events.$inferSelect;

/**
 * Token do GitHub (fine-grained, só leitura) de cada conta, criptografado com AES-256-GCM.
 * Nunca volta para o navegador: a tela vê só `hint` (os 4 últimos caracteres) e o login.
 */
export const githubTokens = pgTable("github_tokens", {
  userId: uuid("user_id").primaryKey(),
  /** "iv.tag.cifra", tudo em base64url. */
  tokenEnc: text("token_enc").notNull(),
  hint: text("hint").notNull(),
  login: text("login"),
  /** Validade do token, quando o GitHub informa (cabeçalho github-authentication-token-expiration). */
  expiresAt: text("expires_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Uma conversa do Pair Programming. Toda resposta vem da IA; aqui fica só a conversa,
 * para retomar o contexto depois (a IA recebe o resumo + as últimas mensagens).
 */
export const pairChats = pgTable(
  "pair_chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").notNull(),
    /** O que ele quer construir, para achar a conversa na lista. */
    title: text("title").notNull().default(""),
    /** Dia em Brasília (AAAA-MM-DD) em que a conversa começou: a lista agrupa por ele. */
    day: text("day").notNull(),
    /** Resumo da conversa, atualizado pela IA a cada resposta: vai no lugar das mensagens antigas. */
    summary: text("summary").notNull().default(""),
    /**
     * Do que se trata: { goal, stack, trailId?, folder? }. trailId liga a uma trilha dos Estudos
     * (opcional); folder é a pasta do projeto no computador, que a IA pode ler para conferir.
     */
    setup: jsonb("setup").notNull().default({}),
    /** O roteiro que a IA montou ([títulos]) e o passo atual (0 = o primeiro). */
    plan: jsonb("plan").notNull().default([]),
    step: bigint("step", { mode: "number" }).notNull().default(0),
    /** A IA está respondendo desde (a tela espera, mesmo se a janela fechou). */
    pendingSince: timestamp("pending_since", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pair_chats_profile").on(t.profileId, t.updatedAt)],
);

/** Cada mensagem de uma conversa do Pair Programming. */
export const pairMessages = pgTable(
  "pair_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    chatId: uuid("chat_id").notNull(),
    /** "user" | "assistant" */
    role: text("role").notNull(),
    text: text("text").notNull(),
    /** O que veio junto da resposta: { step, waiting, checked }. */
    data: jsonb("data").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("pair_messages_chat").on(t.chatId, t.id)],
);

export type PairChat = typeof pairChats.$inferSelect;
export type PairMessage = typeof pairMessages.$inferSelect;
