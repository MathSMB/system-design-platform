import { createProvider } from "@sdp/ai";
import { addDays, dayInBrazil } from "@sdp/habit";
import { cleanProjects, type RoleResearch } from "@sdp/study";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { contextOf, loadCenter, loadResearch, saveCenter, scheduleChecks } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 300;

/** A IA sugere 3 projetos de portfólio a partir da pesquisa da vaga; você escolhe um. */
export async function POST() {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const p = s.profile;
  const c = await loadCenter(db, p);
  const r = await loadResearch(db, c.role, p.level);
  if (r?.status !== "done" && !r?.data) return NextResponse.json({ error: "Faça a pesquisa da vaga primeiro: os projetos saem dela." }, { status: 400 });
  try {
    const ctx = await contextOf(db, p, c, r.data as RoleResearch, await scheduleChecks(db, p.id, addDays(dayInBrazil(), -30)));
    const projects = cleanProjects(await createProvider().proposeProjects(ctx));
    if (!projects.length) throw new Error("A IA não devolveu projetos. Tente de novo.");
    await saveCenter(db, p.id, { projectOptions: projects });
    return NextResponse.json({ projects });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
