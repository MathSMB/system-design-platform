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
  /** Até onde a IA já analisou; a próxima análise lê de `analyzedSha` até `lastSha`. */
  analyzedSha: string | null;
  /** Commits por dia que esperam a análise para contar no Hábito (só os relevantes contam). */
  pendingDays: Record<string, number>;
  /** Análise em andamento ou que falhou por último. */
  analysis: AnalysisStatus;
  /** Últimas análises da IA, da mais nova para a mais velha. */
  analyses: ProjectAnalysis[];
  /**
   * A IA analisa sozinha os commits novos (no máximo 1 vez por hora). Desligada (padrão nos
   * projetos que você já tinha e importou), os commits contam no Hábito direto e a análise
   * só roda pelo botão "Analisar".
   */
  autoAi: boolean;
}

export interface AnalysisStatus {
  state: "idle" | "running" | "error";
  startedAt: string | null;
  error: string | null;
}

/** O que a IA diz sobre os commits de uma análise. */
export interface ProjectAnalysis {
  /** ISO de quando terminou. */
  at: string;
  /** Intervalo analisado (do commit base, exclusivo, até o último). */
  fromSha: string | null;
  toSha: string;
  commits: number;
  summary: string;
  /** Trabalho de verdade (código, testes) ou só ajuste pequeno (README, formatação). */
  relevant: boolean;
  /** Issues abertas que o código parece já resolver (só aviso: quem fecha é você). */
  readyIssues: number[];
  /** Habilidades praticadas, com os nomes da pesquisa da vaga. */
  skills: string[];
  next: string;
}

export const MAX_ANALYSES = 5;
/** Análise automática no máximo uma vez por hora por projeto (o botão "Analisar" não espera). */
export const AUTO_ANALYSIS_MIN = 60;
/** Uma análise "rodando" há mais que isso morreu (servidor reiniciado, por exemplo). */
export const ANALYSIS_STUCK_MIN = 10;

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
    analyzedSha: /^[0-9a-f]{40}$/.test(str(o.analyzedSha, 40)) ? str(o.analyzedSha, 40) : null,
    pendingDays: cleanDays(o.pendingDays),
    analysis: cleanStatus(o.analysis),
    analyses: (Array.isArray(o.analyses) ? o.analyses : []).map(cleanAnalysis).filter((a): a is ProjectAnalysis => !!a).slice(0, MAX_ANALYSES),
    // projetos ligados antes da chave existir continuam com a análise automática
    autoAi: o.autoAi !== false,
  };
}

function cleanDays(x: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!x || typeof x !== "object") return out;
  for (const [d, n] of Object.entries(x as Record<string, unknown>).slice(0, 60))
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && Number.isInteger(n) && (n as number) > 0) out[d] = Math.min(n as number, 1000);
  return out;
}

function cleanStatus(x: unknown): AnalysisStatus {
  const o = (x ?? {}) as Record<string, unknown>;
  const state = o.state === "running" || o.state === "error" ? o.state : "idle";
  return { state, startedAt: str(o.startedAt, 30) || null, error: state === "error" ? str(o.error, 300) || "A análise falhou." : null };
}

const ints = (x: unknown, max: number) =>
  (Array.isArray(x) ? x : [])
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)
    .filter((n, i, a) => a.indexOf(n) === i)
    .slice(0, max);
const words = (x: unknown, max: number, n: number) =>
  (Array.isArray(x) ? x : [])
    .map((v) => str(v, n))
    .filter(Boolean)
    .filter((v, i, a) => a.findIndex((w) => w.toLowerCase() === v.toLowerCase()) === i)
    .slice(0, max);

/** Limpa uma análise guardada (ou o que a IA devolveu, depois de `fromAi`). */
export function cleanAnalysis(x: unknown): ProjectAnalysis | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const summary = str(o.summary, 800);
  const toSha = str(o.toSha, 40);
  if (!summary || !/^[0-9a-f]{40}$/.test(toSha)) return null;
  return {
    at: str(o.at, 30),
    fromSha: /^[0-9a-f]{40}$/.test(str(o.fromSha, 40)) ? str(o.fromSha, 40) : null,
    toSha,
    commits: Math.max(0, Math.min(1000, Math.round(Number(o.commits) || 0))),
    summary,
    relevant: o.relevant !== false,
    readyIssues: ints(o.readyIssues, 10),
    skills: words(o.skills, 12, 60),
    next: str(o.next, 300),
  };
}

/**
 * O que a IA devolveu → análise. Fica só com issues que estão abertas de verdade e,
 * quando há pesquisa da vaga, com os nomes de habilidade da pesquisa (sem inventar nomes).
 */
export function fromAi(
  raw: unknown,
  meta: { at: string; fromSha: string | null; toSha: string; commits: number; openIssues: number[]; skillNames: string[] },
): ProjectAnalysis | null {
  const o = (raw ?? {}) as Record<string, unknown>;
  const open = new Set(meta.openIssues);
  const byName = new Map(meta.skillNames.map((n) => [n.toLowerCase(), n]));
  const skills = words(o.skills, 12, 60)
    .map((s) => (byName.size ? byName.get(s.toLowerCase()) : s))
    .filter((s): s is string => !!s);
  return cleanAnalysis({
    ...meta,
    summary: o.summary,
    relevant: o.relevant,
    readyIssues: ints(o.readyIssues, 10).filter((n) => open.has(n)),
    skills,
    next: o.next,
  });
}

/** Se a análise automática pode rodar agora: tem commit pendente, nada rodando e passou 1 h da última. */
export function canAutoAnalyze(g: GithubLink, now: Date): boolean {
  if (!g.autoAi || !g.lastSha || g.lastSha === g.analyzedSha) return false;
  if (analysisRunning(g, now)) return false;
  const last = Math.max(Date.parse(g.analysis.startedAt ?? "") || 0, Date.parse(g.analyses[0]?.at ?? "") || 0);
  return now.getTime() - last >= AUTO_ANALYSIS_MIN * 60_000;
}

export function analysisRunning(g: GithubLink, now: Date): boolean {
  return g.analysis.state === "running" && now.getTime() - (Date.parse(g.analysis.startedAt ?? "") || 0) < ANALYSIS_STUCK_MIN * 60_000;
}

/** Junta dias de commit (os que ainda esperam a análise com os novos). */
export function mergeDays(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out = { ...a };
  for (const [d, n] of Object.entries(b)) out[d] = (out[d] ?? 0) + n;
  return out;
}

// ---------------------------------------------------------------------------
// Diff para a IA
// ---------------------------------------------------------------------------

/** Arquivo como a API compare devolve (só o que usamos). */
export interface ApiFile {
  filename: string;
  status?: string;
  additions?: number;
  deletions?: number;
  patch?: string;
}

const IGNORED = [
  /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|Cargo\.lock|poetry\.lock|Gemfile\.lock|composer\.lock|go\.sum)$/,
  /(^|\/)(node_modules|dist|build|out|target|\.next|coverage|vendor|__snapshots__)\//,
  /\.(min\.(js|css)|map|snap|png|jpe?g|gif|svg|ico|webp|pdf|zip|jar|woff2?|ttf|lock)$/i,
  /(^|\/)drizzle\/meta\//,
];
const isTest = (f: string) => /(^|\/)(tests?|__tests__|spec)\/|\.(test|spec)\.[a-z]+$|Test\.(java|kt)$|_test\.(go|py)$|(^|\/)test_[^/]+\.py$/i.test(f);
const isCode = (f: string) => /\.(java|kt|scala|go|py|rb|php|cs|ts|tsx|js|jsx|mjs|vue|svelte|rs|swift|c|cc|cpp|h|sql|tf)$/i.test(f);
const isDoc = (f: string) => /\.(md|mdx|txt|rst|adoc)$/i.test(f);
/** 0 = código, 1 = teste, 2 = configuração e o resto, 3 = documentação. */
const rank = (f: string) => (isTest(f) ? 1 : isCode(f) ? 0 : isDoc(f) ? 3 : 2);

/**
 * Monta o texto do diff para a IA dentro de um limite de bytes: primeiro código, depois testes,
 * depois o resto. Lockfiles, builds, imagens e arquivos gerados ficam de fora. O que não cabe
 * aparece só como nome e +/-.
 */
export function diffDigest(files: ApiFile[], maxBytes = 30_000): { text: string; files: number; ignored: number; truncated: boolean } {
  const kept = files.filter((f) => f.filename && !IGNORED.some((r) => r.test(f.filename)));
  const ordered = kept.slice().sort((a, b) => rank(a.filename) - rank(b.filename) || (b.additions ?? 0) + (b.deletions ?? 0) - ((a.additions ?? 0) + (a.deletions ?? 0)));
  const head = (f: ApiFile) => `--- ${f.filename} (${f.status ?? "modified"}, +${f.additions ?? 0} -${f.deletions ?? 0})`;
  const parts: string[] = [];
  const onlyNames: string[] = [];
  let used = 0;
  for (const f of ordered) {
    const block = `${head(f)}\n${f.patch ?? "(sem diff: arquivo binário ou grande demais)"}\n`;
    if (used + block.length <= maxBytes) {
      parts.push(block);
      used += block.length;
    } else onlyNames.push(head(f));
  }
  if (onlyNames.length) parts.push(`Arquivos que não couberam (só nome e linhas):\n${onlyNames.slice(0, 200).join("\n")}`);
  return { text: parts.join("\n"), files: kept.length, ignored: files.length - kept.length, truncated: onlyNames.length > 0 };
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

// ---------------------------------------------------------------------------
// Projeto que você já tinha: importar pelo link, sem IA
// ---------------------------------------------------------------------------

/** O que a API devolve em GET /repos/{dono}/{repo}. */
export interface ApiRepo {
  full_name: string;
  name: string;
  description?: string | null;
  private?: boolean;
  default_branch?: string;
  topics?: string[];
  homepage?: string | null;
}

/** "system-design-platform" → "System design platform". */
export function repoTitle(name: string): string {
  const s = name.replace(/[-_.]+/g, " ").replace(/\s+/g, " ").trim();
  return s ? s[0]!.toUpperCase() + s.slice(1) : name;
}

/** Linguagens do GitHub com nome de habilidade mais conhecido. */
const LANGUAGE_SKILL: Record<string, string> = { Dockerfile: "Docker", HCL: "Terraform", Shell: "Shell script", "Jupyter Notebook": "Python" };

/**
 * Habilidades a partir das linguagens do GitHub (bytes por linguagem) e dos tópicos do
 * repositório: as linguagens com pelo menos 5% do código, da maior para a menor, e depois os tópicos.
 */
export function skillsOf(languages: Record<string, number>, topics: string[] = [], max = 8): string[] {
  const total = Object.values(languages).reduce((a, n) => a + (n > 0 ? n : 0), 0);
  const langs = Object.entries(languages)
    .filter(([, n]) => total > 0 && n / total >= 0.05)
    .sort((a, b) => b[1] - a[1])
    .map(([l]) => l);
  const out: string[] = [];
  for (const s of [...langs.map((l) => LANGUAGE_SKILL[l] ?? l), ...topics.map((t) => t.replace(/-/g, " "))]) {
    const v = s.trim().slice(0, 60);
    if (v && !out.some((o) => o.toLowerCase() === v.toLowerCase())) out.push(v);
  }
  return out.slice(0, max);
}

/** O que a tela manda para importar um projeto (com ou sem link). */
export interface ImportInput {
  repo?: string;
  title?: string;
  why?: string;
  skills?: string[];
  units?: string[];
  importance?: number;
}

/**
 * Monta a trilha de um projeto que você já tinha. O que você digitou vale mais que o que
 * veio do GitHub; com link, a análise automática da IA fica desligada.
 */
export function importedTrail(input: ImportInput, repo?: { meta: ApiRepo; languages: Record<string, number> }): Record<string, unknown> {
  const skills = (input.skills ?? []).map((s) => String(s).trim()).filter(Boolean);
  return {
    kind: "projeto",
    title: input.title?.trim() || (repo ? repoTitle(repo.meta.name) : ""),
    why: input.why?.trim() || repo?.meta.description || "",
    importance: input.importance ?? 2,
    skills: skills.length ? skills : repo ? skillsOf(repo.languages, repo.meta.topics) : [],
    units: input.units ?? [],
    ...(repo ? { github: { repo: repo.meta.full_name, branch: repo.meta.default_branch ?? "", label: "", commits: [], autoAi: false } } : {}),
  };
}
