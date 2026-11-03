import { createProvider, type EvaluationInput } from "@sdp/ai";
import { validateGraph } from "@sdp/sim-engine";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/session";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json()) as EvaluationInput;
  if (!body?.graph?.nodes?.length) return NextResponse.json({ error: "Desenhe algo antes de avaliar." }, { status: 400 });
  const problems = validateGraph(body.graph);
  if (problems.length) return NextResponse.json({ error: problems.join(" ") }, { status: 400 });

  try {
    const provider = createProvider();
    const evaluation = await provider.evaluate({
      problem: String(body.problem ?? "").slice(0, 2000),
      notes: body.notes ? String(body.notes).slice(0, 8000) : undefined,
      requirements: body.requirements,
      graph: body.graph,
      simulation: body.simulation,
    });
    await logActivity("design");
    return NextResponse.json(evaluation);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
