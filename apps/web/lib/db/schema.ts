import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

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
