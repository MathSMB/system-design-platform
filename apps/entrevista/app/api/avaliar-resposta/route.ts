import { SENIORITY, createProvider, type AnswerInput, type Seniority } from "@sdp/ai";
import { NextResponse } from "next/server";
import { emitAsUser } from "@sdp/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

const cut = (x: unknown, n: number) => String(x ?? "").slice(0, n);
const list = (x: unknown, max: number, n: number) => (Array.isArray(x) ? x.slice(0, max).map((y) => cut(y, n)) : undefined);

/** Avalia uma resposta de entrevista (transcrita do áudio ou digitada) com o Claude Code da assinatura. */
export async function POST(req: Request) {
  const b = (await req.json()) as Partial<AnswerInput>;
  const answer = cut(b.answer, 8000).trim();
  if (answer.length < 2) return NextResponse.json({ error: "Responda alguma coisa antes de enviar." }, { status: 400 });
  const target: Seniority = SENIORITY.includes(b.target as Seniority) ? (b.target as Seniority) : "pleno";
  try {
    const evaluation = await createProvider().evaluateAnswer({
      stage: cut(b.stage, 200),
      target,
      question: cut(b.question, 2000),
      code: b.code ? cut(b.code, 4000) : undefined,
      expected: list(b.expected, 12, 300),
      avoid: list(b.avoid, 8, 400),
      job: b.job ? cut(b.job, 1500) : undefined,
      interviewer: b.interviewer ? cut(b.interviewer, 120) : undefined,
      history: Array.isArray(b.history)
        ? b.history.slice(-10).map((h) => ({ who: h?.who === "candidato" ? ("candidato" as const) : ("entrevistador" as const), text: cut(h?.text, 3000) }))
        : undefined,
      allowFollowUp: !!b.allowFollowUp,
      reference: b.reference ? cut(b.reference, 3000) : undefined,
      answer,
      spoken: !!b.spoken,
    });
    // conta para a meta do dia (o app Hábito lê este evento)
    await emitAsUser("entrevista", { type: "resposta.avaliada", payload: { stage: cut(b.stage, 80), target, score: evaluation.score } });
    return NextResponse.json(evaluation);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
