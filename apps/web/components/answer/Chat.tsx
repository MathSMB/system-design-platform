"use client";

import { MessageCircle, UserRound } from "lucide-react";

/** Balão de conversa: entrevistador à esquerda, você à direita. */
export function Bubble({ children, me, who }: { children: React.ReactNode; me?: boolean; who?: string }) {
  return (
    <div className={`pop-in flex gap-2 text-[13px] leading-relaxed ${me ? "flex-row-reverse text-right" : ""}`}>
      <span className={`mt-0.5 shrink-0 self-start rounded-full border p-1 ${me ? "border-accent text-accent" : "border-accent-2 text-accent-2"}`}>
        {me ? <MessageCircle size={12} /> : <UserRound size={12} />}
      </span>
      <div className={`whitespace-pre-wrap rounded-md border px-2.5 py-1.5 text-left ${me ? "border-accent/40 bg-accent/5" : "border-accent-2/40 bg-accent-2/5"}`}>
        {who && <div className="mb-0.5 font-mono text-[10px] uppercase tracking-wider text-muted">{who}</div>}
        {children}
      </div>
    </div>
  );
}
