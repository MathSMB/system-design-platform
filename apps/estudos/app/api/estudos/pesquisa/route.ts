import { createProvider } from "@sdp/ai";
import { dayInBrazil } from "@sdp/habit";
import { getStack } from "@sdp/hiring";
import { cleanResearch, roleTechs } from "@sdp/study";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, type Db } from "@sdp/db";
import { studyResearch } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { activeResearch, loadCenter, saveCenter } from "@/lib/study";

export const runtime = "nodejs";

/** Uma pesquisa do histórico, inteira (para ver uma data antiga). */
export async function GET(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Pesquisa inválida." }, { status: 400 });
  const [row] = await db.select().from(studyResearch).where(and(eq(studyResearch.id, id), eq(studyResearch.profileId, s.profile.id)));
  if (!row) return NextResponse.json({ error: "Pesquisa não encontrada." }, { status: 404 });
  return NextResponse.json({ research: row });
}

/**
 * Começa uma pesquisa nova das vagas do cargo, em segundo plano (leva alguns minutos e usa
 * a busca na web do Claude Code). Ela entra no histórico; as antigas continuam lá.
 * A tela acompanha pelo GET /api/estudos.
 */
export async function POST() {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const p = s.profile;
  const c = await loadCenter(db, p);
  const { running } = await activeResearch(db, p, c);
  if (running) return NextResponse.json({ ok: true, status: "running" });
  const [row] = await db.insert(studyResearch).values({ profileId: p.id, role: c.role, level: c.level, roleSpec: c.roleSpec, status: "running" }).returning();
  const hint = (c.roleSpec ? roleTechs(c.roleSpec) : getStack(p.stack)?.techs ?? []).join(", ") || undefined;
  void research(db, row!.id, p.id, c.role, c.level, hint);
  return NextResponse.json({ ok: true, status: "running" });
}

async function research(db: Db, id: string, profileId: string, role: string, level: string, hint?: string) {
  const today = dayInBrazil();
  try {
    const raw = await createProvider().researchRole({ role, level, hint, today });
    const data = cleanResearch(raw, { role, level, today });
    if (!data) throw new Error("A pesquisa voltou sem habilidades. Tente de novo.");
    await db.update(studyResearch).set({ status: "done", data, error: null, researchedAt: today }).where(eq(studyResearch.id, id));
    // a pesquisa nova passa a ser a usada no cronograma (dá para voltar a uma antiga no histórico)
    await saveCenter(db, profileId, { researchId: id });
  } catch (e) {
    // as pesquisas anteriores continuam valendo; esta fica no histórico com o erro
    await db.update(studyResearch).set({ status: "error", error: e instanceof Error ? e.message.slice(0, 500) : String(e) }).where(eq(studyResearch.id, id));
  }
}
