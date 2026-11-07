import "server-only";
import type { StudyContext } from "@sdp/ai";
import { addDays, dayInBrazil } from "@sdp/habit";
import { getStack, getTrack, LEVELS, type Level } from "@sdp/hiring";
import {
  cleanRoleSpec,
  cleanAvailability,
  cleanProjects,
  cleanSchedule,
  cleanSkillStatus,
  cleanTrails,
  itemKey,
  researchId,
  skillLevels,
  type RoleResearch,
  type Schedule,
} from "@sdp/study";
import { and, desc, eq, gte, like } from "drizzle-orm";
import type { Db } from "@sdp/db";
import { checkins, interviewRuns, roleResearch, studyCenters, studyResearch, type Profile, type StudyResearchRow } from "@sdp/db";

/** O cargo que o perfil busca: o que você escreveu, ou o nome da vaga da stack. */
export function roleOf(p: Profile, targetRole?: string | null): string {
  if (targetRole) return targetRole;
  const t = getTrack(p.stack, p.level as Level);
  if (t) return t.role;
  return `Dev ${getStack(p.stack)?.title ?? p.stack} ${LEVELS.find((l) => l.id === p.level)?.title ?? p.level}`;
}

/** A central do perfil, já limpa (cria vazia na primeira vez). */
export async function loadCenter(db: Db, p: Profile) {
  let [row] = await db.select().from(studyCenters).where(eq(studyCenters.profileId, p.id));
  if (!row) [row] = await db.insert(studyCenters).values({ profileId: p.id }).onConflictDoNothing().returning();
  if (!row) [row] = await db.select().from(studyCenters).where(eq(studyCenters.profileId, p.id));
  const role = roleOf(p, row!.targetRole);
  const roleSpec = cleanRoleSpec(row!.roleSpec);
  return {
    role,
    customRole: !!row!.targetRole,
    roleSpec,
    /** A senioridade da pesquisa: a do montador de cargo, ou a do perfil. */
    level: roleSpec?.level ?? p.level,
    researchId: row!.researchId ?? null,
    availability: cleanAvailability(row!.availability ?? undefined),
    trails: cleanTrails(row!.trails),
    projectOptions: cleanProjects(row!.projectOptions),
    skillStatus: cleanSkillStatus(row!.skillStatus),
    schedule: cleanSchedule(row!.schedule),
  };
}
export type Center = Awaited<ReturnType<typeof loadCenter>>;

export async function saveCenter(db: Db, profileId: string, patch: Partial<typeof studyCenters.$inferInsert>) {
  await db.update(studyCenters).set({ ...patch, updatedAt: new Date() }).where(eq(studyCenters.profileId, profileId));
}

/** Uma pesquisa "rodando" há mais de 30 min travou (o servidor caiu no meio): pode rodar de novo. */
export const RESEARCH_STUCK_MS = 30 * 60_000;

/** O histórico de pesquisas do perfil, da mais nova para a mais velha. */
export async function researchHistory(db: Db, profileId: string): Promise<StudyResearchRow[]> {
  return db.select().from(studyResearch).where(eq(studyResearch.profileId, profileId)).orderBy(desc(studyResearch.startedAt)).limit(60);
}

/**
 * A pesquisa que vale agora: a escolhida para o cronograma, ou a mais nova que terminou.
 * Na primeira vez, copia para o histórico a pesquisa antiga (de antes do histórico existir).
 */
export async function activeResearch(db: Db, p: Profile, c: Center) {
  let rows = await researchHistory(db, p.id);
  if (!rows.length) {
    const [old] = await db.select().from(roleResearch).where(eq(roleResearch.id, researchId(c.role, c.level)));
    if (old?.status === "done" && old.data) {
      const [row] = await db
        .insert(studyResearch)
        .values({ profileId: p.id, role: old.role, level: old.level, status: "done", data: old.data, startedAt: old.startedAt, researchedAt: old.researchedAt })
        .returning();
      await saveCenter(db, p.id, { researchId: row!.id });
      c.researchId = row!.id;
      rows = [row!];
    }
  }
  const done = rows.filter((r) => r.status === "done" && r.data);
  const active = done.find((r) => r.id === c.researchId) ?? done[0] ?? null;
  const running = rows.find((r) => r.status === "running" && Date.now() - new Date(r.startedAt).getTime() < RESEARCH_STUCK_MS) ?? null;
  const last = rows[0] ?? null;
  return { rows, active, running, lastError: last?.status === "error" ? last.error : null, data: (active?.data as RoleResearch | undefined) ?? null };
}

/** Marcas do cronograma por dia (itens "c:<id>"), desde um dia. */
export async function scheduleChecks(db: Db, profileId: string, since: string): Promise<Record<string, string[]>> {
  const rows = await db
    .select({ day: checkins.day, itemId: checkins.itemId })
    .from(checkins)
    .where(and(eq(checkins.profileId, profileId), gte(checkins.day, since), like(checkins.itemId, "c:%")));
  const out: Record<string, string[]> = {};
  for (const r of rows) (out[r.day] ??= []).push(r.itemId);
  return out;
}

/** Habilidades que você já praticou: itens feitos do cronograma e trilhas com unidade concluída. */
export function practiced(c: Center, checks: Record<string, string[]>): string[] {
  const out: string[] = [];
  for (const i of c.schedule?.items ?? []) if (i.skill && (checks[i.day] ?? []).includes(itemKey(i.id))) out.push(i.skill);
  for (const t of c.trails) if (t.units.some((u) => u.done)) out.push(...t.skills);
  return out;
}

/** Tudo o que a IA precisa saber para conversar, sugerir projetos e montar o cronograma. */
export async function contextOf(db: Db, p: Profile, c: Center, research: RoleResearch | null, checks: Record<string, string[]>): Promise<StudyContext> {
  const runs = await db
    .select({ title: interviewRuns.title, score: interviewRuns.score, feedback: interviewRuns.feedback })
    .from(interviewRuns)
    .where(eq(interviewRuns.profileId, p.id))
    .orderBy(desc(interviewRuns.createdAt))
    .limit(8);
  const skills = research?.skills ?? [];
  const lv = skillLevels(skills, c.skillStatus, practiced(c, checks));
  return {
    role: c.role,
    level: c.level,
    today: dayInBrazil(),
    skills: skills.map((s) => ({ ...s, level: lv[s.name] ?? 0 })),
    trails: c.trails,
    availability: c.availability,
    interviews: runs.map((r) => ({
      title: r.title,
      score: r.score,
      gaps: Array.isArray((r.feedback as { gaps?: unknown })?.gaps) ? ((r.feedback as { gaps: unknown[] }).gaps.map(String) as string[]) : [],
    })),
  };
}

/** Como foi o cronograma até agora (para o replanejamento). */
export function previousOf(s: Schedule | null, today: string, checks: Record<string, string[]>) {
  if (!s) return undefined;
  const past = s.items.filter((i) => i.day < today);
  const done = past.filter((i) => (checks[i.day] ?? []).includes(itemKey(i.id)));
  const missed = past.filter((i) => !done.includes(i) && i.day >= addDays(today, -14)).map((i) => i.title);
  const recent = done.filter((i) => i.day >= addDays(today, -10)).map((i) => `${i.day}: ${i.title}`);
  return { done: done.length, total: past.length, missed, recent };
}
