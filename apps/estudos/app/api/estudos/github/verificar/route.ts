import { dayInBrazil } from "@sdp/habit";
import { cleanGithub, parseRepo, type Trail } from "@sdp/study";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { emitAsUser, getSession } from "@sdp/auth";
import { GithubError, loadToken, syncTrail } from "@/lib/github";
import { loadCenter, saveCenter } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Liga, verifica ou desliga o repositório de uma trilha de projeto.
 * { trailId, repo?, label? } liga (ou troca) e já verifica; { trailId } só verifica;
 * { trailId, unlink: true } desliga (os passos ficam, e voltam a ser marcados à mão).
 */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const p = s.profile;
  const c = await loadCenter(db, p);
  const t = c.trails.find((x) => x.id === b?.trailId);
  if (!t || t.kind !== "projeto") return NextResponse.json({ error: "Trilha de projeto não encontrada." }, { status: 404 });
  const save = async (next: Trail) => {
    // relê antes de gravar: outra aba pode ter mudado outra trilha nesse meio tempo
    const fresh = await loadCenter(db, p);
    await saveCenter(db, p.id, { trails: fresh.trails.map((x) => (x.id === next.id ? next : x)) });
  };

  if (b.unlink === true) {
    const { github: _, ...rest } = t;
    await save({ ...rest, units: t.units.map(({ issue: _i, url: _u, doneAt: _d, ...u }) => u) });
    return NextResponse.json({ ok: true });
  }

  let link = t.github ?? null;
  if (b.repo !== undefined) {
    const repo = parseRepo(b.repo);
    if (!repo) return NextResponse.json({ error: "Repositório inválido. Use dono/repo ou o link do GitHub." }, { status: 400 });
    const label = typeof b.label === "string" ? b.label.trim().slice(0, 50) : "";
    link = repo === link?.repo && label === link.label ? link : cleanGithub({ repo, label, commits: [] });
  }
  if (!link) return NextResponse.json({ error: "Escolha o repositório." }, { status: 400 });

  const token = await loadToken(db, s.user.id);
  if (!token) return NextResponse.json({ error: "Cole o token do GitHub primeiro." }, { status: 400 });
  try {
    const r = await syncTrail(token, t, link);
    await save(r.trail);
    const repo = link.repo;
    for (const [day, n] of Object.entries(r.newCommitDays))
      await emitAsUser("estudos", { type: "projeto.commits", ref: `${t.id}:${day}`, payload: { day, repo, trail: t.title.slice(0, 120), commits: n } });
    for (const u of r.closed) {
      const day = u.doneAt ? dayInBrazil(new Date(u.doneAt)) : dayInBrazil();
      await emitAsUser("estudos", { type: "projeto.passo-concluido", ref: `${t.id}#${u.issue}`, payload: { day, repo, trail: t.title.slice(0, 120), step: u.title, url: u.url ?? null } });
    }
    return NextResponse.json({ ok: true, trail: r.trail, newCommits: r.newCommits, closed: r.closed.length });
  } catch (e) {
    return NextResponse.json({ error: e instanceof GithubError ? e.message : `Não consegui falar com o GitHub: ${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
}
