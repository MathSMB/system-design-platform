import { EMPTY, addDays, cleanHistory, computeHabit, dayInBrazil, planOf, type DayCounts } from "@sdp/habit";
import { cleanSchedule, scheduleDone } from "@sdp/study";
import { trackTitle, type Level } from "@sdp/hiring";
import { and, count, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { activities, checkins, studyCenters } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { syncActivities } from "@/lib/sync";

const FIELD = { answer: "answers", stage: "stages", process: "processes", design: "designs" } as const;

/** A placa-mãe do perfil ativo: peças, desgaste, ofensiva, failovers e o último ano. */
export async function GET() {
  const db = getDb();
  let s;
  try {
    // primeiro traz o que aconteceu nos outros apps
    await syncActivities();
    s = await getSession();
  } catch (e) {
    console.error("[habito] banco fora do ar:", e);
    return NextResponse.json({ db: false });
  }
  if (!s) return NextResponse.json({ db: true, session: null });
  if (!s.profile) return NextResponse.json({ db: true, session: s, habit: null });
  const p = s.profile;
  const today = dayInBrazil();
  const since = addDays(today, -370);
  const [rows, marks, centers] = await Promise.all([
    db
      .select({ day: activities.day, kind: activities.kind, n: count() })
      .from(activities)
      .where(and(eq(activities.profileId, p.id), gte(activities.day, since)))
      .groupBy(activities.day, activities.kind),
    db
      .select({ day: checkins.day, itemId: checkins.itemId })
      .from(checkins)
      .where(and(eq(checkins.profileId, p.id), gte(checkins.day, since))),
    db.select({ schedule: studyCenters.schedule }).from(studyCenters).where(eq(studyCenters.profileId, p.id)),
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
  const plan = planOf(p.goal, p.plan);
  const history = cleanHistory(p.planHistory);
  const start = p.startDay < since ? since : p.startDay;
  // item "cronograma do dia": cumprido quando todos os blocos do dia na Central de estudos foram feitos
  const scheduleIds = new Set([plan, ...history.map((h) => h.plan)].flatMap((pl) => pl.items.filter((i) => i.kind === "schedule").map((i) => i.id)));
  const schedule = cleanSchedule(centers[0]?.schedule);
  if (scheduleIds.size && schedule)
    for (let d = start; d <= today; d = addDays(d, 1)) if (scheduleDone(schedule, d, checks[d] ?? [])) (checks[d] ??= []).push(...scheduleIds);
  const habit = computeHabit({ start, today, plan, counts, checks, history });
  return NextResponse.json({ db: true, session: s, title: trackTitle(p.stack, p.level as Level), habit });
}
