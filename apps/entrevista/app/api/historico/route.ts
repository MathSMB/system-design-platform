import { desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { interviewRuns } from "@sdp/db";
import { getSession } from "@sdp/auth";

/** Lista o histórico: o da sua conta, ou o feito sem entrar. Sem banco, responde db: false. */
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ db: false, items: [] });
  const session = await getSession();
  const items = await db
    .select({
      id: interviewRuns.id,
      kind: interviewRuns.kind,
      stack: interviewRuns.stack,
      level: interviewRuns.level,
      company: interviewRuns.company,
      title: interviewRuns.title,
      outcome: interviewRuns.outcome,
      levelShown: interviewRuns.levelShown,
      score: interviewRuns.score,
      feedback: interviewRuns.feedback,
      profileId: interviewRuns.profileId,
      createdAt: interviewRuns.createdAt,
    })
    .from(interviewRuns)
    .where(session ? eq(interviewRuns.userId, session.user.id) : isNull(interviewRuns.userId))
    .orderBy(desc(interviewRuns.createdAt))
    .limit(100);
  return NextResponse.json({ db: true, items, profiles: session?.profiles ?? [], signedIn: !!session });
}
