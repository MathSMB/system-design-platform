"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookA, Cpu, HelpCircle, Lightbulb, MessageSquareQuote, Search, X } from "lucide-react";
import { create } from "zustand";
import { RefList } from "@/components/training/RefList";
import { CATEGORIES, GLOSSARY, glossaryEntry, searchGlossary, splitTerms, type GlossaryEntry } from "@/lib/glossary";

/** Painel "Saber mais": um termo aberto por vez, com histórico para voltar. */
export const useGlossary = create<{ open: boolean; stack: string[]; show(id?: string): void; back(): void; close(): void }>((set) => ({
  open: false,
  stack: [],
  show: (id) => set((s) => ({ open: true, stack: id ? [...(s.open ? s.stack : []), id] : s.open ? s.stack : [] })),
  back: () => set((s) => ({ stack: s.stack.slice(0, -1) })),
  close: () => set({ open: false, stack: [] }),
}));

/** Botão "?" ao lado de um campo, métrica ou título. */
export function HelpDot({ id, label }: { id: string; label?: string }) {
  const show = useGlossary((s) => s.show);
  const e = glossaryEntry(id);
  if (!e) return null;
  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        show(id);
      }}
      title={`O que é ${label ?? e.term}?`}
      aria-label={`O que é ${label ?? e.term}?`}
      className="inline-flex shrink-0 items-center text-muted transition-colors hover:text-accent"
    >
      <HelpCircle size={13} />
    </button>
  );
}

/** Texto com os termos do glossário clicáveis (só a primeira menção de cada um). */
export function Glossed({ text, seen }: { text: string; seen?: Set<string> }) {
  const show = useGlossary((s) => s.show);
  const pieces = useMemo(() => splitTerms(text, seen ?? new Set()), [text, seen]);
  return (
    <>
      {pieces.map((p, k) =>
        typeof p === "string" ? (
          p
        ) : (
          <button
            key={k}
            type="button"
            onClick={() => show(p.id)}
            title="Saber mais"
            className="cursor-help border-b border-dotted border-accent/70 text-inherit transition-colors hover:text-accent"
          >
            {p.text}
          </button>
        ),
      )}
    </>
  );
}

/** Botão que abre o glossário (no cabeçalho e na barra do canvas). */
export function GlossaryButton({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  const show = useGlossary((s) => s.show);
  return (
    <button type="button" onClick={() => show()} title="Glossário: o que é cada termo" className={className}>
      {children ?? <BookA size={18} />}
    </button>
  );
}

export function GlossaryDrawer() {
  const { open, stack, back, close } = useGlossary();
  const current = stack.length ? glossaryEntry(stack[stack.length - 1]!) : undefined;
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [current]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1100] flex justify-end bg-[rgba(2,3,8,0.55)]" onClick={close} role="dialog" aria-modal="true" aria-label="Glossário">
      <div ref={scroller} className="panel slide-in h-full w-full max-w-xl overflow-y-auto rounded-none border-y-0 border-r-0 border-accent/60 !bg-bg p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between gap-2">
          {current ? (
            <button onClick={back} className="flex items-center gap-1 text-xs text-muted hover:text-accent">
              <ArrowLeft size={14} /> {stack.length > 1 ? "Voltar" : "Todos os termos"}
            </button>
          ) : (
            <span className="flex items-center gap-2 font-display text-[11px] text-accent glow">
              <BookA size={16} /> Glossário
            </span>
          )}
          <button onClick={close} className="flex items-center gap-1 text-xs text-muted hover:text-text">
            Fechar <X size={14} />
          </button>
        </div>
        {current ? <EntryView e={current} /> : <EntryList />}
      </div>
    </div>
  );
}

export function EntryList({ inPage }: { inPage?: boolean }) {
  const [q, setQ] = useState("");
  const show = useGlossary((s) => s.show);
  const results = useMemo(() => searchGlossary(q), [q]);
  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-center gap-2 rounded-md border border-border bg-bg/60 px-2.5 py-1.5 focus-within:border-accent">
        <Search size={15} className="text-muted" />
        <input
          autoFocus={!inPage}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar: p99, cache, deadlock, workers…"
          className="w-full !border-0 !bg-transparent !p-0 text-sm outline-none"
        />
      </label>
      {q.trim() ? (
        <ul className="flex flex-col gap-1">
          {results.length === 0 && <li className="text-sm text-muted">Nada encontrado.</li>}
          {results.map((e) => (
            <EntryRow key={e.id} e={e} onClick={() => show(e.id)} />
          ))}
        </ul>
      ) : (
        CATEGORIES.map((c) => (
          <div key={c}>
            <div className="mb-1.5 hud-label">{c}</div>
            <ul className={`grid gap-1 ${inPage ? "md:grid-cols-2" : ""}`}>
              {GLOSSARY.filter((e) => e.category === c).map((e) => (
                <EntryRow key={e.id} e={e} onClick={() => show(e.id)} />
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}

function EntryRow({ e, onClick }: { e: GlossaryEntry; onClick(): void }) {
  return (
    <li>
      <button onClick={onClick} className="w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-accent/40 hover:bg-accent/5">
        <div className="text-sm text-text">{e.term}</div>
        <div className="text-xs leading-snug text-muted">{e.short}</div>
      </button>
    </li>
  );
}

function EntryView({ e }: { e: GlossaryEntry }) {
  const show = useGlossary((s) => s.show);
  // não cria link para o próprio termo
  const seen = useMemo(() => new Set([e.id]), [e.id]);
  return (
    <article className="pop-in flex flex-col gap-4 text-sm leading-relaxed">
      <div>
        <div className="hud-label">{e.category}</div>
        <h2 className="mt-2 font-display text-[13px] leading-relaxed text-accent glow">{e.term}</h2>
        <p className="mt-2 text-[15px] text-text">{e.short}</p>
      </div>
      {e.body.map((p, k) => (
        <p key={k} className="text-text/85">
          <Glossed text={p} seen={seen} />
        </p>
      ))}
      {e.example && (
        <Box icon={<Lightbulb size={14} />} title="Exemplo">
          <Glossed text={e.example} seen={seen} />
        </Box>
      )}
      {e.interview && (
        <Box icon={<MessageSquareQuote size={14} />} title="Na entrevista">
          <Glossed text={e.interview} seen={seen} />
        </Box>
      )}
      {e.sim && (
        <Box icon={<Cpu size={14} />} title="No simulador">
          <Glossed text={e.sim} seen={seen} />
        </Box>
      )}
      {e.related && e.related.length > 0 && (
        <div>
          <div className="mb-1.5 hud-label">Termos relacionados</div>
          <div className="flex flex-wrap gap-1.5">
            {e.related.map((id) => {
              const r = glossaryEntry(id);
              return r ? (
                <button key={id} onClick={() => show(id)} className="btn-ghost px-2 py-0.5 text-xs">
                  {r.term}
                </button>
              ) : null;
            })}
          </div>
        </div>
      )}
      {e.refs && e.refs.length > 0 && (
        <div>
          <div className="mb-1.5 hud-label">Para se aprofundar</div>
          <RefList refs={e.refs} />
        </div>
      )}
    </article>
  );
}

function Box({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-bg/50 p-3">
      <div className="mb-1 flex items-center gap-1.5 hud-label !text-accent-2">
        {icon} {title}
      </div>
      <div className="text-text/90">{children}</div>
    </div>
  );
}
