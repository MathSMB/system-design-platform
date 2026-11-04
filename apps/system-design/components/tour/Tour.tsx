"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface TourStep {
  /** Valor do atributo data-tour do elemento destacado. Sem alvo, o card aparece no centro. */
  target?: string;
  title: string;
  body: string;
}

const PAD = 8;
const CARD_W = 340;

function readStorage(key: string): boolean {
  try {
    return localStorage.getItem(key) === "done";
  } catch {
    return false;
  }
}
function writeStorage(key: string) {
  try {
    localStorage.setItem(key, "done");
  } catch {
    /* navegador sem storage: o convite volta na próxima visita */
  }
}

/**
 * Tour guiado: escurece a tela, deixa só o elemento da etapa aceso e mostra um card com a explicação.
 * Na primeira visita pergunta se a pessoa quer fazer o tour ou pular.
 */
export function Tour({ steps, storageKey, open, onClose }: { steps: TourStep[]; storageKey: string; open: boolean; onClose(): void }) {
  const [phase, setPhase] = useState<"idle" | "invite" | "running">("idle");
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [vw, setVw] = useState({ w: 1280, h: 800 });

  // primeira visita: convida; "open" força o tour (botão ou ?tour=1)
  useEffect(() => {
    if (open) {
      setI(0);
      setPhase("running");
    } else if (!readStorage(storageKey)) setPhase("invite");
  }, [open, storageKey]);

  const step = steps[i];
  const measure = useCallback(() => {
    setVw({ w: window.innerWidth, h: window.innerHeight });
    const el = step?.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
    if (el) el.scrollIntoView({ block: "nearest" });
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  useLayoutEffect(() => {
    if (phase !== "running") return;
    measure();
    window.addEventListener("resize", measure);
    const t = setInterval(measure, 400); // o layout pode mudar (painéis carregando)
    return () => {
      window.removeEventListener("resize", measure);
      clearInterval(t);
    };
  }, [phase, measure]);

  const finish = useCallback(() => {
    writeStorage(storageKey);
    setPhase("idle");
    onClose();
  }, [storageKey, onClose]);

  useEffect(() => {
    if (phase === "idle") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (phase === "running" && e.key === "ArrowRight") setI((x) => Math.min(steps.length - 1, x + 1));
      if (phase === "running" && e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, finish, steps.length]);

  if (phase === "idle" || typeof document === "undefined") return null;

  if (phase === "invite") {
    return createPortal(
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgba(2,3,8,0.78)] p-4 backdrop-blur-[2px]">
        <div className="panel pop-in w-full max-w-md border-accent p-6 shadow-[0_0_40px_rgba(34,228,255,0.25)]">
          <div className="hud-label">// primeira vez aqui?</div>
          <h2 className="mt-3 font-display text-base leading-relaxed text-accent glow">Tour rápido</h2>
          <p className="mt-3 text-sm text-muted">
            Em {steps.length} passos você vê onde ficam os componentes, como conectar, simular, derrubar um servidor e ler o resultado.
            Leva menos de um minuto.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={finish} className="btn-ghost px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">Pular</button>
            <button
              onClick={() => {
                setI(0);
                setPhase("running");
              }}
              className="btn-neon px-4 py-1.5 text-xs"
            >
              ▶ Começar tour
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  // card ao lado do alvo: direita, esquerda, abaixo ou acima, o que couber
  let cardStyle: React.CSSProperties = { left: vw.w / 2 - CARD_W / 2, top: vw.h / 2 - 100 };
  if (rect) {
    const right = rect.right + PAD + 16;
    const left = rect.left - PAD - 16 - CARD_W;
    const clampTop = Math.min(Math.max(12, rect.top), vw.h - 230);
    if (right + CARD_W < vw.w - 12) cardStyle = { left: right, top: clampTop };
    else if (left > 12) cardStyle = { left, top: clampTop };
    else {
      const below = rect.bottom + PAD + 16;
      const cx = Math.min(Math.max(12, rect.left + rect.width / 2 - CARD_W / 2), vw.w - CARD_W - 12);
      cardStyle = below + 200 < vw.h ? { left: cx, top: below } : { left: cx, top: Math.max(12, rect.top - PAD - 216) };
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[1000]" role="dialog" aria-modal="true" aria-label={step?.title}>
      {/* clique fora não fecha: evita perder o tour sem querer */}
      <div className="absolute inset-0" />
      {rect ? (
        <div
          className="tour-spot pointer-events-none absolute rounded-lg border-2 border-accent transition-all duration-300 ease-out"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div className="absolute inset-0 bg-[rgba(2,3,8,0.78)]" />
      )}
      <div key={i} className="panel pop-in absolute border-accent p-4 shadow-[0_0_30px_rgba(34,228,255,0.25)]" style={{ ...cardStyle, width: CARD_W }}>
        <div className="flex items-center justify-between">
          <span className="hud-label">
            passo {i + 1}/{steps.length}
          </span>
          <button onClick={finish} className="text-[11px] uppercase tracking-wider text-muted hover:text-text">Pular tour ✕</button>
        </div>
        <div className="mt-2 font-semibold text-accent">{step?.title}</div>
        <p className="mt-1 text-sm leading-relaxed text-muted">{step?.body}</p>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex gap-1">
            {steps.map((_, k) => (
              <span key={k} className={`h-1.5 w-3 rounded-full ${k === i ? "bg-accent shadow-[0_0_6px_var(--accent)]" : k < i ? "bg-accent/40" : "bg-border"}`} />
            ))}
          </div>
          <div className="flex gap-2">
            {i > 0 && (
              <button onClick={() => setI(i - 1)} className="btn-ghost px-2.5 py-1 text-xs">
                Voltar
              </button>
            )}
            {i < steps.length - 1 ? (
              <button onClick={() => setI(i + 1)} className="btn-neon whitespace-nowrap px-3 py-1 text-xs">
                Próximo ▶
              </button>
            ) : (
              <button onClick={finish} className="btn-neon px-3 py-1 text-xs">
                Bora treinar!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
