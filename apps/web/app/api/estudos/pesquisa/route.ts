import { createProvider } from "@sdp/ai";
import { dayInBrazil } from "@sdp/habit";
import { getStack } from "@sdp/hiring";
import { cleanResearch, researchId } from "@sdp/study";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, type Db } from "@/lib/db/client";
import { roleResearch } from "@/lib/db/schema";
import { getSession } from "@/lib/session";
import { loadCenter, loadResearch } from "@/lib/study";

export const runtime = "nodejs";

/** Uma pesquisa "rodando" há mais de 30 min travou (o servidor caiu no meio): pode rodar de novo. */
const STUCK_MS = 30 * 60_000;

/**
 * Começa a pesquisa das vagas do cargo do perfil, em segundo plano (leva alguns minutos e usa
 * a busca na web do Claude Code). A tela acompanha pelo GET /api/estudos.
 */
export async function POST() {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const p = s.profile;
  const c = await loadCenter(db, p);
  const id = researchId(c.role, p.level);
  const old = await loadResearch(db, c.role, p.level);
  if (old?.status === "running" && Date.now() - new Date(old.startedAt).getTime() < STUCK_MS) return NextResponse.json({ ok: true, status: "running" });
  const row = { id, role: c.role, level: p.level, status: "running", error: null, startedAt: new Date() };
  await db.insert(roleResearch).values(row).onConflictDoUpdate({ target: roleResearch.id, set: { status: "running", error: null, startedAt: row.startedAt } });
  void research(db, id, c.role, p.level, getStack(p.stack)?.techs.join(", "));
  return NextResponse.json({ ok: true, status: "running" });
}

async function research(db: Db, id: string, role: string, level: string, hint?: string) {
  const today = dayInBrazil();
  try {
    const raw = await createProvider().researchRole({ role, level, hint, today });
    const data = cleanResearch(raw, { role, level, today });
    if (!data) throw new Error("A pesquisa voltou sem habilidades. Tente de novo.");
    await db.update(roleResearch).set({ status: "done", data, error: null, researchedAt: today }).where(eq(roleResearch.id, id));
  } catch (e) {
    // mantém a pesquisa anterior (se havia) e mostra o erro
    await db.update(roleResearch).set({ status: "error", error: e instanceof Error ? e.message.slice(0, 500) : String(e) }).where(eq(roleResearch.id, id));
  }
}
