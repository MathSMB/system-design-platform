import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { interviewRuns } from "@/lib/db/schema";

/** Lista o histórico de entrevistas. Sem banco, responde db: false. */
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ db: false, items: [] });
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
      createdAt: interviewRuns.createdAt,
    })
    .from(interviewRuns)
    .orderBy(desc(interviewRuns.createdAt))
    .limit(100);
  return NextResponse.json({ db: true, items });
}
