"use client";

import type { Trail } from "@sdp/study";
import { ATTACH_MAX_BYTES, ATTACH_MAX_PER_MESSAGE, ATTACH_TYPES, CHAT_FRESH_MS, kindOf } from "@sdp/study";
import { FileText, History, Loader2, MessageCircle, Paperclip, Plus, RefreshCw, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { TrailSummary, json } from "./Study";

interface Attachment {
  id: string;
  name: string;
  mime: string;
  size: number;
}
interface Msg {
  id?: number;
  role: "user" | "assistant";
  text: string;
  createdAt?: string;
  trail?: Trail | null;
  action?: "none" | "add_trail" | "replan";
  /** Já adicionada à central / cronograma já refeito. */
  used?: boolean;
  attachments?: string[];
}
interface ChatRow {
  id: string;
  title: string;
  updatedAt: string;
  pending: boolean;
}

const HELLO =
  "Oi! Me conta o que você quer encaixar nos estudos: a sua pós, uma certificação, um livro, um curso. Eu monto o escopo do que precisa aprender (pode mandar print ou PDF da grade). O tempo fica com o cronograma.";
const IDEAS = ["Estou fazendo uma pós em arquitetura de software", "Quero tirar a certificação AWS Solutions Architect Associate", "Vou ler Designing Data-Intensive Applications", "Semana que vem tenho pouco tempo, refaz o cronograma"];

/** Antes, a conversa ficava só neste navegador. Na primeira vez, ela vai para o banco. */
const legacyKey = (profileId: string) => `sdp-conversa-${profileId}`;
const draftKey = (profileId: string) => `sdp-rascunho-${profileId}`;
const when = (d: string) => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const accept = Object.keys(ATTACH_TYPES).join(",");

async function call(url: string, init?: RequestInit): Promise<{ ok: boolean; body: any }> {
  const r = await fetch(url, init);
  return { ok: r.ok, body: await r.json().catch(() => ({})) };
}

export function StudyChat({ profileId, onClose, onChanged }: { profileId: string; onClose(): void; onChanged(): void }) {
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [files, setFiles] = useState<Record<string, Attachment>>({});
  const [pending, setPending] = useState(false);
  const [text, setText] = useState("");
  const [toSend, setToSend] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState<"" | "load" | "chat" | "plan" | "upload">("load");
  const [err, setErr] = useState("");
  const [canRetry, setCanRetry] = useState(false);
  const [history, setHistory] = useState(false);
  const [drag, setDrag] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);

  const listChats = useCallback(async () => {
    const r = await call("/api/estudos/conversas");
    const list: ChatRow[] = r.body.chats ?? [];
    setChats(list);
    return list;
  }, []);

  const open = useCallback(async (id: string | null) => {
    setErr("");
    setCanRetry(false);
    setHistory(false);
    setChatId(id);
    if (!id) {
      setMsgs([]);
      setPending(false);
      return;
    }
    const r = await call(`/api/estudos/conversas?id=${id}`);
    if (!r.ok) return setErr(r.body.error ?? "Não deu para abrir a conversa.");
    setMsgs(r.body.messages ?? []);
    setFiles((f) => ({ ...f, ...Object.fromEntries((r.body.attachments ?? []).map((a: Attachment) => [a.id, a])) }));
    setPending(!!r.body.chat?.pending);
    const last = (r.body.messages ?? []).at(-1);
    setCanRetry(!r.body.chat?.pending && last?.role === "user");
  }, []);

  // abre: traz a conversa antiga do navegador (se houver), e continua a última se for recente
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        // tira do navegador antes de mandar, para não importar duas vezes
        const old = JSON.parse(localStorage.getItem(legacyKey(profileId)) ?? "null");
        localStorage.removeItem(legacyKey(profileId));
        if (Array.isArray(old) && old.some((m) => m?.role === "user")) {
          const r = await call("/api/estudos/conversas", json("PATCH", { op: "import", messages: old }));
          if (!r.ok) localStorage.setItem(legacyKey(profileId), JSON.stringify(old));
        }
      } catch {}
      try {
        setText(localStorage.getItem(draftKey(profileId)) ?? "");
      } catch {}
      const list = await listChats();
      if (!alive) return;
      const last = list[0];
      await open(last && (last.pending || Date.now() - new Date(last.updatedAt).getTime() < CHAT_FRESH_MS) ? last.id : null);
      if (alive) setBusy("");
    })();
    return () => {
      alive = false;
    };
  }, [profileId, listChats, open]);

  // o rascunho fica guardado (fechar a janela não perde o que você escreveu)
  useEffect(() => {
    try {
      if (text) localStorage.setItem(draftKey(profileId), text);
      else localStorage.removeItem(draftKey(profileId));
    } catch {}
  }, [text, profileId]);

  // a IA está respondendo (talvez de quando a janela estava fechada): espera a resposta
  useEffect(() => {
    if (!pending || !chatId || busy === "chat") return;
    const t = setInterval(() => open(chatId), 4000);
    return () => clearInterval(t);
  }, [pending, chatId, busy, open]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, busy, pending]);

  // fecha só no X ou no Esc (clicar fora não fecha mais)
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function upload(list: File[]) {
    setErr("");
    const room = ATTACH_MAX_PER_MESSAGE - toSend.length;
    const ok = list.filter((f) => ATTACH_TYPES[f.type] && f.size <= ATTACH_MAX_BYTES).slice(0, room);
    if (ok.length < list.length) setErr(`Só imagens e PDF, até 5 MB cada, no máximo ${ATTACH_MAX_PER_MESSAGE} por mensagem.`);
    if (!ok.length) return;
    const form = new FormData();
    for (const f of ok) form.append("file", f);
    setBusy("upload");
    const r = await call("/api/estudos/anexos", { method: "POST", body: form });
    setBusy("");
    if (!r.ok) return setErr(r.body.error ?? "Não deu para anexar.");
    const got: Attachment[] = r.body.attachments ?? [];
    setFiles((f) => ({ ...f, ...Object.fromEntries(got.map((a) => [a.id, a])) }));
    setToSend((s) => [...s, ...got]);
  }

  async function send(t = text, retry = false) {
    if (busy || pending) return;
    if (!retry && !t.trim() && !toSend.length) return;
    const ids = toSend.map((a) => a.id);
    if (!retry) setMsgs((m) => [...m, { role: "user", text: t.trim(), attachments: ids }]);
    setText("");
    setToSend([]);
    setErr("");
    setCanRetry(false);
    setBusy("chat");
    const r = await call("/api/estudos/conversa", json("POST", retry ? { chatId, retry: true } : { chatId, text: t.trim(), attachments: ids }));
    setBusy("");
    const id = r.body.chatId ?? chatId;
    if (id) await open(id);
    listChats();
    if (!r.ok) {
      setErr(r.body.error ?? "A IA não respondeu.");
      setCanRetry(true);
      return;
    }
    if (r.body.note) onChanged();
  }

  async function add(m: Msg, t: Trail) {
    const r = await call("/api/estudos", json("PATCH", { op: "trail-add", trail: t }));
    if (!r.ok) return setErr(r.body.error ?? "Não deu para adicionar.");
    await call("/api/estudos/conversas", json("PATCH", { op: "used", chatId, messageId: m.id }));
    await call("/api/estudos/conversas", json("PATCH", { op: "note", chatId, action: "replan", text: `Pronto, "${t.title}" está nas suas trilhas. Quer que eu refaça o cronograma agora para encaixar no seu tempo?` }));
    await open(chatId);
    onChanged();
  }

  async function replan(m: Msg) {
    setBusy("plan");
    setErr("");
    const r = await call("/api/estudos/cronograma", { method: "POST" });
    setBusy("");
    if (!r.ok) return setErr(r.body.error ?? "Não deu para refazer o cronograma.");
    await call("/api/estudos/conversas", json("PATCH", { op: "used", chatId, messageId: m.id }));
    await call("/api/estudos/conversas", json("PATCH", { op: "note", chatId, text: r.body.schedule?.notes ? `Cronograma refeito. ${r.body.schedule.notes}` : "Cronograma refeito." }));
    await open(chatId);
    onChanged();
  }

  const thinking = busy === "chat" || pending;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
      <aside
        className={`relative flex h-full w-full max-w-lg flex-col border-l border-border bg-bg ${drag ? "ring-2 ring-accent-2" : ""}`}
        role="dialog"
        aria-label="Conversa com a IA"
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          upload([...e.dataTransfer.files]);
        }}
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 font-semibold">
            <MessageCircle size={16} className="text-accent-2" /> Conversar com a IA
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setHistory(!history)} className={`flex items-center gap-1 text-[12px] hover:text-text ${history ? "text-accent-2" : "text-muted"}`}>
              <History size={13} /> conversas anteriores
            </button>
            <button disabled={thinking} onClick={() => open(null)} className="flex items-center gap-1 text-[12px] text-muted hover:text-text disabled:opacity-40">
              <Plus size={13} /> nova
            </button>
            <button aria-label="Fechar" onClick={onClose} className="text-muted hover:text-text">
              <X size={18} />
            </button>
          </div>
        </header>

        {history && (
          <div className="max-h-[45%] overflow-y-auto border-b border-border px-4 py-3">
            <div className="hud-label mb-2">Conversas anteriores</div>
            {!chats.length && <p className="text-[12px] text-muted">Nenhuma ainda.</p>}
            <ul className="flex flex-col gap-1">
              {chats.map((c) => (
                <li key={c.id}>
                  <button onClick={() => open(c.id)} className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-panel-2 ${c.id === chatId ? "bg-panel-2" : ""}`}>
                    <span className="font-mono text-[11px] text-muted">{when(c.updatedAt)}</span>
                    <span className="flex-1 truncate">{c.title || "(sem título)"}</span>
                    {c.pending && <Loader2 size={11} className="animate-spin text-muted" />}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted">Tudo fica salvo. Abra uma conversa para continuar de onde parou: a IA lembra do resumo dela.</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {busy === "load" ? (
            <p className="text-[12px] text-muted">Carregando…</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col items-start">
                <div className="panel max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[14px]">{HELLO}</div>
              </div>
              {msgs.map((m, i) => (
                <div key={m.id ?? `n${i}`} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
                  {!!m.attachments?.length && (
                    <div className="flex max-w-[90%] flex-wrap justify-end gap-2">
                      {m.attachments.map((id) => (
                        <AttachmentChip key={id} a={files[id]} id={id} />
                      ))}
                    </div>
                  )}
                  {m.text && <div className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[14px] ${m.role === "user" ? "bg-accent/15 text-text" : "panel"}`}>{m.text}</div>}
                  {m.trail && (
                    <div className="panel w-full max-w-[90%] p-3 text-sm !border-ok/60">
                      <div className="font-semibold">{m.trail.title}</div>
                      <TrailSummary t={m.trail} />
                      {m.trail.units.length > 0 && (
                        <ol className="mt-2 max-h-40 list-decimal overflow-y-auto pl-5 text-[12px] text-muted">
                          {m.trail.units.map((u) => (
                            <li key={u.id}>{u.title}</li>
                          ))}
                        </ol>
                      )}
                      <div className="mt-1 text-[11px] text-muted">
                        {m.trail.units.length} {kindOf(m.trail.kind).units}
                        {m.trail.skills.length ? ` · cobre ${m.trail.skills.join(", ")}` : ""}
                      </div>
                      <button disabled={m.used || !m.id} onClick={() => add(m, m.trail!)} className="btn-neon mt-2 px-3 py-1.5 text-xs disabled:opacity-40">
                        {m.used ? "Adicionada ✓" : "Adicionar à central ▶"}
                      </button>
                    </div>
                  )}
                  {m.action === "replan" && !m.trail && (
                    <button disabled={m.used || !!busy || !m.id} onClick={() => replan(m)} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40">
                      {busy === "plan" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                      {m.used ? "Cronograma refeito ✓" : "Refazer o cronograma agora"}
                    </button>
                  )}
                </div>
              ))}
              {thinking && (
                <div className="flex items-center gap-2 text-[12px] text-muted">
                  <Loader2 size={12} className="animate-spin" /> pensando… (pode buscar na web, leva até 1 minuto). Pode fechar: a resposta fica salva.
                </div>
              )}
              {busy === "plan" && <div className="text-[12px] text-muted">Refazendo o cronograma (1 a 3 minutos)…</div>}
              {err && (
                <div className="flex flex-wrap items-center gap-2 text-[12px] text-down">
                  {err}
                  {canRetry && chatId && (
                    <button onClick={() => send("", true)} className="btn-ghost px-2 py-0.5 text-[11px]">
                      tentar de novo
                    </button>
                  )}
                </div>
              )}
              <div ref={end} />
            </div>
          )}
          {!busy && !msgs.length && (
            <div className="mt-4 flex flex-wrap gap-2">
              {IDEAS.map((t) => (
                <button key={t} onClick={() => send(t)} className="btn-ghost px-2.5 py-1 text-left text-[12px]">
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          className="flex flex-col gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {(toSend.length > 0 || busy === "upload") && (
            <div className="flex flex-wrap items-center gap-2">
              {toSend.map((a) => (
                <span key={a.id} className="relative">
                  <AttachmentChip a={a} id={a.id} />
                  <button type="button" aria-label={`Tirar ${a.name}`} onClick={() => setToSend((s) => s.filter((x) => x.id !== a.id))} className="absolute -right-1.5 -top-1.5 rounded-full bg-panel-2 p-0.5 text-muted hover:text-down">
                    <X size={10} />
                  </button>
                </span>
              ))}
              {busy === "upload" && <Loader2 size={14} className="animate-spin text-muted" />}
            </div>
          )}
          <div className="flex gap-2">
            <input ref={picker} type="file" multiple accept={accept} className="hidden" onChange={(e) => (upload([...(e.target.files ?? [])]), (e.target.value = ""))} />
            <button
              type="button"
              title="Anexar print ou PDF (também dá para colar com Ctrl+V ou arrastar)"
              aria-label="Anexar print ou PDF"
              disabled={!!busy || toSend.length >= ATTACH_MAX_PER_MESSAGE}
              onClick={() => picker.current?.click()}
              className="btn-ghost px-2.5 disabled:opacity-40"
            >
              <Paperclip size={16} />
            </button>
            <textarea
              value={text}
              rows={2}
              onChange={(e) => setText(e.target.value)}
              onPaste={(e) => {
                const f = [...e.clipboardData.files];
                if (f.length) {
                  e.preventDefault();
                  upload(f);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="ex. Minha pós tem 12 matérias e termina em junho (cole um print da grade com Ctrl+V)"
              className="flex-1 resize-none"
            />
            <button type="submit" disabled={(!text.trim() && !toSend.length) || !!busy || pending} aria-label="Enviar" className="btn-neon px-3 disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function AttachmentChip({ a, id }: { a?: Attachment; id: string }) {
  const url = `/api/estudos/anexos?id=${id}`;
  if (a?.mime.startsWith("image/"))
    return (
      <a href={url} target="_blank" rel="noreferrer" title={a.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={a.name} className="h-16 w-16 rounded-md border border-border object-cover" />
      </a>
    );
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[12px] hover:border-accent">
      <FileText size={13} className="text-accent-2" />
      <span className="max-w-40 truncate">{a?.name ?? "anexo"}</span>
    </a>
  );
}
