import { addDays, dayInBrazil } from "@sdp/habit";
import { trackTitle, type Level } from "@sdp/hiring";
import { cleanRoleSpec, cleanTrail, gaps, needsReplan, pace, projectToTrail, readiness, roleName, skillLevels, MAX_TRAILS, MAX_UNITS, cleanAvailability, type RoleResearch } from "@sdp/study";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, studyResearch, studySchedules } from "@sdp/db";
import { emitAsUser, getSession } from "@sdp/auth";
import { activeResearch, loadCenter, practiced, saveCenter, scheduleChecks } from "@/lib/study";

/** A Central de estudos do perfil ativo: vaga, pesquisa, trilhas, cronograma e o quanto você está pronto. */
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ db: false });
  const s = await getSession();
  if (!s) return NextResponse.json({ db: true, session: null });
  if (!s.profile) return NextResponse.json({ db: true, session: s, center: null });
  const p = s.profile;
  const today = dayInBrazil();
  const c = await loadCenter(db, p);
  const r = await activeResearch(db, p, c);
  const checks = await scheduleChecks(db, p.id, addDays(today, -60));
  const data: RoleResearch | null = r.data;
  const skills = data?.skills ?? [];
  const versions = await db
    .select({ id: studySchedules.id, createdAt: studySchedules.createdAt, researchId: studySchedules.researchId, schedule: studySchedules.schedule })
    .from(studySchedules)
    .where(eq(studySchedules.profileId, p.id))
    .orderBy(desc(studySchedules.createdAt))
    .limit(8);
  const levels = skillLevels(skills, c.skillStatus, practiced(c, checks));
  return NextResponse.json({
    db: true,
    session: s,
    title: trackTitle(p.stack, p.level as Level),
    today,
    center: c,
    research: r.running || r.active || r.lastError ? { status: r.running ? "running" : data ? "done" : "error", error: r.lastError, startedAt: (r.running ?? r.active)?.startedAt ?? null, data, id: r.active?.id ?? null } : null,
    history: r.rows.map((h) => ({
      id: h.id,
      role: h.role,
      level: h.level,
      status: h.status,
      error: h.error,
      startedAt: h.startedAt,
      researchedAt: h.researchedAt,
      postings: (h.data as RoleResearch | null)?.postingsAnalyzed ?? 0,
      skills: (h.data as RoleResearch | null)?.skills.length ?? 0,
    })),
    pace: pace(c.trails, c.availability, today),
    versions: versions.map((v) => ({ id: v.id, createdAt: v.createdAt, researchId: v.researchId, notes: (v.schedule as { notes?: string })?.notes ?? "", items: ((v.schedule as { items?: unknown[] })?.items ?? []).length })),
    levels,
    readiness: data ? readiness(skills, levels) : null,
    gaps: gaps(skills, levels),
    checks,
    needsReplan: needsReplan(c.schedule, today),
  });
}

/** Muda uma parte da central: { op: "role" | "research-use" | "availability" | "skill" | "trail-add" | "trail-update" | "trail-remove" | "unit" | "unit-add" | "unit-remove" | "project-choose", ... }. */
export async function PATCH(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const p = s.profile;
  const b = await req.json().catch(() => ({}));
  const c = await loadCenter(db, p);
  const bad = (error: string) => NextResponse.json({ error }, { status: 400 });

  switch (b?.op) {
    case "role": {
      // do montador (spec) ou escrito à mão (role)
      if (b.spec !== undefined) {
        const spec = cleanRoleSpec(b.spec);
        if (!spec) return bad("Complete todos os passos do cargo.");
        await saveCenter(db, p.id, { roleSpec: spec, targetRole: roleName(spec) });
        break;
      }
      const role = typeof b.role === "string" ? b.role.trim().slice(0, 100) : "";
      await saveCenter(db, p.id, { targetRole: role || null, roleSpec: null });
      break;
    }
    case "research-use": {
      const id = typeof b.id === "string" ? b.id : "";
      const [row] = /^[0-9a-f-]{36}$/.test(id) ? await db.select({ status: studyResearch.status }).from(studyResearch).where(and(eq(studyResearch.id, id), eq(studyResearch.profileId, p.id))) : [];
      if (row?.status !== "done") return bad("Essa pesquisa não terminou.");
      await saveCenter(db, p.id, { researchId: id });
      break;
    }
    case "availability":
      await saveCenter(db, p.id, { availability: cleanAvailability(b.availability) });
      break;
    case "skill": {
      const name = typeof b.name === "string" ? b.name.slice(0, 60) : "";
      if (!name) return bad("Habilidade inválida.");
      const next = { ...c.skillStatus };
      if (b.level === 0 || b.level === 1 || b.level === 2) next[name] = b.level;
      else delete next[name];
      await saveCenter(db, p.id, { skillStatus: next });
      break;
    }
    case "trail-add": {
      if (c.trails.length >= MAX_TRAILS) return bad(`Máximo de ${MAX_TRAILS} trilhas.`);
      const t = cleanTrail(b.trail, `t${Date.now().toString(36)}`);
      if (!t) return bad("A trilha precisa de um nome.");
      await saveCenter(db, p.id, { trails: [...c.trails, t] });
      return NextResponse.json({ ok: true, trail: t });
    }
    case "trail-update": {
      const old = c.trails.find((t) => t.id === b?.trail?.id);
      // o repositório ligado só muda pela rota do GitHub
      const t = old && cleanTrail({ ...b.trail, kind: old.kind, github: old.github }, old.id);
      if (!t) return bad("Trilha não encontrada.");
      await saveCenter(db, p.id, { trails: c.trails.map((x) => (x.id === t.id ? t : x)) });
      break;
    }
    case "trail-remove":
      await saveCenter(db, p.id, { trails: c.trails.filter((t) => t.id !== b.id) });
      break;
    case "unit": {
      const t = c.trails.find((x) => x.id === b.trailId);
      const u = t?.units.find((x) => x.id === b.unitId);
      if (!t || !u) return bad("Passo não encontrado.");
      if (u.issue) return bad("Esse passo vem de uma issue do GitHub: feche a issue lá e clique em Verificar.");
      const done = b.done === true;
      const trails = c.trails.map((x) => (x.id !== t.id ? x : { ...x, units: x.units.map((y) => (y.id === u.id ? { ...y, done } : y)) }));
      await saveCenter(db, p.id, { trails });
      if (done && t.kind === "projeto")
        await emitAsUser("estudos", { type: "projeto.passo-concluido", ref: `${t.id}:${u.id}`, payload: { day: dayInBrazil(), trail: t.title.slice(0, 120), step: u.title } });
      break;
    }
    case "unit-add": {
      const t = c.trails.find((x) => x.id === b.trailId);
      const title = typeof b.title === "string" ? b.title.trim().slice(0, 160) : "";
      if (!t) return bad("Trilha não encontrada.");
      if (!title) return bad("Escreva o passo.");
      if (t.units.length >= MAX_UNITS) return bad(`Máximo de ${MAX_UNITS} passos.`);
      let n = t.units.length + 1;
      while (t.units.some((u) => u.id === `u${n}`)) n++;
      const trails = c.trails.map((x) => (x.id !== t.id ? x : { ...x, units: [...x.units, { id: `u${n}`, title, done: false }] }));
      await saveCenter(db, p.id, { trails });
      break;
    }
    case "unit-remove": {
      const t = c.trails.find((x) => x.id === b.trailId);
      const u = t?.units.find((x) => x.id === b.unitId);
      if (!t || !u) return bad("Passo não encontrado.");
      if (u.issue) return bad("Esse passo vem de uma issue do GitHub.");
      await saveCenter(db, p.id, { trails: c.trails.map((x) => (x.id !== t.id ? x : { ...x, units: x.units.filter((y) => y.id !== u.id) })) });
      break;
    }
    case "project-choose": {
      const opt = c.projectOptions[Number(b.index)];
      if (!opt) return bad("Projeto não encontrado.");
      if (c.trails.length >= MAX_TRAILS) return bad(`Máximo de ${MAX_TRAILS} trilhas.`);
      await saveCenter(db, p.id, { trails: [...c.trails, projectToTrail(opt, `t${Date.now().toString(36)}`)] });
      break;
    }
    default:
      return bad("Operação desconhecida.");
  }
  return NextResponse.json({ ok: true });
}
