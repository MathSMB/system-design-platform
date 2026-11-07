"use client";

import { appUrl, profileTitle, useSession } from "@sdp/ui";
import { AlertTriangle, ChevronDown, ChevronRight, FolderGit2, FolderOpen, FolderPlus, GitBranch, Plus, Loader2, MessageSquarePlus, Play, RefreshCw, Search, Send, Settings2, Trash2, Turtle, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PairIntro } from "./Intro";
import { Md } from "./Md";

interface ChatRow {
  id: string;
  title: string;
  day: string;
  step: number;
  total: number;
  pending: boolean;
  updatedAt: string;
  trailId: string | null;
}
interface Setup {
  goal: string;
  stack: string;
  trailId?: string;
  folder?: string;
  repo?: string;
}
interface Chat {
  id: string;
  title: string;
  day: string;
  setup: Setup;
  folderOk: boolean;
  plan: string[];
  step: number;
  pending: boolean;
}
interface Msg {
  id?: number;
  role: "user" | "assistant";
  text: string;
  waiting?: boolean;
}
interface TrailOpt {
  id: string;
  title: string;
  kind: string;
  project: boolean;
  repo: string | null;
  pct: number;
  done: number;
  total: number;
}

const json = (method: string, body: unknown) => ({ method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
async function call(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; body: any }> {
  try {
    const r = await fetch(url, init);
    return { ok: r.ok, status: r.status, body: await r.json().catch(() => ({})) };
  } catch {
    return { ok: false, status: 0, body: { error: "Sem conexão com o app. Ele ainda está rodando?" } };
  }
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
function dayLabel(d: string): string {
  const t = today();
  const y = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() - 864e5));
  if (d === t) return "Hoje";
  if (d === y) return "Ontem";
  const [yy, mm, dd] = d.split("-");
  return `${dd}/${mm}${yy === t.slice(0, 4) ? "" : `/${yy}`}`;
}

const IDEAS = [
  { goal: "Quero criar a minha primeira API REST em Java com Spring Boot, do zero", stack: "Java + Spring Boot" },
  { goal: "Quero configurar o meu ambiente Java no Windows: IntelliJ, JDK e variáveis de ambiente", stack: "Java" },
  { goal: "Quero entender Git e GitHub de verdade, criando um repositório e fazendo meus primeiros commits", stack: "Git" },
  { goal: "Quero montar um front em React que consome uma API", stack: "React + TypeScript" },
];
const STACKS = ["Java + Spring Boot", "Python", "Node.js + TypeScript", "React + TypeScript", "C# + .NET", "Go"];

export function Pair() {
  const session = useSession();
  const profile = session?.profile;
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      {session && (
        <>
          <div className="flex items-center gap-2 hud-label !text-warn">
            <Users size={14} /> Pair Programming
          </div>
          <h1 className="mt-3 font-display text-xl leading-relaxed">
            Programe com um <span className="text-warn glow">mentor do lado.</span>
          </h1>
          <p className="mt-3 max-w-3xl text-muted">
            Conte o que quer construir. O mentor monta o caminho e vai com você um passo de cada vez: o ambiente, o Git e o código, linha por linha. Ele só segue quando você disser
            &quot;pode continuar&quot;.
          </p>
        </>
      )}
      <PairIntro />
      <div id="comecar" className="scroll-mt-20" />
      {session === undefined && <p className="mt-8 text-muted">Carregando…</p>}
      {session && !profile && (
        <div className="panel mt-8 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
          <span className="text-muted">Crie um perfil (a vaga que você treina) para guardar as suas conversas.</span>
          <Link href={appUrl("painel", "/conta")} className="btn-neon px-4 py-2 text-xs">
            Criar perfil ▶
          </Link>
        </div>
      )}
      {session && profile && (
        <>
          <p className="mt-2 text-[12px] text-muted">
            Perfil: {profileTitle(profile)} ·{" "}
            <Link href={appUrl("painel", "/conta")} className="underline hover:text-warn">
              perfis
            </Link>
          </p>
          <Workspace key={profile.id} />
        </>
      )}
    </main>
  );
}

function Workspace() {
  const [chats, setChats] = useState<ChatRow[] | null>(null);
  const [chat, setChat] = useState<Chat | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [dbDown, setDbDown] = useState(false);
  const [attach, setAttach] = useState(false);
  const { trails, reload: reloadTrails } = useTrails();

  const list = useCallback(async () => {
    const r = await call("/api/pair/conversas");
    if (!r.ok) {
      if (r.status !== 401) setDbDown(true);
      setChats([]);
      return;
    }
    setChats(r.body.chats ?? []);
  }, []);

  const open = useCallback(async (id: string | null) => {
    setErr("");
    setCanRetry(false);
    setAttach(false);
    if (!id) {
      setChat(null);
      setMsgs([]);
      return;
    }
    const r = await call(`/api/pair/conversas?id=${id}`);
    if (!r.ok) return setErr(r.body.error ?? "Não consegui abrir a conversa.");
    setChat(r.body.chat);
    setMsgs(r.body.messages ?? []);
    // no celular a lista fica em cima: desce até a conversa
    if (window.innerWidth < 1024) requestAnimationFrame(() => document.getElementById("pair-chat")?.scrollIntoView({ block: "start", behavior: "smooth" }));
    const last = (r.body.messages ?? []).at(-1);
    // a resposta caiu (janela fechou, IA falhou): dá para pedir de novo
    if (!r.body.chat.pending && last?.role === "user") setCanRetry(true);
  }, []);

  useEffect(() => {
    list().then(() => {});
  }, [list]);

  // a IA ainda está respondendo (ex. a janela foi recarregada): espera e atualiza
  useEffect(() => {
    if (!chat?.pending) return;
    const t = setInterval(async () => {
      const r = await call(`/api/pair/conversas?id=${chat.id}`);
      if (r.ok && !r.body.chat.pending) {
        setChat(r.body.chat);
        setMsgs(r.body.messages ?? []);
        list();
      }
    }, 4000);
    return () => clearInterval(t);
  }, [chat?.pending, chat?.id, list]);

  async function send(text: string, retry = false, target = chat) {
    if (!target || busy) return;
    setErr("");
    setCanRetry(false);
    if (!retry) setMsgs((m) => [...m, { role: "user", text }]);
    setBusy(true);
    const r = await call("/api/pair/conversa", json("POST", { chatId: target.id, text, retry }));
    setBusy(false);
    if (r.ok) {
      setChat(r.body.chat);
      setMsgs((m) => [...m, r.body.message]);
    } else if (r.status === 409) {
      setChat({ ...target, pending: true });
    } else {
      setErr(r.body.error ?? "O mentor não respondeu.");
      setCanRetry(true);
    }
    list();
  }

  async function start(s: Setup, first?: string) {
    setErr("");
    setAttach(false);
    const r = await call("/api/pair/conversas", json("POST", s));
    if (!r.ok) return setErr(r.body.error ?? "Não consegui abrir a conversa.");
    const c: Chat = r.body.chat;
    setChat(c);
    setMsgs([]);
    await list();
    await send(first ?? `${s.goal}${s.stack ? `\n\nStack: ${s.stack}` : ""}`, false, c);
  }

  /** Projeto da lateral: volta para a última conversa dele, ou abre uma nova já ligada a ele. */
  async function project(t: TrailOpt, fresh = false) {
    const last = fresh ? null : chats?.find((c) => c.trailId === t.id);
    if (last) return open(last.id);
    await start({ goal: `Construir o projeto "${t.title}"`, stack: "", trailId: t.id }, kickoff(t.title));
  }

  /** Acoplar um projeto novo: vira projeto nos Estudos e a conversa já começa ligada a ele. */
  async function attachNew(p: { title: string; goal: string; steps: string; stack: string; repo: string; folder: string }): Promise<string | null> {
    const r = await call("/api/pair/projetos", json("POST", p));
    if (!r.ok) return r.body.error ?? "Não consegui acoplar o projeto.";
    const c: Chat = r.body.chat;
    setAttach(false);
    setChat(c);
    setMsgs([]);
    await Promise.all([list(), reloadTrails()]);
    await send(kickoff(p.title), false, c);
    return null;
  }

  async function remove(id: string) {
    if (!confirm("Apagar esta conversa? Não dá para desfazer.")) return;
    await call(`/api/pair/conversas?id=${id}`, { method: "DELETE" });
    if (chat?.id === id) open(null);
    list();
  }

  if (dbDown)
    return (
      <div className="panel mt-8 p-4 text-sm text-muted">
        O banco não respondeu. Abra o Docker Desktop, rode <code className="text-text">pnpm db:up</code> na raiz do projeto e reinicie o <code className="text-text">pnpm dev</code>.
      </div>
    );

  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Sidebar
        chats={chats}
        current={attach ? "acoplar" : (chat?.id ?? null)}
        onOpen={open}
        onRemove={remove}
        projects={trails?.filter((t) => t.project) ?? null}
        currentTrail={chat?.setup.trailId ?? null}
        onProject={project}
        onAttach={() => {
          setChat(null);
          setAttach(true);
        }}
      />
      <section className="min-w-0">
        {attach ? (
          <AttachProject onAttach={attachNew} onCancel={() => setAttach(false)} />
        ) : chat ? (
          <ChatView
            chat={chat}
            msgs={msgs}
            busy={busy || chat.pending}
            err={err}
            canRetry={canRetry}
            onSend={(t) => send(t)}
            onRetry={() => send("", true)}
            onChat={(c) => {
              setChat(c);
              list();
            }}
          />
        ) : (
          <NewChat onStart={start} err={err} />
        )}
      </section>
    </div>
  );
}

const kickoff = (title: string) =>
  `Quero construir o projeto "${title}" aprendendo os conceitos pelo caminho. Você já tem o que ele precisa ter: monte o roteiro a partir disso, comece do primeiro passo e me explique cada fundamento.`;

function Sidebar({
  chats,
  current,
  onOpen,
  onRemove,
  projects,
  currentTrail,
  onProject,
  onAttach,
}: {
  chats: ChatRow[] | null;
  current: string | null;
  onOpen(id: string | null): void;
  onRemove(id: string): void;
  projects: TrailOpt[] | null;
  currentTrail: string | null;
  onProject(t: TrailOpt, fresh?: boolean): void;
  onAttach(): void;
}) {
  const groups: { day: string; items: ChatRow[] }[] = [];
  for (const c of chats ?? []) {
    const g = groups.find((x) => x.day === c.day);
    if (g) g.items.push(c);
    else groups.push({ day: c.day, items: [c] });
  }
  groups.sort((a, b) => b.day.localeCompare(a.day));
  return (
    <aside id="pair-conversas" className="panel flex max-h-[40vh] flex-col overflow-hidden lg:h-[calc(100vh-130px)] lg:max-h-none lg:min-h-[560px]">
      <button onClick={() => onOpen(null)} className={`m-3 flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${current ? "border-border text-muted hover:border-warn hover:text-warn" : "border-warn/70 text-warn"}`}>
        <MessageSquarePlus size={15} /> Nova conversa
      </button>
      <div className="no-scrollbar flex-1 overflow-y-auto px-2 pb-3">
        {chats === null && <p className="px-2 text-[13px] text-muted">Carregando…</p>}
        {chats?.length === 0 && <p className="px-2 text-[13px] text-muted">As suas conversas aparecem aqui, por dia. Clique numa para continuar de onde parou.</p>}
        {groups.map((g) => (
          <div key={g.day} className="mt-2">
            <div className="px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{dayLabel(g.day)}</div>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((c) => (
                <li key={c.id} className="group relative">
                  <button
                    onClick={() => onOpen(c.id)}
                    className={`flex w-full flex-col rounded-md px-2 py-1.5 pr-7 text-left text-[13px] transition-colors ${c.id === current ? "bg-warn/10 text-text" : "text-muted hover:bg-panel-2 hover:text-text"}`}
                  >
                    <span className="line-clamp-2">{c.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] text-muted">
                      {c.pending && <Loader2 size={10} className="animate-spin text-warn" />}
                      {c.total ? `passo ${Math.min(c.step + 1, c.total)} de ${c.total}` : "começando"}
                    </span>
                  </button>
                  <button onClick={() => onRemove(c.id)} title="Apagar conversa" className="absolute right-1.5 top-2 hidden text-muted hover:text-down group-hover:block">
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* projetos acoplados: o mentor já sabe o que cada um precisa */}
      <div id="pair-projetos" className="flex max-h-[45%] shrink-0 flex-col border-t border-border">
        <div className="flex items-center justify-between px-4 pb-1 pt-3">
          <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-warn">
            <FolderGit2 size={12} /> Projetos
          </span>
          <button onClick={onAttach} title="Acoplar um projeto" className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] transition-colors ${current === "acoplar" ? "border-warn text-warn" : "border-border text-muted hover:border-warn hover:text-warn"}`}>
            <FolderPlus size={12} /> Acoplar
          </button>
        </div>
        <div className="no-scrollbar overflow-y-auto px-2 pb-3">
          {projects === null && <p className="px-2 text-[12px] text-muted">Carregando…</p>}
          {projects?.length === 0 && <p className="px-2 py-1 text-[12px] text-muted">Acople um projeto (seu, ou um que a IA sugeriu nos Estudos) e o mentor já começa sabendo o que precisa ser feito.</p>}
          <ul className="flex flex-col gap-0.5">
            {projects?.map((t) => (
              <li key={t.id} className="group relative">
                <button
                  onClick={() => onProject(t)}
                  title="Abrir a conversa deste projeto"
                  className={`flex w-full flex-col rounded-md px-2 py-1.5 pr-7 text-left text-[13px] transition-colors ${t.id === currentTrail && current !== "acoplar" ? "bg-warn/10 text-text" : "text-muted hover:bg-panel-2 hover:text-text"}`}
                >
                  <span className="line-clamp-2">{t.title}</span>
                  <span className="mt-1 flex items-center gap-2 font-mono text-[10px] text-muted">
                    {t.repo && <GitBranch size={10} />}
                    {t.total ? `${t.done}/${t.total} entregas` : "sem passos ainda"}
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-bg">
                      <span className="block h-full rounded-full bg-warn" style={{ width: `${Math.max(t.pct, 2)}%` }} />
                    </span>
                  </span>
                </button>
                <button onClick={() => onProject(t, true)} title="Nova conversa sobre este projeto" className="absolute right-1.5 top-2 hidden text-muted hover:text-warn group-hover:block">
                  <Plus size={13} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

function useTrails() {
  const [trails, setTrails] = useState<TrailOpt[] | null>(null);
  const reload = useCallback(() => call("/api/pair/estudos").then((r) => setTrails(r.body.trails ?? [])), []);
  useEffect(() => {
    reload();
  }, [reload]);
  return { trails, reload };
}

function NewChat({ onStart, err }: { onStart(s: Setup): Promise<void>; err: string }) {
  const [goal, setGoal] = useState("");
  const [stack, setStack] = useState("");
  const [trailId, setTrailId] = useState("");
  const [folder, setFolder] = useState("");
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const { trails } = useTrails();

  function pickTrail(id: string) {
    setTrailId(id);
    const t = trails?.find((x) => x.id === id);
    if (t && !goal.trim()) setGoal(`Quero avançar no projeto "${t.title}"${t.repo ? ` (github.com/${t.repo})` : ""}`);
  }
  async function go() {
    if (!goal.trim() || busy) return;
    setBusy(true);
    await onStart({ goal: goal.trim(), stack: stack.trim(), ...(trailId ? { trailId } : {}), ...(folder.trim() ? { folder: folder.trim() } : {}) });
    setBusy(false);
  }

  return (
    <div id="pair-nova" className="panel flex flex-col gap-5 p-5 sm:p-6">
      <div>
        <h2 className="font-display text-sm leading-relaxed text-warn">O que vamos construir hoje?</h2>
        <p className="mt-2 text-sm text-muted">Pode ser bem do começo. O mentor pergunta o que faltar e monta o caminho com você.</p>
      </div>
      <textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} placeholder="Ex.: quero criar uma API de tarefas em Java, mas nunca configurei o ambiente" className="w-full resize-y text-[15px]" />
      <div className="flex flex-wrap gap-2">
        {IDEAS.map((i) => (
          <button
            key={i.goal}
            onClick={() => {
              setGoal(i.goal);
              setStack(i.stack);
            }}
            className="rounded-full border border-border px-3 py-1 text-left text-[12px] text-muted transition-colors hover:border-warn hover:text-warn"
          >
            {i.goal}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <label className="hud-label">Linguagem ou stack (opcional)</label>
        <div className="flex flex-wrap items-center gap-2">
          {STACKS.map((s) => (
            <button key={s} onClick={() => setStack(stack === s ? "" : s)} className={`rounded-md border px-2.5 py-1 text-[12px] transition-colors ${stack === s ? "border-warn text-warn" : "border-border text-muted hover:text-text"}`}>
              {s}
            </button>
          ))}
          <input value={STACKS.includes(stack) ? "" : stack} onChange={(e) => setStack(e.target.value)} placeholder="outra…" className="w-32 text-[12px]" />
        </div>
      </div>

      <button onClick={() => setMore(!more)} className="flex items-center gap-1.5 self-start text-[13px] text-muted hover:text-text">
        {more ? <ChevronDown size={14} /> : <ChevronRight size={14} />} Ligar aos Estudos e à pasta do projeto (opcional)
      </button>
      {more && (
        <div className="grid gap-4 rounded-lg border border-border bg-bg/40 p-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label className="hud-label flex items-center gap-1.5">
              <FolderGit2 size={12} /> Trilha ou projeto dos Estudos
            </label>
            <select value={trailId} onChange={(e) => pickTrail(e.target.value)} className="text-[13px]">
              <option value="">Nenhuma (conversa livre)</option>
              {trails?.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.project ? "Projeto" : t.kind}: {t.title} ({t.pct}%)
                </option>
              ))}
            </select>
            <p className="text-[12px] text-muted">
              Com uma trilha ligada, o mentor vê os passos, o repositório e o que você já domina.{" "}
              {trails?.length === 0 && (
                <a href={appUrl("estudos", "/#trilhas")} className="text-accent-2 underline">
                  Criar uma trilha nos Estudos
                </a>
              )}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label className="hud-label flex items-center gap-1.5">
              <FolderOpen size={12} /> Pasta do projeto no seu computador
            </label>
            <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="C:\Users\voce\projetos\api-tarefas" className="font-mono text-[12px]" />
            <p className="text-[12px] text-muted">Com a pasta, o mentor confere o que você fez (só lê, nunca altera nada). Dá para colocar depois, quando ela existir.</p>
          </div>
        </div>
      )}

      {err && <p className="text-sm text-down">{err}</p>}
      <div className="flex items-center gap-3">
        <button onClick={go} disabled={!goal.trim() || busy} className="btn-neon px-6 py-3 text-xs disabled:opacity-50" style={{ background: "var(--warn)", color: "#1a1600" }}>
          {busy ? "Abrindo…" : "Começar ▶"}
        </button>
        <span className="text-[12px] text-muted">A conversa fica salva; você pode parar e voltar outro dia.</span>
      </div>
    </div>
  );
}

function ChatView({ chat, msgs, busy, err, canRetry, onSend, onRetry, onChat }: { chat: Chat; msgs: Msg[]; busy: boolean; err: string; canRetry: boolean; onSend(t: string): void; onRetry(): void; onChat(c: Chat): void }) {
  const [text, setText] = useState("");
  const [roadmap, setRoadmap] = useState(false);
  const [settings, setSettings] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const last = msgs.at(-1);
  const waiting = !busy && last?.role === "assistant" && last.waiting;
  const total = chat.plan.length;
  const step = Math.min(chat.step, Math.max(0, total - 1));
  const pct = total ? Math.round((100 * step) / total) : 0;

  useEffect(() => {
    // rola só a conversa (não a página) até a última mensagem
    const el = scroller.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs.length, busy, chat.id]);

  function submit(t = text) {
    const v = t.trim();
    if (!v || busy) return;
    onSend(v);
    setText("");
  }
  const explainLine = (line: string, lang: string) => submit(`Explica essa linha, parte por parte:\n\`\`\`${lang}\n${line.trim()}\n\`\`\``);
  const prefill = (t: string) => {
    setText(t);
    requestAnimationFrame(() => box.current?.focus());
  };

  return (
    <div id="pair-chat" className="panel flex h-[calc(100vh-130px)] min-h-[560px] flex-col overflow-hidden">
      {/* topo: título, roteiro e ajustes */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold">{chat.title}</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 font-mono text-[11px] text-muted">
              {chat.setup.stack && <span>{chat.setup.stack}</span>}
              {chat.setup.trailId && <span className="text-accent-2">ligado aos Estudos</span>}
              {chat.setup.folder && <span className={chat.folderOk ? "text-ok" : "text-bad"}>{chat.folderOk ? "pasta ligada" : "pasta não encontrada"}</span>}
            </p>
          </div>
          <button onClick={() => setSettings(!settings)} title="Pasta e trilha" className={`rounded-md border p-1.5 ${settings ? "border-warn text-warn" : "border-border text-muted hover:text-text"}`}>
            <Settings2 size={15} />
          </button>
        </div>
        {total > 0 && (
          <div className="mt-3">
            <button onClick={() => setRoadmap(!roadmap)} className="flex w-full items-center gap-3 text-left">
              <span className="shrink-0 font-mono text-[11px] text-warn">
                PASSO {step + 1}/{total}
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px]">{chat.plan[step]}</span>
              {roadmap ? <ChevronDown size={14} className="text-muted" /> : <ChevronRight size={14} className="text-muted" />}
            </button>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
              <div className="h-full rounded-full bg-warn shadow-[0_0_8px_var(--warn)] transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
            </div>
            {roadmap && (
              <ol className="mt-3 grid gap-1 text-[13px] sm:grid-cols-2">
                {chat.plan.map((p, i) => (
                  <li key={i} className={`flex gap-2 ${i < step ? "text-muted line-through decoration-muted/50" : i === step ? "text-warn" : "text-text/80"}`}>
                    <span className="w-5 shrink-0 text-right font-mono text-[11px]">{i < step ? "✓" : i + 1}</span>
                    {p}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
        {settings && <ChatSettings chat={chat} onChat={onChat} onClose={() => setSettings(false)} />}
      </div>

      {/* conversa */}
      <div ref={scroller} className="pair-msgs min-h-0 flex-1 overflow-y-auto px-4 py-5">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {msgs.map((m, i) =>
            m.role === "user" ? (
              <div key={m.id ?? `u${i}`} className="ml-auto max-w-[85%] rounded-lg bg-warn/10 px-4 py-2.5 text-[15px]">
                <Md text={m.text} />
              </div>
            ) : (
              <div key={m.id ?? `a${i}`} className="flex gap-3">
                <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-warn/60 text-warn">
                  <Users size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <Md text={m.text} onLine={busy ? undefined : explainLine} />
                </div>
              </div>
            ),
          )}
          {busy && (
            <div className="flex items-center gap-3 text-sm text-muted">
              <Loader2 size={16} className="animate-spin text-warn" /> O mentor está pensando… (pode levar um minuto)
            </div>
          )}
          {err && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-down/50 px-3 py-2 text-sm">
              <AlertTriangle size={15} className="text-down" />
              <span className="min-w-0 flex-1">{err}</span>
              {canRetry && (
                <button onClick={onRetry} className="btn-ghost flex items-center gap-1.5 px-3 py-1 text-xs">
                  <RefreshCw size={12} /> Tentar de novo
                </button>
              )}
            </div>
          )}
          {!err && canRetry && !busy && (
            <button onClick={onRetry} className="btn-ghost flex items-center gap-1.5 self-start px-3 py-1 text-xs">
              <RefreshCw size={12} /> A resposta não chegou. Pedir de novo
            </button>
          )}
        </div>
      </div>

      {/* atalhos e caixa de texto */}
      <div className="border-t border-border bg-bg/40 px-4 py-3">
        <div className="mx-auto flex max-w-3xl flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            {waiting && (
              <button onClick={() => submit("Pronto, pode continuar.")} className="btn-neon flex items-center gap-1.5 px-4 py-1.5 text-xs" style={{ background: "var(--warn)", color: "#1a1600" }}>
                <Play size={12} /> Pode continuar
              </button>
            )}
            <Quick disabled={busy || !last} onClick={() => submit("Explica mais devagar, com outras palavras e um exemplo do dia a dia.")} Icon={Turtle} label="Explica mais devagar" />
            <Quick disabled={busy || !last} onClick={() => prefill("Deu este erro: ")} Icon={AlertTriangle} label="Deu erro" />
            {(chat.folderOk || chat.setup.trailId) && <Quick disabled={busy || !last} onClick={() => submit("Confere pra mim se fiz certo o passo atual.")} Icon={Search} label="Confere pra mim" />}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              ref={box}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              placeholder={waiting ? 'Terminou? Clique em "Pode continuar", ou escreva a sua dúvida…' : "Escreva a sua dúvida ou o que aconteceu… (Shift+Enter quebra a linha)"}
              className="min-h-[44px] flex-1 resize-y text-[14px]"
            />
            <button onClick={() => submit()} disabled={busy || !text.trim()} title="Enviar" className="btn-ghost grid h-11 w-11 place-items-center disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Quick({ onClick, Icon, label, disabled }: { onClick(): void; Icon: typeof Play; label: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-warn hover:text-warn disabled:opacity-40">
      <Icon size={12} /> {label}
    </button>
  );
}

function ChatSettings({ chat, onChat, onClose }: { chat: Chat; onChat(c: Chat): void; onClose(): void }) {
  const [folder, setFolder] = useState(chat.setup.folder ?? "");
  const [trailId, setTrailId] = useState(chat.setup.trailId ?? "");
  const [msg, setMsg] = useState("");
  const { trails } = useTrails();
  async function save() {
    const r = await call("/api/pair/conversas", json("PATCH", { id: chat.id, folder: folder.trim(), trailId }));
    if (!r.ok) return setMsg(r.body.error ?? "Não deu para salvar.");
    onChat(r.body.chat);
    setMsg(r.body.chat.setup.folder && !r.body.chat.folderOk ? "Salvo, mas não achei essa pasta neste computador. Confira o caminho." : "Salvo. O mentor usa isso a partir da próxima mensagem.");
  }
  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-border bg-bg/40 p-3 md:grid-cols-[1fr_1fr_auto]">
      <label className="flex flex-col gap-1 text-[12px] text-muted">
        Pasta do projeto (o mentor só lê)
        <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="C:\Users\voce\projetos\api" className="font-mono text-[12px]" />
      </label>
      <label className="flex flex-col gap-1 text-[12px] text-muted">
        Trilha dos Estudos
        <select value={trailId} onChange={(e) => setTrailId(e.target.value)} className="text-[12px]">
          <option value="">Nenhuma</option>
          {trails?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.project ? "Projeto" : t.kind}: {t.title}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-end gap-2">
        <button onClick={save} className="btn-ghost px-3 py-1.5 text-xs">
          Salvar
        </button>
        <button onClick={onClose} title="Fechar" className="p-1.5 text-muted hover:text-text">
          <X size={14} />
        </button>
      </div>
      {msg && <p className="text-[12px] text-muted md:col-span-3">{msg}</p>}
    </div>
  );
}

function AttachProject({ onAttach, onCancel }: { onAttach(p: { title: string; goal: string; steps: string; stack: string; repo: string; folder: string }): Promise<string | null>; onCancel(): void }) {
  const [f, setF] = useState({ title: "", goal: "", steps: "", stack: "", repo: "", folder: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  async function go() {
    if (busy) return;
    setBusy(true);
    setErr((await onAttach({ ...f, title: f.title.trim(), goal: f.goal.trim() })) ?? "");
    setBusy(false);
  }
  return (
    <div id="pair-acoplar" className="panel flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-sm leading-relaxed text-warn">Acoplar um projeto</h2>
          <p className="mt-2 text-sm text-muted">
            Um projeto seu ou um que a IA sugeriu. Ele entra nos Estudos e o mentor já começa sabendo o que precisa ser feito, ensinando os conceitos de cada passo.
          </p>
        </div>
        <button onClick={onCancel} title="Fechar" className="p-1 text-muted hover:text-text">
          <X size={16} />
        </button>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="hud-label">Nome do projeto</span>
        <input value={f.title} onChange={set("title")} placeholder="Ex.: API de pagamentos com Kafka" className="text-[14px]" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="hud-label">O que ele precisa ter ou fazer</span>
        <textarea value={f.goal} onChange={set("goal")} rows={3} placeholder="Ex.: uma API REST de transferências entre contas, com Postgres, eventos no Kafka e testes. Quero aprender Spring Boot e mensageria fazendo." className="resize-y text-[14px]" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="hud-label">Entregas ou passos (opcional, um por linha)</span>
        <textarea value={f.steps} onChange={set("steps")} rows={5} placeholder={"API de transferências com Spring Boot\nPostgres e migrações\nEvento no Kafka com idempotência\nTestes com Testcontainers"} className="resize-y font-mono text-[12px]" />
        <span className="text-[12px] text-muted">Em branco, o mentor monta o roteiro a partir do que você contou.</span>
      </label>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="flex flex-col gap-1.5">
          <span className="hud-label">Stack (opcional)</span>
          <input value={f.stack} onChange={set("stack")} placeholder="Java + Spring Boot" className="text-[13px]" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="hud-label flex items-center gap-1.5">
            <GitBranch size={11} /> Repositório (opcional)
          </span>
          <input value={f.repo} onChange={set("repo")} placeholder="github.com/voce/projeto" className="font-mono text-[12px]" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="hud-label flex items-center gap-1.5">
            <FolderOpen size={11} /> Pasta no computador (opcional)
          </span>
          <input value={f.folder} onChange={set("folder")} placeholder="C:\Users\voce\projetos\api" className="font-mono text-[12px]" />
        </label>
      </div>
      {err && <p className="text-sm text-down">{err}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={go} disabled={busy || !f.title.trim() || !f.goal.trim()} className="btn-neon px-6 py-3 text-xs disabled:opacity-50" style={{ background: "var(--warn)", color: "#1a1600" }}>
          {busy ? "Acoplando…" : "Acoplar e começar ▶"}
        </button>
        <span className="text-[12px] text-muted">Os projetos dos Estudos (seus ou sugeridos pela IA) já aparecem na lateral.</span>
      </div>
    </div>
  );
}
