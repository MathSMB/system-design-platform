import { EMPTY, addDays, cleanHistory, computeHabit, dayInBrazil, planOf, type DayCounts } from "@sdp/habit";
import { trackTitle, type Level } from "@sdp/hiring";
import { and, count, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { activities, checkins } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

const FIELD = { answer: "answers", stage: "stages", process: "processes", design: "designs" } as const;

/** A placa-mãe do perfil ativo: peças, desgaste, ofensiva, failovers e o último ano. */
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ db: false });
  const s = await getSession();
  if (!s) return NextResponse.json({ db: true, session: null });
  if (!s.profile) return NextResponse.json({ db: true, session: s, habit: null });
  const p = s.profile;
  const today = dayInBrazil();
  const since = addDays(today, -370);
  const [rows, marks] = await Promise.all([
    db
      .select({ day: activities.day, kind: activities.kind, n: count() })
      .from(activities)
      .where(and(eq(activities.profileId, p.id), gte(activities.day, since)))
      .groupBy(activities.day, activities.kind),
    db
      .select({ day: checkins.day, itemId: checkins.itemId })
      .from(checkins)
      .where(and(eq(checkins.profileId, p.id), gte(checkins.day, since))),
  ]);
  const counts: Record<string, DayCounts> = {};
  for (const r of rows) {
    const f = FIELD[r.kind as keyof typeof FIELD];
    if (!f) continue;
    counts[r.day] ??= { ...EMPTY };
    counts[r.day]![f] += Number(r.n);
  }
  const checks: Record<string, string[]> = {};
  for (const m of marks) (checks[m.day] ??= []).push(m.itemId);
  const habit = computeHabit({ start: p.startDay < since ? since : p.startDay, today, plan: planOf(p.goal, p.plan), counts, checks, history: cleanHistory(p.planHistory) });
  return NextResponse.json({ db: true, session: s, title: trackTitle(p.stack, p.level as Level), habit });
}
