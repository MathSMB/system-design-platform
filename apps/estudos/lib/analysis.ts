import "server-only";
import { createProvider } from "@sdp/ai";
import { emit } from "@sdp/events";
import { MAX_ANALYSES, analysisRunning, diffDigest, fromAi, type ApiCommit, type ApiFile, type GithubLink, type Trail } from "@sdp/study";
import type { Db, Profile } from "@sdp/db";
import { GithubError, gh } from "./github";
import { activeResearch, loadCenter, saveCenter } from "./study";

/** Muda só o `github` de uma trilha, relendo a central antes (outra aba pode ter mudado outra trilha). */
async function patchLink(db: Db, p: Profile, trailId: string, change: (g: GithubLink, t: Trail) => GithubLink): Promise<Trail | null> {
  const c = await loadCenter(db, p);
  const t = c.trails.find((x) => x.id === trailId);
  if (!t?.github) return null;
  const next = { ...t, github: change(t.github, t) };
  await saveCenter(db, p.id, { trails: c.trails.map((x) => (x.id === trailId ? next : x)) });
  return next;
}

/** Grava os dias de commit pendentes como `projeto.commits` (contam no Hábito). */
async function countDays(db: Db, who: { userId: string; profileId: string }, t: Trail, days: Record<string, number>) {
  for (const [day, n] of Object.entries(days))
    await emit("estudos", who, { type: "projeto.commits", ref: `${t.id}:${day}`, payload: { day, repo: t.github?.repo ?? null, trail: t.title.slice(0, 120), commits: n } }, db);
}

/**
 * Começa a análise em segundo plano e volta na hora. A tela acompanha pelo GET /api/estudos.
 * Volta false se já tem uma rodando ou se não há o que analisar.
 */
export async function startAnalysis(db: Db, p: Profile, userId: string, token: string, trailId: string): Promise<boolean> {
  const c = await loadCenter(db, p);
  const t = c.trails.find((x) => x.id === trailId);
  const g = t?.github;
  if (!t || !g?.lastSha || analysisRunning(g, new Date())) return false;
  // o intervalo: do último analisado até o último lido; sem nada novo, refaz a última análise
  const fresh = g.analyzedSha !== g.lastSha;
  const from = fresh ? g.analyzedSha : (g.analyses[0]?.fromSha ?? g.commits[g.commits.length - 1]?.sha ?? null);
  if (!from || from === g.lastSha) return false;
  await patchLink(db, p, trailId, (x) => ({ ...x, analysis: { state: "running", startedAt: new Date().toISOString(), error: null } }));
  void run(db, p, userId, token, t, g, from, g.lastSha, !fresh);
  return true;
}

async function run(db: Db, p: Profile, userId: string, token: string, t: Trail, g: GithubLink, from: string, to: string, redo: boolean) {
  const who = { userId, profileId: p.id };
  try {
    let files: ApiFile[] = [];
    let commits: ApiCommit[] = [];
    try {
      const { data } = await gh<{ commits: ApiCommit[]; files?: ApiFile[] }>(token, `/repos/${g.repo}/compare/${from}...${to}`);
      files = data.files ?? [];
      commits = data.commits;
    } catch (e) {
      // o commit base sumiu (force-push): analisa pelas mensagens dos commits recentes
      if (!(e instanceof GithubError) || e.status !== 404) throw e;
    }
    const msgs = commits.length
      ? commits.map((c) => ({ message: (c.commit?.message ?? "").split("\n")[0]!.slice(0, 200), date: c.commit?.author?.date ?? "" }))
      : g.commits.map((c) => ({ message: c.message, date: c.date }));
    const c = await loadCenter(db, p);
    const research = (await activeResearch(db, p, c)).data;
    const skillNames = research?.skills.map((s) => s.name) ?? [];
    const issues = t.units.filter((u) => u.issue).map((u) => ({ number: u.issue!, title: u.title.replace(/^#\d+\s*/, ""), done: u.done }));
    const raw = await createProvider().analyzeProject({
      project: t.title,
      goal: t.why,
      role: c.role,
      skillNames,
      commits: msgs,
      issues,
      diff: diffDigest(files).text,
    });
    const a = fromAi(raw, { at: new Date().toISOString(), fromSha: from, toSha: to, commits: msgs.length, openIssues: issues.filter((i) => !i.done).map((i) => i.number), skillNames });
    if (!a) throw new Error("A IA voltou sem resumo. Tente de novo.");
    let pending: Record<string, number> = {};
    const saved = await patchLink(db, p, t.id, (x) => {
      pending = x.pendingDays;
      return {
        ...x,
        analyzedSha: to,
        // os dias que chegaram durante a análise ficam para a próxima
        pendingDays: {},
        analysis: { state: "idle", startedAt: x.analysis.startedAt, error: null },
        analyses: [a, ...(redo ? x.analyses.slice(1) : x.analyses)].slice(0, MAX_ANALYSES),
      };
    });
    if (saved && a.relevant) await countDays(db, who, saved, pending);
    await emit("estudos", who, { type: "projeto.analisado", ref: `${t.id}:${to}`, payload: { repo: g.repo, trail: t.title.slice(0, 120), relevant: a.relevant, summary: a.summary.slice(0, 300), skills: a.skills } }, db);
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 300) : String(e);
    // se a IA falhou, o dia não se perde: os commits pendentes contam assim mesmo
    let pending: Record<string, number> = {};
    const saved = await patchLink(db, p, t.id, (x) => {
      pending = x.pendingDays;
      return { ...x, pendingDays: {}, analysis: { state: "error", startedAt: x.analysis.startedAt, error: msg } };
    });
    if (saved) await countDays(db, who, saved, pending);
  }
}
