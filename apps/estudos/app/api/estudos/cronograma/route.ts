import { createProvider } from "@sdp/ai";
import { addDays, dayInBrazil } from "@sdp/habit";
import { HORIZON, cleanScheduleItems, mergeSchedule, replanStart, type RoleResearch } from "@sdp/study";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { contextOf, loadCenter, loadResearch, previousOf, saveCenter, scheduleChecks } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 400;

/**
 * Gera ou refaz o cronograma das próximas 2 semanas, em blocos curtos, a partir do seu tempo,
 * das trilhas, da pesquisa da vaga e das notas das entrevistas. O que já passou não muda.
 */
export async function POST() {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const p = s.profile;
  const today = dayInBrazil();
  const c = await loadCenter(db, p);
  if (!c.availability.minutes.some((m) => m > 0)) return NextResponse.json({ error: "Diga quanto tempo você tem em pelo menos um dia da semana." }, { status: 400 });
  const r = await loadResearch(db, c.role, p.level);
  const checks = await scheduleChecks(db, p.id, addDays(today, -60));
  const from = replanStart(c.schedule, today, checks);
  const until = addDays(from, HORIZON - 1);
  const days = Array.from({ length: HORIZON }, (_, i) => addDays(from, i));
  try {
    const ctx = await contextOf(db, p, c, r?.data ? (r.data as RoleResearch) : null, checks);
    const draft = await createProvider().planSchedule({ context: ctx, from, until, days, previous: previousOf(c.schedule, today, checks) });
    const items = cleanScheduleItems(draft.items, { from, until, trails: c.trails, av: c.availability, gen: Date.now().toString(36) });
    if (!items.length) throw new Error("A IA não devolveu itens que caibam no seu tempo. Tente de novo.");
    const merged = mergeSchedule(c.schedule, { createdAt: today, from, until, items, outline: draft.outline, notes: draft.notes });
    // guarda só os últimos 60 dias do que já passou
    const keepFrom = addDays(today, -60);
    const schedule = { ...merged, from: merged.from < keepFrom ? keepFrom : merged.from, items: merged.items.filter((i) => i.day >= keepFrom) };
    await saveCenter(db, p.id, { schedule });
    return NextResponse.json({ ok: true, schedule });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
