import { dayInBrazil } from "@sdp/habit";
import { canAutoAnalyze, cleanGithub, parseRepo, type Trail } from "@sdp/study";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { emitAsUser, getSession } from "@sdp/auth";
import { countDays, startAnalysis } from "@/lib/analysis";
import { GithubError, loadToken, syncTrail } from "@/lib/github";
import { loadCenter, saveCenter } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Liga, verifica ou desliga o repositório de uma trilha de projeto.
 * { trailId, repo?, label? } liga (ou troca) e já verifica; { trailId } só verifica;
 * { trailId, unlink: true } desliga (os passos ficam, e voltam a ser marcados à mão);
 * { trailId, autoAi } liga ou desliga a análise automática da IA.
 * Sem token salvo, lê pela API pública (só repositório público).
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

  if (typeof b.autoAi === "boolean" && b.repo === undefined) {
    if (!t.github) return NextResponse.json({ error: "Ligue o repositório primeiro." }, { status: 400 });
    // desligando: os dias que esperavam a análise contam agora
    if (!b.autoAi && Object.keys(t.github.pendingDays).length) await countDays(db, { userId: s.user.id, profileId: p.id }, t, t.github.pendingDays);
    await save({ ...t, github: { ...t.github, autoAi: b.autoAi, pendingDays: b.autoAi ? t.github.pendingDays : {} } });
    return NextResponse.json({ ok: true });
  }

  let link = t.github ?? null;
  if (b.repo !== undefined) {
    const repo = parseRepo(b.repo);
    if (!repo) return NextResponse.json({ error: "Repositório inválido. Use dono/repo ou o link do GitHub." }, { status: 400 });
    const label = typeof b.label === "string" ? b.label.trim().slice(0, 50) : "";
    link = repo === link?.repo && label === link.label ? link : cleanGithub({ repo, label, commits: [], autoAi: link?.autoAi ?? true });
  }
  if (!link) return NextResponse.json({ error: "Escolha o repositório." }, { status: 400 });

  const token = await loadToken(db, s.user.id);
  try {
    const r = await syncTrail(token, t, link);
    await save(r.trail);
    const repo = link.repo;
    for (const u of r.closed) {
      const day = u.doneAt ? dayInBrazil(new Date(u.doneAt)) : dayInBrazil();
      await emitAsUser("estudos", { type: "projeto.passo-concluido", ref: `${t.id}#${u.issue}`, payload: { day, repo, trail: t.title.slice(0, 120), step: u.title, url: u.url ?? null } });
    }
    // sem a IA automática, os commits novos contam no Hábito na hora
    if (r.trail.github && !r.trail.github.autoAi) await countDays(db, { userId: s.user.id, profileId: p.id }, r.trail, r.newCommitDays);
    // com ela, a IA analisa em segundo plano (no máximo 1 vez por hora) e só os relevantes contam no Hábito
    const analyzing = r.trail.github && canAutoAnalyze(r.trail.github, new Date()) ? await startAnalysis(db, p, s.user.id, token, t.id) : false;
    return NextResponse.json({ ok: true, newCommits: r.newCommits, closed: r.closed.length, analyzing });
  } catch (e) {
    return NextResponse.json({ error: e instanceof GithubError ? e.message : `Não consegui falar com o GitHub: ${e instanceof Error ? e.message : e}` }, { status: 502 });
  }
}
