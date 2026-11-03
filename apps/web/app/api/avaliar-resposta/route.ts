import { SENIORITY, createProvider, type AnswerInput, type Seniority } from "@sdp/ai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const cut = (x: unknown, n: number) => String(x ?? "").slice(0, n);

/** Avalia uma resposta de entrevista (transcrita do áudio ou digitada) com o Claude Code da assinatura. */
export async function POST(req: Request) {
  const b = (await req.json()) as Partial<AnswerInput>;
  const answer = cut(b.answer, 8000).trim();
  if (answer.split(/\s+/).length < 5) return NextResponse.json({ error: "Responda com pelo menos uma frase antes de avaliar." }, { status: 400 });
  const target: Seniority = SENIORITY.includes(b.target as Seniority) ? (b.target as Seniority) : "pleno";
  try {
    const evaluation = await createProvider().evaluateAnswer({
      stage: cut(b.stage, 200),
      target,
      question: cut(b.question, 2000),
      code: b.code ? cut(b.code, 4000) : undefined,
      expected: Array.isArray(b.expected) ? b.expected.slice(0, 12).map((x) => cut(x, 300)) : undefined,
      reference: b.reference ? cut(b.reference, 3000) : undefined,
      answer,
      spoken: !!b.spoken,
    });
    return NextResponse.json(evaluation);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
