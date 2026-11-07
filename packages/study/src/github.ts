/**
 * Projeto ligado a um repositório do GitHub (só leitura): o que vem da API vira
 * passos da trilha (issues) e movimento (commits). Tudo puro, sem rede, para testar.
 */
import type { TrailUnit } from "./index";

/** O que a trilha guarda do repositório (o token fica em outra tabela, criptografado). */
export interface GithubLink {
  /** "dono/repo". */
  repo: string;
  branch: string;
  /** Último commit já lido; a próxima verificação busca a partir dele. */
  lastSha: string | null;
  /** ISO da última verificação. */
  checkedAt: string | null;
  /** Commits mais recentes (o mais novo primeiro), para mostrar o movimento. */
  commits: GithubCommit[];
  /** Só as issues com este label viram passos (vazio = todas). */
  label: string;
}

export interface GithubCommit {
  sha: string;
  message: string;
  /** ISO da data do commit. */
  date: string;
  author: string;
  url: string;
}

export const MAX_COMMITS = 15;

const str = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : "");

/** Aceita "dono/repo", "https://github.com/dono/repo(.git)" ou "git@github.com:dono/repo.git". */
export function parseRepo(x: unknown): string | null {
  const s = str(x, 300)
    .replace(/^git@github\.com:/i, "")
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  const m = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})$/.exec(s);
  return m ? `${m[1]}/${m[2]}` : null;
}

/** Só aceita token fine-grained: o clássico (ghp_) não tem como ser limitado a leitura por repositório. */
export function checkToken(x: unknown): { token: string } | { error: string } {
  const t = str(x, 400);
  if (!t) return { error: "Cole o token." };
  if (/^(ghp|gho|ghu|ghs)_/.test(t)) return { error: "Esse é um token clássico, que pode escrever no GitHub. Crie um token fine-grained (começa com github_pat_) só com leitura." };
  if (!/^github_pat_[A-Za-z0-9_]{20,}$/.test(t)) return { error: "Token inválido. O token fine-grained começa com github_pat_." };
  return { token: t };
}

/** Os 4 últimos caracteres, para mostrar qual token está salvo. */
export const tokenHint = (t: string) => `…${t.slice(-4)}`;

export function cleanCommit(x: unknown): GithubCommit | null {
  const o = (x ?? {}) as Record<string, unknown>;
  const sha = str(o.sha, 40);
  if (!/^[0-9a-f]{7,40}$/.test(sha)) return null;
  return { sha, message: str(o.message, 200), date: str(o.date, 30), author: str(o.author, 60), url: /^https:\/\/github\.com\//.test(str(o.url, 300)) ? str(o.url, 300) : "" };
}

export function cleanGithub(x: unknown): GithubLink | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const repo = parseRepo(o.repo);
  if (!repo) return null;
  const commits = (Array.isArray(o.commits) ? o.commits : []).map(cleanCommit).filter((c): c is GithubCommit => !!c).slice(0, MAX_COMMITS);
  return {
    repo,
    branch: str(o.branch, 100),
    lastSha: /^[0-9a-f]{40}$/.test(str(o.lastSha, 40)) ? str(o.lastSha, 40) : null,
    checkedAt: str(o.checkedAt, 30) || null,
    commits,
    label: str(o.label, 50),
  };
}

// ---------------------------------------------------------------------------
// Commits
// ---------------------------------------------------------------------------

/** Formato do commit que a API do GitHub devolve (só o que usamos). */
export interface ApiCommit {
  sha: string;
  html_url?: string;
  parents?: unknown[];
  commit?: { message?: string; author?: { name?: string; date?: string } | null; committer?: { date?: string } | null };
  author?: { login?: string; type?: string } | null;
}

/** Merges e commits de robôs (dependabot, renovate…) não contam como trabalho seu. */
export function countsAsWork(c: ApiCommit): boolean {
  if ((c.parents?.length ?? 1) > 1) return false;
  const login = c.author?.login ?? "";
  if (c.author?.type === "Bot" || /\[bot\]$/.test(login)) return false;
  return true;
}

export function toCommit(c: ApiCommit): GithubCommit {
  return {
    sha: c.sha,
    message: (c.commit?.message ?? "").split("\n")[0]!.slice(0, 200),
    date: c.commit?.author?.date ?? c.commit?.committer?.date ?? "",
    author: (c.author?.login ?? c.commit?.author?.name ?? "").slice(0, 60),
    url: c.html_url ?? "",
  };
}

/** Junta os commits novos aos que já estavam, sem repetir, do mais novo ao mais velho. */
export function mergeCommits(old: GithubCommit[], fresh: GithubCommit[]): GithubCommit[] {
  const seen = new Set<string>();
  return [...fresh, ...old]
    .filter((c) => (seen.has(c.sha) ? false : (seen.add(c.sha), true)))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, MAX_COMMITS);
}

/** Quantos commits por dia (no fuso que `dayOf` usa). Cada dia com commit conta no hábito. */
export function commitsByDay(commits: GithubCommit[], dayOf: (iso: string) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const c of commits) if (c.date) out[dayOf(c.date)] = (out[dayOf(c.date)] ?? 0) + 1;
  return out;
}

// ---------------------------------------------------------------------------
// Issues como passos
// ---------------------------------------------------------------------------

/** Formato da issue que a API devolve (só o que usamos). */
export interface ApiIssue {
  number: number;
  title: string;
  state: "open" | "closed" | string;
  state_reason?: string | null;
  html_url?: string;
  closed_at?: string | null;
  pull_request?: unknown;
  labels?: (string | { name?: string })[];
}

/**
 * Issues → passos da trilha: aberta = a fazer, fechada = feito. PRs e issues fechadas como
 * "not planned" ficam de fora. Mantém o id do passo que já existia para a mesma issue
 * (o cronograma aponta para ele). Ordem: pelo número da issue.
 */
export function issuesToUnits(issues: ApiIssue[], old: TrailUnit[], label = ""): TrailUnit[] {
  const want = label.toLowerCase();
  const byIssue = new Map(old.filter((u) => u.issue).map((u) => [u.issue!, u.id]));
  const used = new Set<string>(byIssue.values());
  let next = 1;
  const freshId = () => {
    while (used.has(`u${next}`)) next++;
    used.add(`u${next}`);
    return `u${next}`;
  };
  return issues
    .filter((i) => !i.pull_request && Number.isInteger(i.number) && i.number > 0)
    .filter((i) => !(i.state === "closed" && i.state_reason === "not_planned"))
    .filter((i) => !want || (i.labels ?? []).some((l) => (typeof l === "string" ? l : l.name ?? "").toLowerCase() === want))
    .sort((a, b) => a.number - b.number)
    .slice(0, 60)
    .map((i) => ({
      id: byIssue.get(i.number) ?? freshId(),
      title: `#${i.number} ${String(i.title ?? "").trim()}`.slice(0, 160),
      done: i.state === "closed",
      issue: i.number,
      url: /^https:\/\/github\.com\//.test(i.html_url ?? "") ? i.html_url : undefined,
      doneAt: i.state === "closed" && i.closed_at ? i.closed_at : undefined,
    }));
}

/** Passos que estavam abertos e agora fecharam (viram evento para o Hábito). */
export function newlyDone(before: TrailUnit[], after: TrailUnit[]): TrailUnit[] {
  const was = new Map(before.filter((u) => u.issue).map((u) => [u.issue!, u.done]));
  return after.filter((u) => u.done && u.issue && was.get(u.issue) === false);
}
