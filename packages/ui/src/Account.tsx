"use client";

import { planOf, planText } from "@sdp/habit";
import { AREAS, LEVELS, STACKS, getStack, type AreaId, type Level } from "@sdp/hiring";
import { LayoutGrid, LogIn, LogOut, Plus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { appUrl, type AppId } from "./apps";
import { loginUrl, useSession } from "./useSession";
import { profileTitle, type ProfileRow, type SessionData } from "./profile";
import { PlanEditor, planReady, planValue, type PlanValue } from "./PlanEditor";
import { Avatar, ConnectedAccounts, DetailsCard, SignupForm, SocialButtons, loginError, type Providers } from "./AccountForms";

interface ContaData {
  db: boolean;
  session: SessionData | null;
  users: { id: string; name: string }[];
  providers?: Providers;
}

const json = (method: string, body?: unknown) => ({ method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });


/** Conta: entrar com um clique, criar conta, perfis e meta diária. */
export function Account() {
  const router = useRouter();
  const [data, setData] = useState<ContaData | null>(null);
  const [error, setError] = useState("");
  const [oauthError, setOauthError] = useState("");
  useEffect(() => setOauthError(loginError(new URLSearchParams(window.location.search).get("erro"))), []);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<{ id: string; v: PlanValue } | null>(null);

  const load = (): Promise<ContaData> =>
    fetch("/api/conta")
      .then((r) => r.json())
      .catch(() => ({ db: false, session: null, users: [] }))
      .then((d: ContaData) => (setData(d), d));
  useEffect(() => {
    load();
  }, []);

  async function call(url: string, init: RequestInit) {
    setError("");
    const r = await fetch(url, init);
    const b = await r.json().catch(() => ({}));
    if (!r.ok) return setError(b.error ?? "Algo deu errado."), false;
    const d = await load();
    window.dispatchEvent(new Event("conta-mudou"));
    // acabou de entrar (ou criou a conta): vai para o painel, a área de quem entrou
    if (!data?.session && d.session) {
      window.location.href = "/";
      return true;
    }
    router.refresh();
    return true;
  }

  if (!data) return <p className="text-muted">Carregando…</p>;
  if (!data.db)
    return (
      <div className="panel p-4 text-sm text-muted">
        O banco não respondeu. Abra o Docker Desktop, rode <code className="text-text">pnpm db:up</code> na raiz do projeto e reinicie o{" "}
        <code className="text-text">pnpm dev</code>.
      </div>
    );

  const s = data.session;
  const providers = data.providers ?? { github: false, google: false };
  if (!s)
    return (
      <div className="flex flex-col gap-6">
        {oauthError && <p className="panel !border-down/60 p-3 text-sm text-down">{oauthError}</p>}
        <SocialButtons providers={providers} />
        <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-muted">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>
        <SignupForm onSubmit={(body) => call("/api/conta", json("POST", body))} />
        {error && <p className="text-sm text-down">{error}</p>}
        {data.users.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="hud-label">Já tem conta local? Entre com um clique</div>
            <div className="flex flex-wrap gap-2">
              {data.users.map((u) => (
                <button key={u.id} onClick={() => call("/api/conta", json("POST", { userId: u.id }))} className="btn-ghost flex items-center gap-2 px-3 py-1.5 text-xs">
                  <UserRound size={13} /> {u.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-lg">
          <Avatar user={s.user} size={36} />
          <span>
            Olá, <span className="font-semibold text-ok">{s.user.name}</span>
          </span>
        </div>
        <button onClick={() => call("/api/conta", json("DELETE"))} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <LogOut size={13} /> Sair
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="hud-label">Seus perfis</div>
        {s.profiles.length === 0 && <p className="text-sm text-muted">Crie um perfil para a vaga que você está treinando. Cada perfil tem a sua placa-mãe e a sua meta.</p>}
        {s.profiles.map((p) => {
          const active = s.profile?.id === p.id;
          return (
            <div key={p.id} className={`panel flex flex-wrap items-center gap-3 p-3 text-sm ${active ? "!border-ok" : ""}`}>
              <div className="flex min-w-48 flex-1 flex-col">
                <span className="font-semibold">{profileTitle(p)}</span>
                <span className="text-[12px] text-muted">desde {p.startDay.split("-").reverse().join("/")}</span>
              </div>
              <div className="flex min-w-48 flex-1 flex-col text-[12px]">
                <span className="text-muted">Meta diária</span>
                <span>{planText(planOf(p.goal, p.plan))}</span>
              </div>
              <button onClick={() => setEditing(editing?.id === p.id ? null : { id: p.id, v: planValue(p.goal, p.plan) })} className="btn-ghost px-3 py-1 text-xs">
                Editar meta
              </button>
              {active ? (
                <span className="font-mono text-[11px] uppercase text-ok">ativo</span>
              ) : (
                <button onClick={() => call("/api/perfis", json("PATCH", { id: p.id, active: true }))} className="btn-ghost px-3 py-1 text-xs">
                  Usar este
                </button>
              )}
              {editing?.id === p.id && (
                <div className="flex w-full flex-col gap-3 border-t border-border pt-3">
                  <PlanEditor value={editing.v} onChange={(v) => setEditing({ id: p.id, v })} />
                  <p className="text-[12px] text-muted">A meta nova vale a partir de hoje; os dias anteriores continuam com a meta antiga.</p>
                  <div className="flex items-center gap-3">
                    <button
                      disabled={!planReady(editing.v.plan)}
                      onClick={async () => (await call("/api/perfis", json("PATCH", { id: p.id, ...editing.v }))) && setEditing(null)}
                      className="btn-neon px-4 py-2 text-xs disabled:opacity-40"
                    >
                      Salvar meta ▶
                    </button>
                    <button onClick={() => setEditing(null)} className="text-[12px] text-muted underline">
                      cancelar
                    </button>
                  </div>
                </div>
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
      {oauthError && <p className="text-sm text-down">{oauthError}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <DetailsCard user={s.user} onSave={(v) => call("/api/conta", json("PATCH", v))} />
        <ConnectedAccounts user={s.user} providers={providers} />
      </div>
    </div>
  );
}

/** Estudos e Hábito precisam de um perfil (a vaga que você treina); os outros apps abrem só com a conta. */

function NewProfile({ taken, onCreate, onCancel }: { taken: ProfileRow[]; onCreate(v: { stack: string; level: Level } & PlanValue): void; onCancel(): void }) {
  const [area, setArea] = useState<AreaId>("backend");
  const [stack, setStack] = useState("java");
  const [level, setLevel] = useState<Level>("pleno");
  const [goal, setGoal] = useState<PlanValue>(planValue("sugerida"));
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
        <p className="text-[12px] text-muted">Começa com a sugerida. Você pode escolher outro modelo ou escrever o seu tipo de estudo; a partir daí o hábito começa a contar.</p>
        <PlanEditor value={goal} onChange={setGoal} />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={dup || !planReady(goal.plan)} onClick={() => onCreate({ stack, level, ...goal })} className="btn-neon px-4 py-2 text-xs disabled:opacity-40">
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

/**
 * No cabeçalho: sem conta, o botão "Entrar" (volta para este app depois do login);
 * com conta, o atalho para o Painel com todos os apps e quem está usando.
 */
export function AccountChip({ current }: { current: AppId }) {
  const s = useSession();
  if (s === undefined) return null;
  if (!s)
    return (
      <a href={current === "painel" ? appUrl("painel", "/conta") : loginUrl(current)} className="btn-neon flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1 text-xs">
        <LogIn size={13} /> Entrar
      </a>
    );
  return (
    <div className="flex shrink-0 items-center gap-2">
      {current !== "painel" && (
        <a href={appUrl("painel")} title="Painel com todos os apps" className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-muted transition-colors hover:border-text hover:text-text">
          <LayoutGrid size={13} /> <span className="hidden sm:inline">Meu painel</span>
        </a>
      )}
      <a href={appUrl("painel", "/conta")} title={s.profile ? profileTitle(s.profile) : undefined} className="flex items-center gap-1.5 whitespace-nowrap rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-ok hover:text-ok">
        <Avatar user={s.user} size={18} />
        <span className="hidden max-w-32 truncate text-text sm:inline">{s.user.name}</span>
      </a>
    </div>
  );
}
