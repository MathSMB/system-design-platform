import { createProvider } from "@sdp/ai";
import { addDays, dayInBrazil } from "@sdp/habit";
import { HORIZON, cleanScheduleItems, mergeSchedule, pace, replanStart } from "@sdp/study";
import { NextResponse } from "next/server";
import { getDb, studySchedules } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { activeResearch, contextOf, loadCenter, previousOf, saveCenter, scheduleChecks } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 400;

/**
 * Gera ou refaz o cronograma das próximas 2 semanas, em blocos curtos, a partir do seu tempo,
 * das trilhas, da pesquisa da vaga escolhida e das notas das entrevistas. O que já passou não muda.
 * As trilhas dizem o escopo; o ritmo (vezes por semana, tamanho dos blocos) quem decide é o cronograma.
 * Cada versão gerada fica no histórico (study_schedules).
 */
export async function POST() {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const p = s.profile;
  const today = dayInBrazil();
  const c = await loadCenter(db, p);
  if (!c.availability.minutes.some((m) => m > 0)) return NextResponse.json({ error: "Diga quanto tempo você tem em pelo menos um dia da semana." }, { status: 400 });
  const r = await activeResearch(db, p, c);
  const rhythm = pace(c.trails, c.availability, today);
  const checks = await scheduleChecks(db, p.id, addDays(today, -60));
  const from = replanStart(c.schedule, today, checks);
  const until = addDays(from, HORIZON - 1);
  const days = Array.from({ length: HORIZON }, (_, i) => addDays(from, i));
  try {
    const ctx = await contextOf(db, p, c, r.data, checks);
    const draft = await createProvider().planSchedule({ context: ctx, from, until, days, previous: previousOf(c.schedule, today, checks), pace: rhythm });
    const items = cleanScheduleItems(draft.items, { from, until, trails: c.trails, av: c.availability, gen: Date.now().toString(36) });
    if (!items.length) throw new Error("A IA não devolveu itens que caibam no seu tempo. Tente de novo.");
    const merged = mergeSchedule(c.schedule, { createdAt: today, from, until, items, outline: draft.outline, notes: draft.notes, tips: draft.tips });
    // guarda só os últimos 60 dias do que já passou
    const keepFrom = addDays(today, -60);
    const schedule = { ...merged, from: merged.from < keepFrom ? keepFrom : merged.from, items: merged.items.filter((i) => i.day >= keepFrom) };
    await saveCenter(db, p.id, { schedule });
    await db.insert(studySchedules).values({ profileId: p.id, researchId: r.active?.id ?? null, availability: c.availability, schedule, pace: { ...rhythm, tips: draft.tips } });
    return NextResponse.json({ ok: true, schedule });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
