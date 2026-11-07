import "server-only";
import { existsSync, statSync } from "node:fs";
import type { ChatMessage, PairSetup } from "@sdp/ai";
import type { Session } from "@sdp/auth";
import { pairChats, pairMessages, studyCenters, type Db, type PairChat, type PairMessage } from "@sdp/db";
import { cleanTrails, kindOf, type Trail } from "@sdp/study";
import { and, asc, desc, eq } from "drizzle-orm";

/** Quantas mensagens vão inteiras para a IA; as mais antigas vão no resumo. */
export const RECENT = 10;
/** Passou disso, a resposta da IA travou (a janela pode tentar de novo). */
export const STUCK_MS = 7 * 60_000;

export const pending = (d: Date | null) => !!d && Date.now() - d.getTime() < STUCK_MS;

/** O que a conversa guarda em `setup` (o resto do PairSetup é montado na hora, dos Estudos). */
export interface StoredSetup {
  goal: string;
  stack: string;
  /** Trilha dos Estudos ligada (opcional). */
  trailId?: string;
  /** Pasta do projeto no computador (opcional). */
  folder?: string;
}

const str = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : "");

export function cleanSetup(x: unknown): StoredSetup {
  const o = (x ?? {}) as Record<string, unknown>;
  const trailId = str(o.trailId, 20);
  const folder = str(o.folder, 400);
  return {
    goal: str(o.goal, 1500),
    stack: str(o.stack, 120),
    ...(/^t[a-z0-9]{1,16}$/.test(trailId) ? { trailId } : {}),
    ...(folder ? { folder } : {}),
  };
}

/** A pasta existe neste computador? (o app roda local, então é o computador dele) */
export function folderExists(p?: string): boolean {
  if (!p) return false;
  try {
    return existsSync(p) && statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export async function ownChat(db: Db, profileId: string, id: unknown): Promise<PairChat | null> {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const [c] = await db.select().from(pairChats).where(and(eq(pairChats.id, id), eq(pairChats.profileId, profileId)));
  return c ?? null;
}

export const chatMessages = (db: Db, chatId: string) => db.select().from(pairMessages).where(eq(pairMessages.chatId, chatId)).orderBy(asc(pairMessages.id));

export async function chatList(db: Db, profileId: string) {
  const rows = await db
    .select({ id: pairChats.id, title: pairChats.title, day: pairChats.day, plan: pairChats.plan, step: pairChats.step, updatedAt: pairChats.updatedAt, pendingSince: pairChats.pendingSince })
    .from(pairChats)
    .where(eq(pairChats.profileId, profileId))
    .orderBy(desc(pairChats.updatedAt))
    .limit(100);
  return rows.map(({ plan, pendingSince, ...r }) => ({ ...r, total: Array.isArray(plan) ? plan.length : 0, pending: pending(pendingSince) }));
}

/** Para a tela: a conversa sem os campos internos. */
export function chatView(c: PairChat) {
  const setup = cleanSetup(c.setup);
  return {
    id: c.id,
    title: c.title,
    day: c.day,
    setup,
    folderOk: folderExists(setup.folder),
    plan: Array.isArray(c.plan) ? (c.plan as string[]) : [],
    step: c.step,
    pending: pending(c.pendingSince),
    updatedAt: c.updatedAt,
  };
}

export const messageView = (m: PairMessage) => ({ id: m.id, role: m.role, text: m.text, createdAt: m.createdAt, ...(m.data as object) });

/** Título curto para a lista: a primeira frase do objetivo. */
export function chatTitle(goal: string): string {
  const first = goal.split(/[\n.!?]/)[0]!.trim() || goal.trim();
  return first.length > 70 ? `${first.slice(0, 67).trimEnd()}…` : first || "Nova conversa";
}

/** As trilhas dos Estudos (para ligar à conversa, se ele quiser). */
export async function studyTrails(db: Db, profileId: string): Promise<{ trails: Trail[]; skills: Record<string, number>; targetRole: string | null }> {
  const [row] = await db.select({ trails: studyCenters.trails, skillStatus: studyCenters.skillStatus, targetRole: studyCenters.targetRole }).from(studyCenters).where(eq(studyCenters.profileId, profileId));
  const skills = row?.skillStatus && typeof row.skillStatus === "object" ? (row.skillStatus as Record<string, number>) : {};
  return { trails: cleanTrails(row?.trails), skills, targetRole: row?.targetRole ?? null };
}

const EXPERIENCE: Record<string, string> = { "0": "ainda sem experiência", "1-2": "1 a 2 anos de experiência", "3-5": "3 a 5 anos de experiência", "6+": "mais de 6 anos de experiência" };

export function trailText(t: Trail): string {
  const k = kindOf(t.kind);
  const lines = [`${k.title}: ${t.title}${t.why ? ` (${t.why})` : ""}`];
  if (t.skills.length) lines.push(`Pratica: ${t.skills.join(", ")}`);
  if (t.units.length) lines.push(`${k.units[0]!.toUpperCase()}${k.units.slice(1)}:\n${t.units.map((u) => `- [${u.done ? "x" : " "}] ${u.title}${u.issue ? ` (issue #${u.issue})` : ""}`).join("\n")}`);
  if (t.github?.commits?.length) lines.push(`Últimos commits:\n${t.github.commits.slice(0, 5).map((c) => `- ${c.message.split("\n")[0]}`).join("\n")}`);
  return lines.join("\n");
}

/**
 * O contexto que vai para a IA: o que ele contou ao abrir a conversa, quem ele é
 * e, se ligou uma trilha, o que está nos Estudos (lido na hora, sem IA).
 */
export async function setupFor(db: Db, s: Session, stored: StoredSetup): Promise<PairSetup> {
  const u = s.user;
  const who = [u.jobTitle, u.experience ? EXPERIENCE[u.experience] : "", s.profile ? `treina para ${s.profile.stack} ${s.profile.level}` : ""].filter(Boolean).join(", ");
  const out: PairSetup = { goal: stored.goal, stack: stored.stack || undefined, os: "Windows", who: who || undefined };
  if (stored.folder && folderExists(stored.folder)) out.folder = stored.folder;
  if (s.profile && stored.trailId) {
    const st = await studyTrails(db, s.profile.id);
    const t = st.trails.find((x) => x.id === stored.trailId);
    if (t) {
      out.trail = trailText(t);
      if (t.github?.repo) out.repo = t.github.repo;
    }
    out.knows = Object.entries(st.skills).filter(([, v]) => v === 2).map(([k]) => k).slice(0, 20);
    out.learning = Object.entries(st.skills).filter(([, v]) => v === 1).map(([k]) => k).slice(0, 20);
  }
  return out;
}

/** O que vai para a IA: o resumo (quando a conversa é longa) e só as mensagens recentes. */
export function aiMessages(summary: string, msgs: PairMessage[]): { summary: string; messages: ChatMessage[] } {
  const recent = msgs.slice(-RECENT);
  return {
    summary: msgs.length > RECENT ? summary : "",
    messages: recent.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: m.text })),
  };
}
