import { MAX_TRAILS, cleanTrail, importedTrail, parseRepo, type ImportInput, type Trail } from "@sdp/study";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { GithubError, loadToken, repoInfo, syncTrail } from "@/lib/github";
import { loadCenter, saveCenter } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AT_ONCE = 10;

/**
 * Projetos que você já tinha, sem IA: { items: [{ repo?, title?, why?, skills?, units?, importance? }] }.
 * Com repo, lê nome, descrição, linguagens e issues do GitHub (sem token só repositório público)
 * e deixa a análise automática da IA desligada. Sem repo, o projeto é só à mão.
 * Volta os que entraram e, por item, o erro dos que não deram certo.
 */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const items: ImportInput[] = (Array.isArray(b?.items) ? b.items : []).slice(0, MAX_AT_ONCE).map(input);
  if (!items.length) return NextResponse.json({ error: "Nada para importar." }, { status: 400 });

  const p = s.profile;
  const before = await loadCenter(db, p);
  const room = MAX_TRAILS - before.trails.length;
  if (room <= 0) return NextResponse.json({ error: `Máximo de ${MAX_TRAILS} trilhas.` }, { status: 400 });

  const token = await loadToken(db, s.user.id);
  const known = new Set(before.trails.map((t) => t.github?.repo.toLowerCase()).filter(Boolean));
  const added: Trail[] = [];
  const errors: { item: number; error: string }[] = [];
  const base = Date.now();

  for (const [i, it] of items.entries()) {
    if (added.length >= room) {
      errors.push({ item: i, error: `Passou do máximo de ${MAX_TRAILS} trilhas.` });
      continue;
    }
    const id = `t${(base + i).toString(36)}`;
    try {
      if (it.repo === undefined) {
        const t = cleanTrail(importedTrail(it), id);
        if (!t) throw new Error("Dê um nome ao projeto.");
        added.push(t);
        continue;
      }
      const repo = parseRepo(it.repo);
      if (!repo) throw new Error("Link inválido. Use dono/repo ou o link do GitHub.");
      if (known.has(repo.toLowerCase())) throw new Error(`${repo} já está nas suas trilhas.`);
      const info = await repoInfo(token, repo);
      const t = cleanTrail(importedTrail(it, info), id)!;
      // primeira leitura: marca o ponto de partida e traz as issues como passos
      const r = await syncTrail(token, t, t.github!);
      known.add(repo.toLowerCase());
      added.push(r.trail);
    } catch (e) {
      errors.push({ item: i, error: e instanceof GithubError || e instanceof Error ? e.message : String(e) });
    }
  }

  if (added.length) {
    // relê antes de gravar: outra aba pode ter mudado as trilhas enquanto o GitHub respondia
    const fresh = await loadCenter(db, p);
    await saveCenter(db, p.id, { trails: [...fresh.trails, ...added].slice(0, MAX_TRAILS) });
  }
  return NextResponse.json(
    { ok: errors.length === 0, added: added.map((t) => ({ id: t.id, title: t.title, repo: t.github?.repo ?? null })), errors },
    { status: added.length || !errors.length ? 200 : 400 },
  );
}

function input(x: unknown): ImportInput {
  const o = (x ?? {}) as Record<string, unknown>;
  const list = (v: unknown, max: number, n: number, sep: RegExp) =>
    (Array.isArray(v) ? v : typeof v === "string" ? v.split(sep) : [])
      .map((s) => String(s).trim().slice(0, n))
      .filter(Boolean)
      .slice(0, max);
  const repo = typeof o.repo === "string" && o.repo.trim() ? o.repo.trim() : undefined;
  return {
    ...(repo ? { repo } : {}),
    title: typeof o.title === "string" ? o.title.slice(0, 120) : undefined,
    why: typeof o.why === "string" ? o.why.slice(0, 400) : undefined,
    skills: list(o.skills, 12, 60, /[\n,]/),
    units: list(o.units, 60, 160, /\n/),
    importance: [1, 2, 3].includes(Number(o.importance)) ? Number(o.importance) : 2,
  };
}
