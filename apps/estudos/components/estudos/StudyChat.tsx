"use client";

import type { Trail } from "@sdp/study";
import { kindOf } from "@sdp/study";
import { Loader2, MessageCircle, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { TrailSummary, json } from "./Study";

interface Msg {
  role: "user" | "assistant";
  text: string;
  trail?: Trail | null;
  action?: "none" | "add_trail" | "replan";
  /** Já adicionada à central / cronograma já refeito. */
  used?: boolean;
}

const HELLO: Msg = {
  role: "assistant",
  text: "Oi! Me conta o que você quer encaixar nos estudos: a sua pós, uma certificação, um livro, um curso. Também posso refazer o cronograma se a sua semana mudou.",
};
const IDEAS = ["Estou fazendo uma pós em arquitetura de software", "Quero tirar a certificação AWS Solutions Architect Associate", "Vou ler Designing Data-Intensive Applications", "Semana que vem tenho pouco tempo, refaz o cronograma"];

/** A conversa com a IA fica salva neste navegador, por perfil. */
const key = (profileId: string) => `sdp-conversa-${profileId}`;

export function StudyChat({ profileId, onClose, onChanged }: { profileId: string; onClose(): void; onChanged(): void }) {
  const [msgs, setMsgs] = useState<Msg[]>([HELLO]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<"" | "chat" | "plan">("");
  const [err, setErr] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key(profileId)) ?? "null");
      if (Array.isArray(saved) && saved.length) setMsgs(saved);
    } catch {}
  }, [profileId]);
  useEffect(() => {
    try {
      localStorage.setItem(key(profileId), JSON.stringify(msgs.slice(-40)));
    } catch {}
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, profileId]);

  async function send(t = text) {
    if (!t.trim() || busy) return;
    const next = [...msgs, { role: "user" as const, text: t.trim() }];
    setMsgs(next);
    setText("");
    setErr("");
    setBusy("chat");
    const r = await fetch("/api/estudos/conversa", json("POST", { messages: next.filter((m) => m !== HELLO).map((m) => ({ role: m.role, text: m.text })) }));
    const b = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) return setErr(b.error ?? "A IA não respondeu.");
    setMsgs([...next, { role: "assistant", text: b.reply, trail: b.trail, action: b.action }]);
    if (b.note) onChanged();
  }

  const mark = (i: number) => setMsgs((m) => m.map((x, k) => (k === i ? { ...x, used: true } : x)));

  async function add(i: number, t: Trail) {
    const r = await fetch("/api/estudos", json("PATCH", { op: "trail-add", trail: t }));
    if (!r.ok) return setErr((await r.json().catch(() => ({}))).error ?? "Não deu para adicionar.");
    mark(i);
    setMsgs((m) => [...m, { role: "assistant", text: `Pronto, "${t.title}" está nas suas trilhas. Quer que eu refaça o cronograma agora para encaixar?`, action: "replan" }]);
    onChanged();
  }

  async function replan(i: number) {
    setBusy("plan");
    setErr("");
    const r = await fetch("/api/estudos/cronograma", { method: "POST" });
    const b = await r.json().catch(() => ({}));
    setBusy("");
    if (!r.ok) return setErr(b.error ?? "Não deu para refazer o cronograma.");
    mark(i);
    setMsgs((m) => [...m, { role: "assistant", text: b.schedule?.notes ? `Cronograma refeito. ${b.schedule.notes}` : "Cronograma refeito." }]);
    onChanged();
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside className="flex h-full w-full max-w-lg flex-col border-l border-border bg-bg" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Conversa com a IA">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 font-semibold">
            <MessageCircle size={16} className="text-accent-2" /> Conversar com a IA
          </span>
          <div className="flex items-center gap-3">
            <button onClick={() => setMsgs([HELLO])} className="text-[12px] text-muted underline hover:text-text">
              nova conversa
            </button>
            <button aria-label="Fechar" onClick={onClose} className="text-muted hover:text-text">
              <X size={18} />
            </button>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-3">
            {msgs.map((m, i) => (
              <div key={i} className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div className={`max-w-[90%] whitespace-pre-wrap rounded-lg px-3 py-2 text-[14px] ${m.role === "user" ? "bg-accent/15 text-text" : "panel"}`}>{m.text}</div>
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
                    <button disabled={m.used} onClick={() => add(i, m.trail!)} className="btn-neon mt-2 px-3 py-1.5 text-xs disabled:opacity-40">
                      {m.used ? "Adicionada ✓" : "Adicionar à central ▶"}
                    </button>
                  </div>
                )}
                {m.action === "replan" && !m.trail && (
                  <button disabled={m.used || !!busy} onClick={() => replan(i)} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40">
                    {busy === "plan" ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    {m.used ? "Cronograma refeito ✓" : "Refazer o cronograma agora"}
                  </button>
                )}
              </div>
            ))}
            {busy === "chat" && (
              <div className="flex items-center gap-2 text-[12px] text-muted">
                <Loader2 size={12} className="animate-spin" /> pensando… (pode buscar na web, leva até 1 minuto)
              </div>
            )}
            {busy === "plan" && <div className="text-[12px] text-muted">Refazendo o cronograma (1 a 3 minutos)…</div>}
            {err && <div className="text-[12px] text-down">{err}</div>}
            <div ref={end} />
          </div>
          {msgs.length === 1 && (
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
          className="flex gap-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            value={text}
            rows={2}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="ex. Minha pós tem 12 matérias e termina em junho"
            className="flex-1 resize-none"
          />
          <button type="submit" disabled={!text.trim() || !!busy} aria-label="Enviar" className="btn-neon px-3 disabled:opacity-40">
            <Send size={16} />
          </button>
        </form>
      </aside>
    </div>
  );
}
