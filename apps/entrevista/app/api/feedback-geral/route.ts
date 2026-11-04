import { SENIORITY, createProvider, type SessionInput, type Seniority } from "@sdp/ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const cut = (x: unknown, n: number) => String(x ?? "").slice(0, n);

/** Feedback geral de uma sessão inteira (treino de Java ou processo seletivo), com o Claude Code da assinatura. */
export async function POST(req: Request) {
  const b = (await req.json()) as Partial<SessionInput>;
  const target: Seniority = SENIORITY.includes(b.target as Seniority) ? (b.target as Seniority) : "pleno";
  const stages = (Array.isArray(b.stages) ? b.stages : []).slice(0, 12).map((s) => ({
    stage: cut(s?.stage, 120),
    result: s?.result ? cut(s.result, 200) : undefined,
    items: (Array.isArray(s?.items) ? s.items : []).slice(0, 20).map((it) => ({
      question: cut(it?.question, 600),
      answer: cut(it?.answer, 2000),
      level: cut(it?.level, 30),
      score: Number(it?.score) || 0,
      gaps: (Array.isArray(it?.gaps) ? it.gaps : []).slice(0, 5).map((g) => cut(g, 300)),
    })),
  }));
  if (!stages.some((s) => s.items.length)) return NextResponse.json({ error: "Nenhuma resposta para avaliar." }, { status: 400 });
  try {
    const f = await createProvider().evaluateSession({
      title: cut(b.title, 200),
      target,
      job: b.job ? cut(b.job, 1500) : undefined,
      outcome: b.outcome ? cut(b.outcome, 400) : undefined,
      eliminatedAt: b.eliminatedAt ? cut(b.eliminatedAt, 120) : undefined,
      stages,
    });
    return NextResponse.json(f);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
