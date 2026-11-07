import "server-only";
import { addDays, dayInBrazil } from "@sdp/habit";
import { activities } from "@sdp/db";
import { ACTIVITY_OF, consume } from "@sdp/events";

/**
 * O dia em que a coisa aconteceu: `payload.day` (ex. o dia do commit, lido depois) quando vem
 * e não é de mais de 7 dias antes da gravação; senão, o dia em que o evento foi gravado.
 */
function dayOf(e: { createdAt: Date; payload: unknown }): string {
  const recorded = dayInBrazil(e.createdAt);
  const d = (e.payload as { day?: unknown } | null)?.day;
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d) || d > recorded || d < addDays(recorded, -7)) return recorded;
  return d;
}

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
      return [{ profileId: e.profileId, kind, day: dayOf(e), ref: e.ref?.slice(0, 120) ?? null }];
    });
    if (values.length) await tx.insert(activities).values(values).onConflictDoNothing();
  });
}
