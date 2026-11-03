"use client";

import { GOALS, type Goal } from "@sdp/habit";
import { AREAS, LEVELS, STACKS, getStack, trackTitle, type AreaId, type Level } from "@sdp/hiring";
import { LogOut, Plus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export interface ProfileRow {
  id: string;
  stack: string;
  level: string;
  goal: string;
  startDay: string;
}
export interface SessionData {
  user: { id: string; name: string };
  profiles: ProfileRow[];
  profile: ProfileRow | null;
}
interface ContaData {
  db: boolean;
  session: SessionData | null;
  users: { id: string; name: string }[];
}

const json = (method: string, body?: unknown) => ({ method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });

export const profileTitle = (p: ProfileRow) => trackTitle(p.stack, p.level as Level);

/** Conta: entrar com um clique, criar conta, perfis e meta diária. */
export function Account() {
  const router = useRouter();
  const [data, setData] = useState<ContaData | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () =>
    fetch("/api/conta")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ db: false, session: null, users: [] }));
  useEffect(() => {
    load();
  }, []);

  async function call(url: string, init: RequestInit) {
    setError("");
    const r = await fetch(url, init);
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setError(b.error ?? "Algo deu errado."), false;
    await load();
    window.dispatchEvent(new Event("conta-mudou"));
    router.refresh();
    return true;
  }

  if (!data) return <p className="text-muted">Carregando…</p>;
  if (!data.db)
    return (
      <div className="panel p-4 text-sm text-muted">
        Contas precisam do banco de dados. Coloque a <code className="text-text">DATABASE_URL</code> do Neon no <code className="text-text">apps/web/.env.local</code>, rode{" "}
        <code className="text-text">pnpm --filter web db:push</code> e reinicie o <code className="text-text">pnpm dev</code>.
      </div>
    );

  const s = data.session;
  if (!s)
    return (
      <div className="flex flex-col gap-5">
        {data.users.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="hud-label">Entrar como</div>
            <div className="flex flex-wrap gap-2">
              {data.users.map((u) => (
                <button key={u.id} onClick={() => call("/api/conta", json("POST", { userId: u.id }))} className="btn-neon flex items-center gap-2 px-4 py-2 text-xs">
                  <UserRound size={14} /> {u.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <form
          className="panel flex flex-col gap-3 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            call("/api/conta", json("POST", { name }));
          }}
        >
          <div className="hud-label">Criar conta</div>
          <label className="flex flex-col gap-1 text-sm">
            Seu nome
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Matheus" className="max-w-xs" />
          </label>
          <button className="btn-neon self-start px-4 py-2 text-xs">Criar e entrar ▶</button>
          <p className="text-[12px] text-muted">Por enquanto é só clicar e entrar, sem senha. Login com Google e GitHub vem depois.</p>
        </form>
        {error && <p className="text-sm text-down">{error}</p>}
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-lg">
          Olá, <span className="font-semibold text-ok">{s.user.name}</span>
        </div>
        <button onClick={() => call("/api/conta", json("DELETE"))} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <LogOut size={13} /> Sair
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="hud-label">Seus perfis</div>
        {s.profiles.length === 0 && <p className="text-sm text-muted">Crie um perfil para a vaga que você está treinando. Cada perfil tem o seu rack e a sua meta.</p>}
        {s.profiles.map((p) => {
          const active = s.profile?.id === p.id;
          return (
            <div key={p.id} className={`panel flex flex-wrap items-center gap-3 p-3 text-sm ${active ? "!border-ok" : ""}`}>
              <div className="flex min-w-48 flex-1 flex-col">
                <span className="font-semibold">{profileTitle(p)}</span>
                <span className="text-[12px] text-muted">desde {p.startDay.split("-").reverse().join("/")}</span>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-muted">
                Meta
                <select value={p.goal} onChange={(e) => call("/api/perfis", json("PATCH", { id: p.id, goal: e.target.value }))}>
                  {GOALS.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
              {active ? (
                <span className="font-mono text-[11px] uppercase text-ok">ativo</span>
              ) : (
                <button onClick={() => call("/api/perfis", json("PATCH", { id: p.id, active: true }))} className="btn-ghost px-3 py-1 text-xs">
                  Usar este
                </button>
              )}
            </div>
          );
        })}
        {!creating ? (
          <button onClick={() => setCreating(true)} className="btn-ghost flex items-center gap-1.5 self-start px-3 py-1.5 text-xs">
            <Plus size={13} /> Novo perfil
          </button>
        ) : (
          <NewProfile
            taken={s.profiles}
            onCancel={() => setCreating(false)}
            onCreate={async (v) => (await call("/api/perfis", json("POST", v))) && setCreating(false)}
          />
        )}
      </div>
      {error && <p className="text-sm text-down">{error}</p>}
    </div>
  );
}

function NewProfile({ taken, onCreate, onCancel }: { taken: ProfileRow[]; onCreate(v: { stack: string; level: Level; goal: Goal }): void; onCancel(): void }) {
  const [area, setArea] = useState<AreaId>("backend");
  const [stack, setStack] = useState("java");
  const [level, setLevel] = useState<Level>("pleno");
  const [goal, setGoal] = useState<Goal>("regular");
  const dup = taken.some((p) => p.stack === stack && p.level === level);
  return (
    <div className="panel flex flex-col gap-4 p-4 text-sm">
      <div className="hud-label">Novo perfil</div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          Área
          <select
            value={area}
            onChange={(e) => {
              const a = e.target.value as AreaId;
              setArea(a);
              setStack(STACKS.find((x) => x.area === a)!.id);
            }}
          >
            {AREAS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Stack
          <select value={stack} onChange={(e) => setStack(e.target.value)}>
            {STACKS.filter((x) => x.area === area).map((x) => (
              <option key={x.id} value={x.id}>
                {x.title}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Senioridade
          <select value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        </label>
      </div>
      {!getStack(stack)?.ready.includes(level) && <p className="text-[12px] text-muted">Essa vaga ainda não tem processo seletivo (pesquisa pendente), mas as respostas e os casos de system design contam para a meta.</p>}
      <div className="flex flex-col gap-2">
        <span>Meta diária</span>
        <div className="grid gap-2 sm:grid-cols-3">
          {GOALS.map((g) => (
            <button key={g.id} type="button" onClick={() => setGoal(g.id)} className={`panel flex flex-col gap-1 p-3 text-left transition-colors ${goal === g.id ? "!border-ok" : "hover:border-muted"}`}>
              <span className={`font-display text-[11px] ${goal === g.id ? "text-ok" : ""}`}>{g.title}</span>
              <span className="text-[12px] text-muted">{g.rule}</span>
              <span className="font-mono text-[11px] text-muted">~{g.minutes} min</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button disabled={dup} onClick={() => onCreate({ stack, level, goal })} className="btn-neon px-4 py-2 text-xs disabled:opacity-40">
          Criar perfil ▶
        </button>
        <button onClick={onCancel} className="text-[12px] text-muted underline">
          cancelar
        </button>
        {dup && <span className="text-[12px] text-down">Você já tem esse perfil.</span>}
      </div>
    </div>
  );
}

/** No cabeçalho: quem está usando e o perfil ativo. */
export function AccountChip() {
  const [s, setS] = useState<SessionData | null | undefined>(undefined);
  useEffect(() => {
    const load = () =>
      fetch("/api/conta")
        .then((r) => r.json())
        .then((d) => setS(d.session))
        .catch(() => setS(null));
    load();
    window.addEventListener("conta-mudou", load);
    return () => window.removeEventListener("conta-mudou", load);
  }, []);
  if (s === undefined) return null;
  return (
    <a href="/conta" title={s?.profile ? profileTitle(s.profile) : undefined} className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-ok hover:text-ok">
      <UserRound size={13} />
      {s ? (
        <span className="text-text">{s.user.name}</span>
      ) : (
        <span className="font-semibold uppercase tracking-[0.14em]">Entrar</span>
      )}
    </a>
  );
}
