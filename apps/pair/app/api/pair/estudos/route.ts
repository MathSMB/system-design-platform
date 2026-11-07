import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { kindOf, trailProgress } from "@sdp/study";
import { studyTrails } from "@/lib/pair";

export const runtime = "nodejs";

/** As trilhas dos Estudos, para ligar a uma conversa (opcional). Projetos primeiro. */
export async function GET() {
  const s = await getSession().catch(() => null);
  if (!s?.profile) return NextResponse.json({ db: true, trails: [] });
  try {
    const { trails } = await studyTrails(getDb(), s.profile.id);
    const list = trails
      .map((t) => ({ id: t.id, title: t.title, kind: kindOf(t.kind).title, project: t.kind === "projeto", repo: t.github?.repo ?? null, pct: trailProgress(t).pct, skills: t.skills }))
      .sort((a, b) => Number(b.project) - Number(a.project));
    return NextResponse.json({ db: true, trails: list });
  } catch {
    return NextResponse.json({ db: false, trails: [] });
  }
}
