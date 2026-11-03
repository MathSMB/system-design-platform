"use client";

import type { Option } from "@sdp/hiring";
import { CheckCircle2, CircleAlert, CircleX, MessageCircle, UserRound } from "lucide-react";

/** Balão de conversa: entrevistador à esquerda, você à direita. */
export function Bubble({ children, me, who }: { children: React.ReactNode; me?: boolean; who?: string }) {
  return (
    <div className={`pop-in flex gap-2 text-[13px] leading-relaxed ${me ? "flex-row-reverse text-right" : ""}`}>
      <span className={`mt-0.5 shrink-0 self-start rounded-full border p-1 ${me ? "border-accent text-accent" : "border-accent-2 text-accent-2"}`}>
        {me ? <MessageCircle size={12} /> : <UserRound size={12} />}
      </span>
      <div className={`rounded-md border px-2.5 py-1.5 ${me ? "border-accent/40 bg-accent/5" : "border-accent-2/40 bg-accent-2/5"}`}>
        {who && <div className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">{who}</div>}
        {children}
      </div>
    </div>
  );
}

/** Alternativas A, B, C... */
export function Choices({ options, onPick }: { options: Option[]; onPick(o: Option): void }) {
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((o, k) => (
        <button key={o.text} onClick={() => onPick(o)} className="btn-ghost px-2.5 py-1.5 text-left text-[13px]">
          <span className="mr-1.5 font-mono text-[11px] text-muted">{String.fromCharCode(65 + k)}</span>
          {o.text}
        </button>
      ))}
    </div>
  );
}

const ICON = { pleno: CheckCircle2, livro: CircleAlert, errada: CircleX };
const COLOR = { pleno: "text-ok", livro: "text-warn", errada: "text-down" };
const LABEL = { pleno: "Resposta de pleno", livro: "Certa, mas rasa", errada: "Errada" };

/** Comentário sobre a resposta escolhida e, se não foi a melhor, qual seria. */
export function Verdict({ picked, options, title }: { picked: Option; options: Option[]; title?: string }) {
  const Icon = ICON[picked.level];
  const best = options.find((o) => o.level === "pleno");
  return (
    <div className="panel pop-in flex flex-col gap-1 p-2.5 text-[13px]">
      <div className={`flex items-center gap-1.5 ${COLOR[picked.level]}`}>
        <Icon size={14} /> {title ? `${title} · ` : ""}
        {LABEL[picked.level]}
      </div>
      <div className="text-muted">{picked.why}</div>
      {picked.level !== "pleno" && best && <div>Melhor resposta: {best.text}</div>}
    </div>
  );
}

/** Embaralha de forma estável (a mesma pergunta sempre com a mesma ordem). */
export function stableShuffle<T>(list: readonly T[], key: string): T[] {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
