"use client";

import type { Trail } from "@sdp/study";
import { ExternalLink, FolderGit2, GitCommitHorizontal, Loader2, RefreshCw, Sparkles, Unlink } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const NEW_TOKEN_URL = "https://github.com/settings/personal-access-tokens/new";
/** Ao abrir a página, verifica sozinho se a última verificação tem mais de 10 minutos. */
const AUTO_MIN = 10;

interface TokenStatus {
  connected: boolean;
  hint?: string;
  login?: string | null;
  expiresAt?: string | null;
}

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }));

/** "há 5 min", "há 3 h", "há 2 dias". */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

/** Ligar uma trilha de projeto ao GitHub, verificar o movimento e desligar. */
export function GithubLink({ t, onChanged }: { t: Trail; onChanged(): Promise<unknown> | void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const auto = useRef(false);
  const g = t.github;

  const verify = async (body: Record<string, unknown> = {}) => {
    setBusy(true);
    setMsg(null);
    const r = await post("/api/estudos/github/verificar", { trailId: t.id, ...body });
    setBusy(false);
    if (!r.ok) return (setMsg(r.body.error ?? "Não deu certo."), false);
    if (body.unlink) setMsg(null);
    else if (r.body.newCommits || r.body.closed)
      setMsg(
        `${r.body.newCommits} commit${r.body.newCommits === 1 ? "" : "s"} novo${r.body.newCommits === 1 ? "" : "s"} · ${r.body.closed} passo${r.body.closed === 1 ? "" : "s"} concluído${r.body.closed === 1 ? "" : "s"}${r.body.analyzing ? " · a IA está analisando" : ""}`,
      );
    else setMsg("Nada novo desde a última verificação.");
    await onChanged();
    return true;
  };

  // enquanto a IA analisa, confere a cada 5 s
  const running = g?.analysis.state === "running" && Date.now() - Date.parse(g.analysis.startedAt ?? "") < 10 * 60000;
  useEffect(() => {
    // a análise terminou: o aviso "a IA está analisando" sai
    if (!running) return void setMsg((m) => (m?.includes("analisando") ? null : m));
    const timer = setInterval(() => onChanged(), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const analyze = async () => {
    setBusy(true);
    setMsg(null);
    const r = await post("/api/estudos/github/analisar", { trailId: t.id });
    setBusy(false);
    if (!r.ok) setMsg(r.body.error ?? "Não deu certo.");
    await onChanged();
  };

  useEffect(() => {
    if (!g || auto.current) return;
    const stale = !g.checkedAt || Date.now() - Date.parse(g.checkedAt) > AUTO_MIN * 60000;
    if (!stale) return;
    auto.current = true;
    verify().then((ok) => ok && setMsg(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g?.checkedAt]);

  if (!g)
    return (
      <div className="flex flex-col gap-2">
        {!open ? (
          <button onClick={() => setOpen(true)} className="btn-ghost flex w-fit items-center gap-1.5 px-3 py-1.5 text-xs">
            <FolderGit2 size={12} /> Ligar ao GitHub
          </button>
        ) : (
          <Connect
            onCancel={() => setOpen(false)}
            onLink={async (repo, label) => {
              if (await verify({ repo, label })) setOpen(false);
            }}
            busy={busy}
          />
        )}
        {msg && <p className="text-[12px] text-down">{msg}</p>}
      </div>
    );

  const issues = t.units.filter((u) => u.issue).length;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href={`https://github.com/${g.repo}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-mono text-[12px] hover:text-accent-2">
          <FolderGit2 size={13} /> {g.repo}
          {g.branch && <span className="text-muted">@{g.branch}</span>}
          <ExternalLink size={11} className="text-muted" />
        </a>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted">{g.checkedAt ? `verificado ${ago(g.checkedAt)}` : "nunca verificado"}</span>
          <button disabled={busy} onClick={() => verify()} className="btn-neon flex items-center gap-1 px-2.5 py-1 text-[11px]">
            {busy ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />} Verificar
          </button>
          <button
            aria-label="Desligar do GitHub"
            title="Desligar do GitHub"
            disabled={busy}
            onClick={() => confirm(`Desligar ${g.repo}? Os passos ficam e voltam a ser marcados à mão.`) && verify({ unlink: true })}
            className="text-muted hover:text-down"
          >
            <Unlink size={13} />
          </button>
        </div>
      </div>
      {msg && <p className="text-[12px] text-muted">{msg}</p>}
      {!issues && (
        <p className="text-[12px] text-muted">
          O repositório ainda não tem issues{g.label ? ` com o label "${g.label}"` : ""}. Crie uma issue para cada passo do projeto: aberta = a fazer, fechada = feito.
        </p>
      )}
      <Analysis t={t} running={running} busy={busy} onAnalyze={analyze} onAutoAi={(on) => verify({ autoAi: on })} />
      {g.commits.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-muted">Movimento recente</span>
          <ul className="flex flex-col gap-0.5">
            {g.commits.slice(0, 5).map((c) => (
              <li key={c.sha} className="flex items-center gap-1.5 text-[12px]">
                <GitCommitHorizontal size={12} className="shrink-0 text-ok" />
                <a href={c.url || undefined} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-accent-2">
                  {c.message || c.sha.slice(0, 7)}
                </a>
                <span className="shrink-0 font-mono text-[10px] text-muted">{ago(c.date)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** O que a IA disse sobre os últimos commits: resumo, habilidades, issues que parecem prontas e próximo passo. */
function Analysis({ t, running, busy, onAnalyze, onAutoAi }: { t: Trail; running: boolean; busy: boolean; onAnalyze(): void; onAutoAi(on: boolean): void }) {
  const g = t.github!;
  const a = g.analyses[0];
  const pending = g.lastSha && g.analyzedSha !== g.lastSha;
  const url = (n: number) => t.units.find((u) => u.issue === n)?.url;
  return (
    <div className="flex flex-col gap-1.5 rounded-md bg-panel-2/60 p-2.5 text-[12px]">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] text-accent-2">
          <Sparkles size={12} /> Análise da IA{a ? ` · ${ago(a.at)}` : ""}
          {a && !a.relevant && <span className="text-muted">· ajuste pequeno{g.autoAi ? ", não conta no Hábito" : ""}</span>}
        </span>
        <span className="flex items-center gap-2">
          <label
            className="flex items-center gap-1 text-[11px] text-muted"
            title="Ligada, a IA lê os commits novos sozinha (no máximo 1 vez por hora) e só os relevantes contam no Hábito. Desligada, não gasta IA: os commits contam direto."
          >
            <input type="checkbox" checked={g.autoAi} disabled={busy} onChange={(e) => onAutoAi(e.target.checked)} /> automática
          </label>
          <button disabled={busy || running} onClick={onAnalyze} className="btn-ghost flex items-center gap-1 px-2 py-0.5 text-[11px]">
            {running ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />} {running ? "Analisando…" : a && !pending ? "Analisar de novo" : "Analisar"}
          </button>
        </span>
      </div>
      {!g.autoAi && !running && !a && <p className="text-muted">A IA só lê o projeto quando você clicar em Analisar. Os commits contam no Hábito direto, sem gastar IA.</p>}
      {running && <p className="text-muted">O Claude Code está lendo os commits novos. Leva de 1 a 2 minutos.</p>}
      {!running && g.analysis.state === "error" && (
        <p className="text-down">A última análise falhou: {g.analysis.error?.replace(/\.?$/, ".")} Os commits que esperavam a análise contaram no Hábito assim mesmo.</p>
      )}
      {g.autoAi && !running && !a && pending && g.analysis.state !== "error" && <p className="text-muted">Há commits ainda não analisados. A análise roda sozinha no máximo 1 vez por hora.</p>}
      {a && (
        <>
          <p>{a.summary}</p>
          {a.skills.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {a.skills.map((s) => (
                <span key={s} className="rounded-full border border-ok/40 px-2 py-0.5 text-[10px] text-ok">
                  {s}
                </span>
              ))}
            </div>
          )}
          {a.readyIssues.length > 0 && (
            <p className="text-muted">
              Parecem prontas (feche no GitHub se estiverem):{" "}
              {a.readyIssues.map((n, i) => (
                <span key={n}>
                  {i > 0 && ", "}
                  <a href={url(n)} target="_blank" rel="noreferrer" className="text-accent-2 underline">
                    #{n}
                  </a>
                </span>
              ))}
            </p>
          )}
          {a.next && (
            <p className="text-muted">
              Próximo passo: <span className="text-text">{a.next}</span>
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Repositório público: liga só com o link. Privado: passo 1 cola o token (uma vez por conta), passo 2 escolhe o repositório. */
function Connect({ onLink, onCancel, busy }: { onLink(repo: string, label: string): Promise<void>; onCancel(): void; busy: boolean }) {
  const [status, setStatus] = useState<TokenStatus | null>(null);
  const [token, setToken] = useState("");
  const [repos, setRepos] = useState<{ repo: string; private: boolean }[] | null>(null);
  const [repo, setRepo] = useState("");
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadRepos = async () => {
    const r = await fetch("/api/estudos/github/repos").then(async (x) => ({ ok: x.ok, body: await x.json().catch(() => ({})) }));
    if (!r.ok) return setErr(r.body.error ?? "Não consegui listar os repositórios.");
    setRepos(r.body.repos);
    if (r.body.repos[0] && !repo) setRepo(r.body.repos[0].repo);
  };
  useEffect(() => {
    fetch("/api/estudos/github")
      .then((r) => r.json())
      .then((s: TokenStatus) => {
        setStatus(s);
        if (s.connected) loadRepos();
      })
      .catch(() => setStatus({ connected: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveToken = async () => {
    setSaving(true);
    setErr(null);
    const r = await post("/api/estudos/github", { token });
    setSaving(false);
    if (!r.ok) return setErr(r.body.error ?? "Token recusado.");
    setToken("");
    setStatus(r.body);
    loadRepos();
  };

  if (!status) return <p className="text-[12px] text-muted">Carregando…</p>;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 p-3 text-[12px]">
      {!status.connected ? (
        <>
          <p className="font-semibold">Repositório público? Cole o link, sem token</p>
          <div className="flex gap-2">
            <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="https://github.com/dono/repositorio" className="min-w-0 flex-1" />
            <button disabled={busy || !repo.trim()} onClick={() => onLink(repo, label)} className="btn-neon flex items-center gap-1 px-3 py-1.5 text-xs">
              {busy && <Loader2 size={12} className="animate-spin" />} Ligar
            </button>
          </div>
          <p className="text-muted">Sem token o app lê pela API pública do GitHub (60 leituras por hora), o bastante para verificar os seus projetos.</p>
          <p className="mt-1 font-semibold">Privado? 1. Crie um token do GitHub só de leitura</p>
          <ol className="ml-4 list-decimal text-muted">
            <li>
              Abra{" "}
              <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer" className="text-accent-2 underline">
                Fine-grained tokens → Generate new token
              </a>
              .
            </li>
            <li>Em Repository access, escolha &quot;Only select repositories&quot; e marque os repositórios dos seus projetos.</li>
            <li>Em Permissions → Repository, deixe Contents e Issues como &quot;Read-only&quot; (Metadata já vem em leitura). Não dê nenhuma permissão de escrita.</li>
            <li>Gere o token e cole aqui. Ele fica criptografado no seu banco e nunca volta para a tela.</li>
          </ol>
          <div className="flex gap-2">
            <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="github_pat_…" className="min-w-0 flex-1 font-mono" />
            <button disabled={saving || !token.trim()} onClick={saveToken} className="btn-neon px-3 py-1.5 text-xs">
              {saving ? <Loader2 size={12} className="animate-spin" /> : "Salvar token"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-muted">
            Token {status.hint} de <span className="text-text">{status.login}</span>
            {status.expiresAt ? ` · vence em ${status.expiresAt.slice(0, 10).split("-").reverse().join("/")}` : ""}.{" "}
            <button
              onClick={async () => {
                await fetch("/api/estudos/github", { method: "DELETE" });
                setStatus({ connected: false });
                setRepos(null);
              }}
              className="underline hover:text-down"
            >
              Trocar token
            </button>
          </p>
          <p className="font-semibold">2. Escolha o repositório do projeto</p>
          {repos === null ? (
            <p className="text-muted">Buscando repositórios…</p>
          ) : repos.length ? (
            <select value={repo} onChange={(e) => setRepo(e.target.value)}>
              {repos.map((r) => (
                <option key={r.repo} value={r.repo}>
                  {r.repo}
                  {r.private ? " (privado)" : ""}
                </option>
              ))}
            </select>
          ) : (
            <input value={repo} onChange={(e) => setRepo(e.target.value)} placeholder="dono/repositorio ou link do GitHub" />
          )}
          <label className="flex items-center gap-2 text-muted">
            Só issues com o label
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="(todas)" className="w-28" />
          </label>
          <p className="text-muted">Cada issue vira um passo (aberta = a fazer, fechada = feito). A barra mostra fechadas ÷ total. Commits e issues fechadas contam no Hábito.</p>
        </>
      )}
      {err && <p className="text-down">{err}</p>}
      <div className="flex gap-2">
        {status.connected && (
          <button disabled={busy || !repo.trim()} onClick={() => onLink(repo, label)} className="btn-neon flex items-center gap-1 px-3 py-1.5 text-xs">
            {busy && <Loader2 size={12} className="animate-spin" />} Ligar repositório
          </button>
        )}
        <button onClick={onCancel} className="btn-ghost px-3 py-1.5 text-xs">
          Cancelar
        </button>
      </div>
    </div>
  );
}
