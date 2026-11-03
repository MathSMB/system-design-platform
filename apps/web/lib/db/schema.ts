import { bigserial, index, jsonb, pgTable, real, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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
 * Conta de usuário. Por enquanto a entrada é com um clique, sem senha
 * (uso pessoal). Login com Google e GitHub está nas pendências.
 */
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Um perfil = uma vaga que a pessoa treina (stack + senioridade), com a sua meta diária e o seu rack. */
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  stack: text("stack").notNull(),
  level: text("level").notNull(),
  /** "leve" | "regular" | "intensa" */
  goal: text("goal").notNull(),
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

export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
