import { EMPTY, addDays, computeHabit, dayInBrazil, isGoal, type DayCounts } from "@sdp/habit";
import { trackTitle, type Level } from "@sdp/hiring";
import { and, count, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { activities } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

const FIELD = { answer: "answers", stage: "stages", process: "processes", design: "designs" } as const;

/** O rack do perfil ativo: ofensiva, failovers, marcos e as contagens do último ano. */
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ db: false });
  const s = await getSession();
  if (!s) return NextResponse.json({ db: true, session: null });
  if (!s.profile) return NextResponse.json({ db: true, session: s, habit: null });
  const p = s.profile;
  const today = dayInBrazil();
  const since = addDays(today, -370);
  const rows = await db
    .select({ day: activities.day, kind: activities.kind, n: count() })
    .from(activities)
    .where(and(eq(activities.profileId, p.id), gte(activities.day, since)))
    .groupBy(activities.day, activities.kind);
  const counts: Record<string, DayCounts> = {};
  for (const r of rows) {
    const f = FIELD[r.kind as keyof typeof FIELD];
    if (!f) continue;
    counts[r.day] ??= { ...EMPTY };
    counts[r.day]![f] += Number(r.n);
  }
  const habit = computeHabit({ start: p.startDay < since ? since : p.startDay, today, goal: isGoal(p.goal) ? p.goal : "leve", counts });
  return NextResponse.json({ db: true, session: s, title: trackTitle(p.stack, p.level as Level), habit, counts });
}
