import { events, eventCursors, getDb, type Db, type EventRow } from "@sdp/db";
import { asc, eq, gt, sql } from "drizzle-orm";
import type { AppId, NewEvent } from "./types";

export * from "./types";

export interface Who {
  userId?: string | null;
  profileId?: string | null;
}

/**
 * Grava um evento na outbox. Volta true se gravou e false se ele já existia
 * (mesmo tipo, perfil e ref). Um erro aqui nunca derruba quem chamou.
 */
export async function emit(source: AppId, who: Who | null, ev: NewEvent, db: Db = getDb()): Promise<boolean> {
  try {
    const rows = await db
      .insert(events)
      .values({ type: ev.type, source, userId: who?.userId ?? null, profileId: who?.profileId ?? null, ref: ev.ref ?? null, payload: ev.payload ?? {} })
      .onConflictDoNothing()
      .returning({ id: events.id });
    return rows.length > 0;
  } catch (e) {
    console.error("[eventos] não deu para gravar:", e);
    return false;
  }
}

/**
 * Lê os eventos novos para um leitor (ex. "habito"), em ordem, e anda o cursor.
 * O cursor só anda depois que `handle` termina, na mesma transação: se der erro,
 * os mesmos eventos voltam na próxima leitura. Volta quantos eventos leu.
 */
export async function consume(consumer: string, handle: (rows: EventRow[], tx: Db) => Promise<void>, opts: { batch?: number; db?: Db } = {}): Promise<number> {
  const db = opts.db ?? getDb();
  const batch = opts.batch ?? 500;
  let total = 0;
  for (;;) {
    const n = await db.transaction(async (tx) => {
      await tx.insert(eventCursors).values({ consumer }).onConflictDoNothing();
      // trava o cursor: dois pedidos ao mesmo tempo não leem o mesmo lote
      const [cur] = await tx.select().from(eventCursors).where(eq(eventCursors.consumer, consumer)).for("update");
      const rows = await tx.select().from(events).where(gt(events.id, cur!.lastId)).orderBy(asc(events.id)).limit(batch);
      if (!rows.length) return 0;
      await handle(rows, tx as unknown as Db);
      await tx.update(eventCursors).set({ lastId: rows[rows.length - 1]!.id, updatedAt: sql`now()` }).where(eq(eventCursors.consumer, consumer));
      return rows.length;
    });
    total += n;
    if (n < batch) return total;
  }
}

/** Os últimos eventos de um perfil (ou de todos, sem perfil), do mais novo ao mais velho. */
export async function recentEvents(profileId: string | null, limit = 30, db: Db = getDb()) {
  const where = profileId ? eq(events.profileId, profileId) : undefined;
  return db.select().from(events).where(where).orderBy(sql`${events.id} desc`).limit(limit);
}

