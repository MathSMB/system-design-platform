"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, CircleX, GraduationCap, PlayCircle, Trophy } from "lucide-react";
import type { SimResult } from "@sdp/sim-engine";
import { useCanvas } from "@/components/canvas/store";
import { CASES } from "@/lib/training/cases";
import type { CheckOutcome, GuidedCase, Step } from "@/lib/training/types";
import { readBoard } from "./useBoard";

const KEY = (id: string) => `sdp-case-${id}`;
function loadProgress(id: string): number {
  try {
    return Number(localStorage.getItem(KEY(id)) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function saveProgress(id: string, step: number) {
  try {
    localStorage.setItem(KEY(id), String(step));
  } catch {
    /* sem storage: o progresso só não é lembrado */
  }
}

const fmt = (x: number) => x.toLocaleString("pt-BR", { maximumFractionDigits: x < 100 ? 1 : 0 });

/** Painel do mentor: conduz o case etapa por etapa, pergunta, confere e ensina. */
export function Coach({ c }: { c: GuidedCase }) {
  const [i, setI] = useState(0);
  const [passed, setPassed] = useState<boolean[]>(() => c.steps.map(() => false));
  const done = i >= c.steps.length;

  useEffect(() => {
    const saved = Math.min(loadProgress(c.id), c.steps.length);
    setI(saved);
    setPassed(c.steps.map((_, k) => k < saved));
  }, [c]);

  const go = (k: number) => {
    setI(k);
    if (k > loadProgress(c.id)) saveProgress(c.id, k);
  };
  const markPassed = () => setPassed((p) => p.map((x, k) => (k === i ? true : x)));

  const next = CASES[CASES.findIndex((x) => x.id === c.id) + 1];

  return (
    <div className="flex flex-col gap-3" data-tour="coach">
      <div className="flex items-center gap-2">
        <GraduationCap size={16} className="text-accent-2" />
        <span className="hud-label !text-accent-2">Case guiado · {c.level}</span>
      </div>
      <h1 className="font-display text-[11px] leading-relaxed text-accent glow">{c.title}</h1>
      {c.video && (
        <a
          href={`https://www.youtube.com/watch?v=${c.video.id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted hover:text-accent"
        >
          <PlayCircle size={14} /> Vídeo do Renato Augusto: {c.video.title}
        </a>
      )}

      {/* barra de progresso estilo fase de jogo */}
      <div className="flex gap-1">
        {c.steps.map((_, k) => (
          <button
            key={k}
            title={`Etapa ${k + 1}`}
            disabled={k > i && !passed[k - 1]}
            onClick={() => go(k)}
            className={`h-1.5 flex-1 rounded-full transition-colors ${k === i ? "bg-accent shadow-[0_0_6px_var(--accent)]" : passed[k] ? "bg-ok/70" : "bg-border"}`}
          />
        ))}
      </div>

      {done ? (
        <div className="panel pop-in flex flex-col items-center gap-3 p-4 text-center">
          <Trophy size={36} className="text-warn" style={{ filter: "drop-shadow(0 0 8px var(--warn))" }} />
          <div className="font-display text-[11px] leading-relaxed text-warn glow">Case concluído!</div>
          <p className="text-sm text-muted">Agora tente sem ajuda: o modo Desafio sorteia um problema e só mostra o enunciado.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {next && (
              <Link href={`/treinos/${next.id}`} className="btn-neon px-3 py-1.5 text-xs">
                Próximo case ▶
              </Link>
            )}
            <Link href="/desafio" className="btn-ghost px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
              Desafio sorteado
            </Link>
            <button onClick={() => go(0)} className="btn-ghost px-3 py-1.5 text-xs">
              Refazer
            </button>
          </div>
        </div>
      ) : (
        <StepView key={`${c.id}-${i}`} step={c.steps[i]!} index={i} total={c.steps.length} passed={passed[i]!} onPass={markPassed} />
      )}

      {!done && (
        <div className="flex justify-between">
          <button onClick={() => go(Math.max(0, i - 1))} disabled={i === 0} className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs disabled:opacity-30">
            <ChevronLeft size={14} /> Voltar
          </button>
          <button
            onClick={() => go(i + 1)}
            disabled={!passed[i]}
            className="btn-neon flex items-center gap-1 px-3 py-1 text-xs disabled:opacity-30 disabled:shadow-none"
          >
            {i === c.steps.length - 1 ? "Concluir" : "Próxima"} <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

function StepView({ step, index, total, passed, onPass }: { step: Step; index: number; total: number; passed: boolean; onPass(): void }) {
  return (
    <div className="panel pop-in flex flex-col gap-2 p-3 text-sm">
      <div className="hud-label">
        etapa {index + 1}/{total}
      </div>
      <div className="font-semibold text-text">{step.title}</div>
      <p className="leading-relaxed text-muted">{step.body}</p>
      {step.type === "info" && <InfoStep onPass={onPass} passed={passed} />}
      {step.type === "choice" && <ChoiceStep step={step} passed={passed} onPass={onPass} />}
      {step.type === "number" && <NumberStep step={step} passed={passed} onPass={onPass} />}
      {step.type === "build" && <BuildStep step={step} passed={passed} onPass={onPass} />}
      {step.type === "open" && <OpenStep step={step} passed={passed} onPass={onPass} />}
    </div>
  );
}

function Lesson({ text }: { text: string }) {
  return (
    <div className="pop-in mt-1 rounded-md border border-accent/40 bg-accent/5 p-2 text-[13px] leading-relaxed text-text">
      <span className="font-semibold text-accent">Mentor: </span>
      {text}
    </div>
  );
}

function InfoStep({ passed, onPass }: { passed: boolean; onPass(): void }) {
  useEffect(() => {
    if (!passed) onPass();
  }, [passed, onPass]);
  return null;
}

function ChoiceStep({ step, passed, onPass }: { step: Extract<Step, { type: "choice" }>; passed: boolean; onPass(): void }) {
  const [tried, setTried] = useState<number[]>(() => (passed ? [step.choices.findIndex((c) => c.correct)] : []));
  const last = tried[tried.length - 1];
  return (
    <div className="flex flex-col gap-1.5">
      {step.choices.map((ch, k) => {
        const picked = tried.includes(k);
        const style = picked ? (ch.correct ? "border-ok text-ok bg-ok/10" : "border-down/70 text-down/90 bg-down/5 line-through") : "";
        return (
          <button
            key={k}
            disabled={picked || passed}
            onClick={() => {
              setTried([...tried, k]);
              if (ch.correct) onPass();
            }}
            className={`btn-ghost px-2 py-1.5 text-left text-[13px] ${style}`}
          >
            <span className="mr-1.5 font-mono text-[11px] text-muted">{String.fromCharCode(65 + k)}</span>
            {ch.text}
          </button>
        );
      })}
      {last !== undefined && (
        <div className={`pop-in flex gap-1.5 text-[13px] ${step.choices[last]!.correct ? "text-ok" : "text-down"}`}>
          {step.choices[last]!.correct ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <CircleX size={16} className="mt-0.5 shrink-0" />}
          <span>{step.choices[last]!.why}</span>
        </div>
      )}
      {passed && <Lesson text={step.lesson} />}
    </div>
  );
}

function NumberStep({ step, passed, onPass }: { step: Extract<Step, { type: "number" }>; passed: boolean; onPass(): void }) {
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [msg, setMsg] = useState<string | null>(null);
  const check = () => {
    const v = Number(value.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(v)) return setMsg("Digite um número.");
    setAttempts((a) => a + 1);
    if (Math.abs(v - step.answer) <= step.answer * step.tolerance) {
      setMsg(null);
      onPass();
    } else setMsg(v < step.answer ? "Está baixo. Refaça a conta com calma." : "Está alto. Refaça a conta com calma.");
  };
  return (
    <div className="flex flex-col gap-1.5">
      {!passed && (
        <div className="flex items-center gap-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && check()}
            placeholder="sua conta"
            className="w-32"
            inputMode="decimal"
          />
          <span className="text-xs text-muted">{step.unit}</span>
          <button onClick={check} className="btn-neon ml-auto px-2.5 py-1 text-xs">
            Conferir
          </button>
        </div>
      )}
      {msg && <div className="text-[13px] text-down">{msg}</div>}
      {!passed && attempts >= 2 && (
        <button onClick={onPass} className="self-start text-xs text-muted underline hover:text-accent">
          Ver a resposta
        </button>
      )}
      {passed && (
        <>
          <div className="pop-in flex items-center gap-1.5 text-[13px] text-ok">
            <CheckCircle2 size={16} /> ≈ {fmt(step.answer)} {step.unit}
          </div>
          <Lesson text={step.lesson} />
        </>
      )}
    </div>
  );
}

function BuildStep({ step, passed, onPass }: { step: Extract<Step, { type: "build" }>; passed: boolean; onPass(): void }) {
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  // resultado que existia quando a etapa começou, para comparar antes e depois
  const before = useRef<SimResult | null>(useCanvas.getState().result);
  const result = useCanvas((s) => s.result);
  const resultVersion = useCanvas((s) => s.resultVersion);

  const verify = (silent = false) => {
    const o = step.check(readBoard(before.current));
    if (o.ok) onPass();
    if (!silent || o.ok) setOutcome(o);
  };

  // confere sozinho quando chega um resultado novo
  useEffect(() => {
    if (!passed && result) verify(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, resultVersion]);

  return (
    <div className="flex flex-col gap-1.5">
      <ul className="flex flex-col gap-1">
        {step.tasks.map((t) => (
          <li key={t} className="flex gap-1.5 text-[13px] text-text">
            <span className={passed ? "text-ok" : "text-accent"}>{passed ? "✓" : "▸"}</span>
            {t}
          </li>
        ))}
      </ul>
      {!passed && (
        <button onClick={() => verify()} className="btn-neon self-start px-2.5 py-1 text-xs">
          Verificar
        </button>
      )}
      {outcome && !outcome.ok && <div className="pop-in text-[13px] text-down">{outcome.hint}</div>}
      {passed && (
        <>
          <div className="pop-in flex items-center gap-1.5 text-[13px] text-ok">
            <CheckCircle2 size={16} /> Feito!
          </div>
          <Lesson text={step.lesson} />
        </>
      )}
    </div>
  );
}

function OpenStep({ step, passed, onPass }: { step: Extract<Step, { type: "open" }>; passed: boolean; onPass(): void }) {
  const [text, setText] = useState("");
  return (
    <div className="flex flex-col gap-1.5">
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva como você responderia na entrevista…" />
      {!passed && (
        <button onClick={onPass} disabled={text.trim().length < 10} className="btn-neon self-start px-2.5 py-1 text-xs disabled:opacity-40">
          Comparar com a referência
        </button>
      )}
      {passed && <Lesson text={step.reference} />}
    </div>
  );
}
