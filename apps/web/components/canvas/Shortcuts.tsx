"use client";

import { useReactFlow } from "@xyflow/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Keyboard } from "lucide-react";
import { useCanvas } from "./store";

export const SHORTCUTS: [string, string][] = [
  ["Ctrl + Z", "Desfazer"],
  ["Ctrl + Y  ·  Ctrl + Shift + Z", "Refazer"],
  ["Ctrl + C  /  Ctrl + V", "Copiar e colar componentes (com as configurações e as conexões entre eles)"],
  ["Ctrl + D", "Duplicar o que está selecionado"],
  ["Ctrl + A", "Selecionar tudo"],
  ["Shift + arrastar", "Selecionar vários com um retângulo"],
  ["Ctrl + clique", "Somar à seleção"],
  ["Delete  ·  Backspace", "Apagar o selecionado"],
  ["Ctrl + Enter", "Simular"],
  ["F", "Enquadrar o desenho na tela"],
  ["?", "Mostrar esta lista"],
];

function typing(t: EventTarget | null) {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

/** Atalhos de teclado do canvas. Fica dentro do ReactFlowProvider. */
export function useCanvasShortcuts(run: () => void, toast: (msg: string) => void, openHelp: () => void) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || document.querySelector("[role=dialog][aria-modal=true]")) return;
      const s = useCanvas.getState();
      const mod = e.ctrlKey || e.metaKey;
      const k = e.key.toLowerCase();
      if (mod && k === "z" && !e.shiftKey) {
        e.preventDefault();
        if (s.past.length) {
          s.undo();
          toast("Desfeito");
        } else toast("Nada para desfazer");
      } else if (mod && (k === "y" || (k === "z" && e.shiftKey))) {
        e.preventDefault();
        if (s.future.length) {
          s.redo();
          toast("Refeito");
        } else toast("Nada para refazer");
      } else if (mod && k === "c") {
        const n = s.copySelection();
        if (n) toast(`${n} componente${n > 1 ? "s" : ""} copiado${n > 1 ? "s" : ""}`);
      } else if (mod && k === "v") {
        e.preventDefault();
        const n = s.paste();
        if (n) toast(`${n} colado${n > 1 ? "s" : ""}`);
      } else if (mod && k === "d") {
        e.preventDefault();
        const n = s.duplicateSelection();
        toast(n ? `${n} duplicado${n > 1 ? "s" : ""}` : "Selecione um componente para duplicar");
      } else if (mod && k === "a") {
        e.preventDefault();
        s.selectAll();
      } else if (mod && k === "enter") {
        e.preventDefault();
        if (!s.running) run();
      } else if (!mod && !e.altKey && k === "f") {
        void fitView({ padding: 0.15, duration: 300, maxZoom: 1.1 });
      } else if (e.key === "?") {
        openHelp();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, toast, openHelp, fitView]);
}

export function ShortcutsHelp({ open, onClose }: { open: boolean; onClose(): void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(2,3,8,0.75)] p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="panel pop-in w-full max-w-lg border-accent p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-[11px] text-accent glow">
            <Keyboard size={16} /> Atalhos
          </span>
          <button onClick={onClose} className="text-xs text-muted hover:text-text">Fechar ✕</button>
        </div>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {SHORTCUTS.map(([k, v]) => (
              <tr key={k} className="border-t border-border/60">
                <td className="whitespace-nowrap py-1.5 pr-4 font-mono text-xs text-accent">{k}</td>
                <td className="py-1.5 text-muted">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>,
    document.body,
  );
}

/** Aviso rápido no rodapé do canvas ("Desfeito", "2 colados"…). */
export function useToast() {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 1400);
    return () => clearTimeout(t);
  }, [msg]);
  return { msg, show: (text: string) => setMsg({ text, key: Date.now() }) };
}
