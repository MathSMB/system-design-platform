import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { startAnalysis } from "@/lib/analysis";
import { loadToken } from "@/lib/github";

export const runtime = "nodejs";

/**
 * Pede uma análise agora (botão "Analisar"): lê os commits ainda não analisados ou,
 * se não houver nenhum, refaz a última análise. Roda em segundo plano.
 */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  // sem token, lê pela API pública (repositório público)
  const token = await loadToken(db, s.user.id);
  const started = await startAnalysis(db, s.profile, s.user.id, token, String(b?.trailId ?? ""));
  if (!started) return NextResponse.json({ error: "Nada para analisar agora (ou já tem uma análise rodando). Clique em Verificar depois de novos commits." }, { status: 409 });
  return NextResponse.json({ ok: true, analyzing: true });
}
