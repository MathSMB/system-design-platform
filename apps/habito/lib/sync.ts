import "server-only";
import { dayInBrazil } from "@sdp/habit";
import { activities } from "@sdp/db";
import { ACTIVITY_OF, consume } from "@sdp/events";

/**
 * Lê os eventos novos da outbox (respostas, etapas, processos, desenhos avaliados
 * nos outros apps) e marca cada um como atividade do perfil, no dia em que aconteceu.
 * Os outros apps não precisam estar abertos: os eventos ficam esperando no banco.
 */
export async function syncActivities(): Promise<number> {
  return consume("habito", async (rows, tx) => {
    const values = rows.flatMap((e) => {
      const kind = ACTIVITY_OF[e.type as keyof typeof ACTIVITY_OF];
      if (!kind || !e.profileId) return [];
      return [{ profileId: e.profileId, kind, day: dayInBrazil(e.createdAt), ref: e.ref?.slice(0, 120) ?? null }];
    });
    if (values.length) await tx.insert(activities).values(values).onConflictDoNothing();
  });
}
