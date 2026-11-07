"use client";

import { Check, FolderGit2, Loader2, Plus } from "lucide-react";
import { useState } from "react";

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ ok: r.ok, body: await r.json().catch(() => ({})) }));

interface Result {
  added: { title: string; repo: string | null }[];
  errors: { item: number; error: string }[];
  error?: string;
}

/**
 * "Já tenho um projeto": cadastra no portfólio um projeto que já existe, sem IA.
 * Pelo link do GitHub (nome, descrição, linguagens e issues vêm de lá), à mão,
 * ou vários de uma vez pela lista do token.
 */
export function ImportProjects({ known, onDone, onClose }: { known: string[]; onDone(): Promise<unknown> | void; onClose(): void }) {
  const [f, setF] = useState({ repo: "", title: "", skills: "", units: "", importance: 2 });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [repos, setRepos] = useState<{ repo: string; private: boolean }[] | null>(null);
  const [listErr, setListErr] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const taken = new Set(known.map((r) => r.toLowerCase()));

  const send = async (items: unknown[]) => {
    setBusy(true);
    setMsg(null);
    const r = await post("/api/estudos/projetos/importar", { items });
    setBusy(false);
    const b = r.body as Result;
    const ok = b.added?.length ? `${b.added.length === 1 ? `"${b.added[0]!.title}" entrou` : `${b.added.length} projetos entraram`} nas suas trilhas.` : "";
    const bad = (b.errors ?? []).map((e) => e.error).join(" ");
    setMsg({ ok: !!b.added?.length && !bad, text: [ok, bad || (!r.ok ? (b.error ?? "Não deu certo.") : "")].filter(Boolean).join(" ") });
    if (b.added?.length) {
      await onDone();
      return true;
    }
    return false;
  };

  const addOne = async () => {
    const done = await send([{ repo: f.repo.trim() || undefined, title: f.title, skills: f.skills, units: f.units, importance: f.importance }]);
    if (done) setF({ repo: "", title: "", skills: "", units: "", importance: 2 });
  };

  const loadRepos = async () => {
    setListErr(null);
    const r = await fetch("/api/estudos/github/repos").then(async (x) => ({ ok: x.ok, status: x.status, body: await x.json().catch(() => ({})) }));
    // 400 = sem token salvo
    if (!r.ok) return setListErr(r.status === 400 ? "" : (r.body.error ?? "Não consegui listar os repositórios."));
    setRepos(r.body.repos);
  };

  const toggle = (repo: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(repo)) n.delete(repo);
      else n.add(repo);
      return n;
    });

  return (
    <div className="panel mb-3 flex flex-col gap-3 p-4 text-sm">
      <div>
        <p className="font-semibold">Já tenho um projeto</p>
        <p className="text-[12px] text-muted">
          Cole o link do repositório e o app traz o nome, a descrição, as linguagens (viram habilidades) e as issues (viram os passos). Repositório público não precisa de token. Sem link, cadastre à
          mão. Nenhum dos dois usa IA: os commits contam no Hábito direto.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-[12px] text-muted">Link do GitHub (opcional)</span>
          <input value={f.repo} onChange={(e) => setF({ ...f, repo: e.target.value })} placeholder="https://github.com/dono/repositorio" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-muted">Nome {f.repo.trim() ? "(vazio = o nome do repositório)" : ""}</span>
          <input value={f.title} maxLength={120} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="ex. API de contatos" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[12px] text-muted">Habilidades, separadas por vírgula {f.repo.trim() ? "(vazio = as linguagens do repositório)" : ""}</span>
          <input value={f.skills} onChange={(e) => setF({ ...f, skills: e.target.value })} placeholder="ex. Java, Spring Boot, PostgreSQL" />
        </label>
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-[12px] text-muted">Passos, um por linha {f.repo.trim() ? "(se o repositório tiver issues, elas viram os passos)" : "(opcional)"}</span>
          <textarea rows={3} value={f.units} onChange={(e) => setF({ ...f, units: e.target.value })} placeholder={"ex. Autenticação\nTestes de integração\nDeploy"} />
        </label>
        <label className="flex items-center gap-1 text-[12px] text-muted">
          importância
          <select value={f.importance} onChange={(e) => setF({ ...f, importance: Number(e.target.value) })}>
            <option value={3}>essencial para a vaga</option>
            <option value={2}>importante</option>
            <option value={1}>quando sobrar tempo</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy || (!f.repo.trim() && !f.title.trim())} onClick={addOne} className="btn-neon flex items-center gap-1 px-3 py-2 text-xs disabled:opacity-40">
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Adicionar projeto
        </button>
        <button onClick={onClose} className="btn-ghost px-3 py-2 text-xs">
          Fechar
        </button>
      </div>
      {msg && <p className={`text-[12px] ${msg.ok ? "text-ok" : "text-down"}`}>{msg.text}</p>}

      <div className="border-t border-border/60 pt-3">
        {repos === null ? (
          <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <button onClick={loadRepos} className="btn-ghost flex items-center gap-1 px-3 py-1.5 text-xs">
              <FolderGit2 size={12} /> Importar vários do GitHub
            </button>
            <span>Usa o token do GitHub (lista também os privados).</span>
            {listErr !== null && <span className="text-down">{listErr || "Cole o token do GitHub primeiro: em qualquer projeto, clique em Ligar ao GitHub."}</span>}
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-[12px]">
            <p className="font-semibold">Marque os repositórios que já são projetos seus</p>
            {!repos.length && <p className="text-muted">O token não enxerga nenhum repositório.</p>}
            <ul className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
              {repos.map((r) => {
                const has = taken.has(r.repo.toLowerCase());
                return (
                  <li key={r.repo}>
                    <label className={`flex items-center gap-2 rounded border border-border/60 px-2 py-1.5 ${has ? "opacity-50" : "cursor-pointer hover:border-text"}`}>
                      <input type="checkbox" disabled={has} checked={has || picked.has(r.repo)} onChange={() => toggle(r.repo)} />
                      <span className="min-w-0 flex-1 truncate font-mono">{r.repo}</span>
                      {r.private && <span className="text-[10px] text-muted">privado</span>}
                      {has && <Check size={12} className="text-ok" aria-label="já está nas trilhas" />}
                    </label>
                  </li>
                );
              })}
            </ul>
            <div>
              <button
                disabled={busy || !picked.size}
                onClick={async () => {
                  if (await send([...picked].map((repo) => ({ repo })))) setPicked(new Set());
                }}
                className="btn-neon flex items-center gap-1 px-3 py-2 text-xs disabled:opacity-40"
              >
                {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />} Importar {picked.size || ""}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
