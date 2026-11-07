import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { dayInBrazil } from "@sdp/habit";
import {
  commitsByDay,
  countsAsWork,
  issuesToUnits,
  mergeCommits,
  mergeDays,
  newlyDone,
  toCommit,
  type ApiCommit,
  type ApiIssue,
  type ApiRepo,
  type GithubLink,
  type Trail,
  type TrailUnit,
} from "@sdp/study";
import { eq } from "drizzle-orm";
import { githubTokens, type Db } from "@sdp/db";

// ---------------------------------------------------------------------------
// Token criptografado (AES-256-GCM). A chave vem de GITHUB_TOKEN_KEY; sem ela,
// é derivada do AUTH_SECRET (ou do segredo de desenvolvimento, só para uso local).
// ---------------------------------------------------------------------------

function key(): Buffer {
  const raw = process.env.GITHUB_TOKEN_KEY || process.env.AUTH_SECRET || "sdp-dev-secret";
  return createHash("sha256").update(`github-token:${raw}`).digest();
}

export function seal(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64url")).join(".");
}

export function unseal(sealed: string): string | null {
  try {
    const [iv, tag, enc] = sealed.split(".").map((p) => Buffer.from(p, "base64url"));
    const d = createDecipheriv("aes-256-gcm", key(), iv!);
    d.setAuthTag(tag!);
    return Buffer.concat([d.update(enc!), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export async function loadToken(db: Db, userId: string): Promise<string | null> {
  const [row] = await db.select().from(githubTokens).where(eq(githubTokens.userId, userId));
  return row ? unseal(row.tokenEnc) : null;
}

// ---------------------------------------------------------------------------
// API do GitHub, só GET
// ---------------------------------------------------------------------------

export class GithubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/**
 * GET na API do GitHub. Sem token (null) usa a API pública: só lê repositório público,
 * com limite de 60 leituras por hora por IP.
 */
export async function gh<T>(token: string | null, path: string): Promise<{ data: T; headers: Headers }> {
  // GITHUB_API_URL só existe para testar com um GitHub falso
  const r = await fetch(`${process.env.GITHUB_API_URL || "https://api.github.com"}${path}`, {
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "system-design-lab-estudos",
    },
    cache: "no-store",
  });
  if (!r.ok) {
    const limited = (r.status === 403 || r.status === 429) && r.headers.get("x-ratelimit-remaining") === "0";
    const msg = limited
      ? token
        ? "O limite de leituras do GitHub acabou por agora. Tente de novo daqui a pouco."
        : "Acabou o limite da API pública do GitHub (60 leituras por hora). Tente mais tarde ou cole um token."
      : r.status === 401
        ? "O GitHub recusou o token (vencido ou apagado). Cole um novo."
        : r.status === 403
          ? "O token não tem acesso a isso. Confira se o repositório está na lista do token, com Contents, Issues e Metadata em leitura."
          : r.status === 404
            ? token
              ? "Repositório não encontrado (ou o token não tem acesso a ele)."
              : "Repositório não encontrado. Se ele for privado, cole um token do GitHub só de leitura."
            : `O GitHub respondeu ${r.status}.`;
    throw new GithubError(msg, r.status);
  }
  return { data: (await r.json()) as T, headers: r.headers };
}

/** Confere o token e devolve o login e a validade (quando o GitHub informa). */
export async function whoAmI(token: string) {
  const { data, headers } = await gh<{ login: string }>(token, "/user");
  return { login: data.login, expiresAt: headers.get("github-authentication-token-expiration") };
}

/** Repositórios que o token enxerga (os escolhidos na criação do token). */
export async function listRepos(token: string) {
  const { data } = await gh<{ full_name: string; private: boolean; pushed_at: string | null; default_branch: string }[]>(token, "/user/repos?per_page=100&sort=pushed");
  return data.map((r) => ({ repo: r.full_name, private: r.private, pushedAt: r.pushed_at, branch: r.default_branch }));
}

async function allIssues(token: string | null, repo: string): Promise<ApiIssue[]> {
  const out: ApiIssue[] = [];
  for (let page = 1; page <= 3; page++) {
    const { data } = await gh<ApiIssue[]>(token, `/repos/${repo}/issues?state=all&per_page=100&sort=created&direction=asc&page=${page}`);
    out.push(...data);
    if (data.length < 100) break;
  }
  return out;
}

export interface SyncResult {
  trail: Trail;
  /** Commits novos (que contam como trabalho) por dia, desde a última verificação. Sem a IA automática, contam direto no Hábito. */
  newCommitDays: Record<string, number>;
  newCommits: number;
  /** Passos que fecharam desde a última verificação. */
  closed: TrailUnit[];
}

/**
 * Lê o que mudou no repositório desde o último commit salvo (API compare) e as issues.
 * Na primeira vez só marca o ponto de partida: o histórico antigo aparece no movimento,
 * mas não vira evento para o Hábito.
 */
export async function syncTrail(token: string | null, t: Trail, link: GithubLink): Promise<SyncResult> {
  const repo = link.repo;
  const branch = link.branch || (await gh<{ default_branch: string }>(token, `/repos/${repo}`)).data.default_branch;
  let fresh: ApiCommit[] = [];
  let recent: ApiCommit[] = [];
  let head: string | null = link.lastSha;

  if (!link.lastSha) {
    recent = (await gh<ApiCommit[]>(token, `/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=15`)).data;
    head = recent[0]?.sha ?? null;
  } else {
    try {
      const { data } = await gh<{ commits: ApiCommit[]; status: string }>(token, `/repos/${repo}/compare/${link.lastSha}...${encodeURIComponent(branch)}`);
      fresh = data.commits; // do mais velho ao mais novo
      if (fresh.length) head = fresh[fresh.length - 1]!.sha;
    } catch (e) {
      // o commit salvo sumiu (force-push ou rebase): busca pela data da última verificação
      if (!(e instanceof GithubError) || e.status !== 404) throw e;
      const since = link.checkedAt ? `&since=${encodeURIComponent(link.checkedAt)}` : "";
      fresh = (await gh<ApiCommit[]>(token, `/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=100${since}`)).data.reverse();
      head = fresh[fresh.length - 1]?.sha ?? (await gh<ApiCommit[]>(token, `/repos/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=1`)).data[0]?.sha ?? null;
    }
    recent = fresh.slice().reverse();
  }

  const work = fresh.filter(countsAsWork).map(toCommit);
  const fromIssues = issuesToUnits(await allIssues(token, repo), t.units, link.label);
  const linkedBefore = t.units.some((u) => u.issue);
  // repositório ainda sem issues: os passos que você cadastrou à mão continuam
  const units = fromIssues.length || linkedBefore ? fromIssues : t.units;
  const closed = linkedBefore ? newlyDone(t.units, units) : [];

  const newCommitDays = commitsByDay(work, (iso) => dayInBrazil(new Date(iso)));
  const github: GithubLink = {
    ...link,
    branch,
    lastSha: head,
    checkedAt: new Date().toISOString(),
    commits: mergeCommits(link.commits, recent.filter(countsAsWork).map(toCommit)),
    // na primeira vez (ou num projeto ligado antes da análise existir) a IA começa daqui
    analyzedSha: link.analyzedSha ?? (link.lastSha || head),
    // com a IA automática, os dias com commit esperam a análise (só os relevantes contam no Hábito);
    // sem ela, a rota conta os dias direto
    pendingDays: link.autoAi ? mergeDays(link.pendingDays, newCommitDays) : link.pendingDays,
  };
  return {
    trail: { ...t, github, units },
    newCommitDays,
    newCommits: work.length,
    closed,
  };
}

/** Lê o repositório e as linguagens, para importar um projeto que você já tinha. */
export async function repoInfo(token: string | null, repo: string) {
  const { data: meta } = await gh<ApiRepo>(token, `/repos/${repo}`);
  const { data: languages } = await gh<Record<string, number>>(token, `/repos/${meta.full_name}/languages`).catch(() => ({ data: {} as Record<string, number> }));
  return { meta, languages };
}
