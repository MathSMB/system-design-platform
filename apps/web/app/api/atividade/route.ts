import { NextResponse } from "next/server";
import { logActivity } from "@/lib/session";

/**
 * Marca uma etapa ou um processo seletivo terminado no perfil ativo.
 * Respostas e casos de system design são marcados direto nas rotas de avaliação.
 */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  if (b?.kind !== "stage" && b?.kind !== "process") return NextResponse.json({ error: "kind deve ser stage ou process" }, { status: 400 });
  if (typeof b.ref !== "string" || !b.ref) return NextResponse.json({ error: "Envie ref." }, { status: 400 });
  return NextResponse.json({ counted: await logActivity(b.kind, b.ref) });
}
