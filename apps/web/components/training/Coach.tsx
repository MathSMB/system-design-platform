"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Calculator, CheckCircle2, ChevronLeft, ChevronRight, CircleX, Cpu, GraduationCap, LifeBuoy, MessageSquareQuote, PlayCircle, RotateCcw, Trophy, Undo2 } from "lucide-react";
import { Glossed } from "@/components/glossary/Glossary";
import type { SimResult } from "@sdp/sim-engine";
import { useCanvas, type Snapshot } from "@/components/canvas/store";
import { CASES } from "@/lib/training/cases";
import type { CheckOutcome, GuidedCase, Ref, Step } from "@/lib/training/types";
import { RefList } from "./RefList";
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
export function Coach({ c, onRestart }: { c: GuidedCase; onRestart(): void }) {
  const [i, setI] = useState(0);
  // desenho de quando cada etapa começou, para o "Reiniciar desenho"
  const snaps = useRef(new Map<number, Snapshot>());
  const [passed, setPassed] = useState<boolean[]>(() => c.steps.map(() => false));
  const done = i >= c.steps.length;

  useEffect(() => {
    const saved = Math.min(loadProgress(c.id), c.steps.length);
    setI(saved);
    setPassed(c.steps.map((_, k) => k < saved));
  }, [c]);

  const go = (k: number) => {
    if (!snaps.current.has(k)) snaps.current.set(k, useCanvas.getState().snapshot());
    setI(k);
    if (k > loadProgress(c.id)) saveProgress(c.id, k);
  };
  const resetBoard = () => {
    const snap = snaps.current.get(i);
    if (snap) useCanvas.getState().restore(snap);
    else onRestart(); // etapa aberta direto (progresso salvo): volta ao desenho inicial do case
  };
  // volta a aula inteira: história aberta, etapa 1 e desenho inicial
  const restartLesson = () => {
    snaps.current.clear();
    saveProgress(c.id, 0);
    setPassed(c.steps.map(() => false));
    setI(0);
    onRestart();
    setRun((r) => r + 1);
  };
  const [run, setRun] = useState(0);
  const markPassed = () => setPassed((p) => p.map((x, k) => (k === i ? true : x)));

  const next = CASES[CASES.findIndex((x) => x.id === c.id) + 1];

  return (
    <div className="flex flex-col gap-3" data-tour="coach">
      <div className="flex items-center gap-2">
        <GraduationCap size={16} className="text-accent-2" />
        <span className="hud-label !text-accent-2">Estudo · System Design · {c.level}</span>
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

      {c.story && (
        <details key={run} open={i === 0} className="panel group p-2.5 text-[13px] leading-relaxed text-muted">
          <summary className="cursor-pointer list-none hud-label !text-accent-2">▸ A história</summary>
          <p className="mt-1.5 text-text/90">
            <Glossed text={c.story} />
          </p>
        </details>
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
          <p className="text-sm text-muted">Agora tente sem ajuda: na Entrevista técnica o entrevistador só passa o enunciado.</p>
          <div className="flex flex-wrap justify-center gap-2">
            {next && (
              <Link href={`/estudo/system-design/${next.id}`} className="btn-neon px-3 py-1.5 text-xs">
                Próxima aula ▶
              </Link>
            )}
            <Link href="/entrevista/system-design" className="btn-ghost px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
              Entrevista técnica
            </Link>
            <button onClick={restartLesson} className="btn-ghost px-3 py-1.5 text-xs">
              Refazer a aula
            </button>
          </div>
        </div>
      ) : (
        <StepView key={`${c.id}-${run}-${i}`} step={c.steps[i]!} index={i} total={c.steps.length} passed={passed[i]!} onPass={markPassed} onResetStep={resetBoard} />
      )}

      {done && <WrapUp c={c} />}

      {!done && (
        <div className="flex justify-between">
          <button onClick={() => go(Math.max(0, i - 1))} disabled={i === 0} className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs disabled:opacity-30">
            <ChevronLeft size={14} /> Voltar
          </button>
          <button onClick={restartLesson} title="Volta para o começo da aula: história, etapa 1 e desenho inicial" className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs">
            <RotateCcw size={13} /> Reiniciar aula
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

/** Fechamento da aula: como falar na entrevista, tecnologias e o que estudar. */
function WrapUp({ c }: { c: GuidedCase }) {
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      {c.talk && (
        <Section icon={<MessageSquareQuote size={14} />} title="Como falar na entrevista">
          <ul className="flex flex-col gap-1.5">
            {c.talk.map((t) => (
              <li key={t} className="flex gap-1.5 leading-relaxed text-text">
                <span className="text-accent">“</span>
                {t}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {c.tech && (
        <Section icon={<Cpu size={14} />} title="Tecnologias usadas hoje">
          <div className="flex flex-wrap gap-1.5">
            {c.tech.map((t) => (
              <span key={t} className="rounded border border-border bg-bg/60 px-1.5 py-0.5 font-mono text-[11px] text-text">
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}
      {c.study && (
        <Section icon={<BookOpen size={14} />} title="Para estudar">
          <RefList refs={c.study} />
          <Link href="/bibliografia" className="mt-1 text-xs text-accent hover:underline">
            Bibliografia completa →
          </Link>
        </Section>
      )}
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="panel pop-in flex flex-col gap-2 p-3">
      <div className="flex items-center gap-1.5 hud-label">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}

export { RefList };

function StepView({ step, index, total, passed, onPass, onResetStep }: { step: Step; index: number; total: number; passed: boolean; onPass(): void; onResetStep(): void }) {
  // no Estudo o mentor não pergunta: explica. Só as etapas no canvas pedem ação.
  const explain = step.type !== "build";
  useEffect(() => {
    if (explain && !passed) onPass();
  }, [explain, passed, onPass]);
  return (
    <div className="panel pop-in flex flex-col gap-2 p-3 text-sm">
      <div className="hud-label">
        etapa {index + 1}/{total} {step.type === "build" ? "· mão na massa" : ""}
      </div>
      <div className="font-semibold text-text">{step.title}</div>
      <p className="leading-relaxed text-text/85">
        <Glossed text={step.body} />
      </p>
      {step.type === "choice" && <ChoiceExplain step={step} />}
      {step.type === "number" && <NumberExplain step={step} />}
      {step.type === "open" && <Lesson text={step.reference} title="Como explicar" />}
      {step.type === "build" && <BuildStep step={step} passed={passed} onPass={onPass} onResetStep={onResetStep} />}
    </div>
  );
}

function Lesson({ text, title = "Mentor" }: { text: string; title?: string }) {
  return (
    <div className="pop-in mt-1 rounded-md border border-accent/40 bg-accent/5 p-2.5 text-[13px] leading-relaxed text-text">
      <span className="font-semibold text-accent">{title}: </span>
      <Glossed text={text} />
    </div>
  );
}

/** Antes era pergunta; no Estudo vira explicação: a resposta, o porquê e por que as outras saídas não servem. */
function ChoiceExplain({ step }: { step: Extract<Step, { type: "choice" }> }) {
  const right = step.choices.filter((ch) => ch.correct);
  const wrong = step.choices.filter((ch) => !ch.correct);
  return (
    <div className="flex flex-col gap-2">
      {right.map((ch) => (
        <div key={ch.text} className="pop-in flex gap-2 rounded-md border border-ok/50 bg-ok/5 p-2.5 text-[13px] leading-relaxed">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-ok" />
          <span>
            <span className="font-semibold text-ok">{ch.text}. </span>
            <Glossed text={ch.why.replace(/^Isso\.\s*/, "")} />
          </span>
        </div>
      ))}
      <Lesson text={step.lesson} />
      {wrong.length > 0 && (
        <details className="rounded-md border border-border p-2 text-[13px]">
          <summary className="cursor-pointer text-xs text-muted hover:text-text">E por que não {wrong.length === 1 ? "a outra saída" : `as outras ${wrong.length} saídas`}?</summary>
          <ul className="mt-2 flex flex-col gap-1.5">
            {wrong.map((ch) => (
              <li key={ch.text} className="flex gap-1.5 leading-relaxed">
                <CircleX size={14} className="mt-0.5 shrink-0 text-down/80" />
                <span>
                  <span className="text-text">{ch.text}: </span>
                  <span className="text-muted">
                    <Glossed text={ch.why} />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function NumberExplain({ step }: { step: Extract<Step, { type: "number" }> }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="pop-in flex items-center gap-2 rounded-md border border-accent-2/50 bg-accent-2/5 p-2.5 text-[13px]">
        <Calculator size={16} className="shrink-0 text-accent-2" />
        <span>
          Resultado: <span className="font-mono text-accent-2">≈ {fmt(step.answer)}</span> {step.unit}
        </span>
      </div>
      <Lesson text={step.lesson} title="A conta" />
    </div>
  );
}

function BuildStep({ step, passed, onPass, onResetStep }: { step: Extract<Step, { type: "build" }>; passed: boolean; onPass(): void; onResetStep(): void }) {
  const [outcome, setOutcome] = useState<CheckOutcome | null>(null);
  const [fails, setFails] = useState(0);
  const [help, setHelp] = useState(0);
  // resultado que existia quando a etapa começou, para comparar antes e depois
  const before = useRef<SimResult | null>(useCanvas.getState().result);
  const result = useCanvas((s) => s.result);
  const resultVersion = useCanvas((s) => s.resultVersion);

  const verify = () => {
    const o = step.check(readBoard(before.current));
    setOutcome(o);
    if (o.ok) onPass();
    else setFails((f) => f + 1);
  };

  // confere sozinho cada simulação nova (feita nesta etapa) e diz se deu ou não
  useEffect(() => {
    if (!passed && result && result !== before.current) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, resultVersion]);
  // a simulação nem rodou (desenho incompleto): diz o que falta
  const simError = useCanvas((s) => s.error);
  useEffect(() => {
    if (!passed && simError) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simError]);

  const diagnosis = result?.diagnosis.slice(0, 2) ?? [];

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {step.tasks.map((t) => (
          <li key={t} className="flex gap-1.5 text-[13px] text-text">
            <span className={passed ? "text-ok" : "text-accent"}>{passed ? "✓" : "▸"}</span>
            {t}
          </li>
        ))}
      </ul>
      {!passed && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={verify} className="btn-neon px-2.5 py-1 text-xs">
            Verificar
          </button>
          <button onClick={onResetStep} title="Volta o desenho para como estava no começo desta etapa (Ctrl+Z desfaz)" className="flex items-center gap-1 text-xs text-muted hover:text-accent">
            <Undo2 size={12} /> desfazer o que fiz nesta etapa
          </button>
        </div>
      )}
      {outcome && !outcome.ok && (
        <div className="pop-in flex flex-col gap-2 rounded-md border border-down/50 bg-down/5 p-2.5 text-[13px] leading-relaxed">
          <div className="flex gap-1.5 text-down">
            <CircleX size={16} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-semibold">Ainda não. </span>
              {outcome.hint}
            </span>
          </div>
          {help >= 1 && diagnosis.length > 0 && (
            <div className="pop-in text-text/90">
              <span className="font-semibold text-warn">O que o simulador viu: </span>
              {diagnosis.join(" ").replace(/\*\*/g, "")}
            </div>
          )}
          {help >= 2 && (
            <div className="pop-in text-text/90">
              <span className="font-semibold text-accent">Como deve ficar: </span>
              <Glossed text={step.solution ?? `${step.body} ${step.tasks.join(". ")}.`} />
            </div>
          )}
          {help < 2 && (
            <button onClick={() => setHelp((h) => h + 1)} className="flex items-center gap-1 self-start text-xs text-accent hover:underline">
              <LifeBuoy size={12} /> {help === 0 ? "Me dá mais uma dica" : "Mostrar como deve ficar"}
            </button>
          )}
        </div>
      )}
      {!outcome && fails === 0 && !passed && <p className="text-[12px] text-muted">Quando simular, eu confiro sozinho e digo se deu certo.</p>}
      {passed && (
        <>
          <div className="pop-in flex items-center gap-1.5 text-[13px] text-ok">
            <CheckCircle2 size={16} /> Deu certo!
          </div>
          <Lesson text={step.lesson} />
        </>
      )}
    </div>
  );
}
