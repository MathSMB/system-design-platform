"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BookOpen, CheckCircle2, CircleX, Cpu, FlaskConical, GraduationCap, Lightbulb, MessageSquareQuote, RotateCcw, Scale, Trophy } from "lucide-react";
import { createRun, exploreAll, getScenario, runSchedule, stepTx, type ExploreSummary, type RunState } from "@sdp/race-sim";
import { Glossed } from "@/components/glossary/Glossary";
import { RefList } from "@/components/training/RefList";
import { RACE_LESSONS, type Beat, type RaceLesson } from "@/lib/concurrency/lessons";
import { ExploreResult, Lanes, MODEL_NOTE, StatePanel, Timeline } from "./RaceParts";

/** Aula guiada de concorrência: o mentor narra cada passo, pergunta antes dos cliques importantes e explica. */
export function GuidedRace({ lesson }: { lesson: RaceLesson }) {
  const [part, setPart] = useState(0);
  const [beat, setBeat] = useState(0);
  const [summary, setSummary] = useState<ExploreSummary | null>(null);
  const [done, setDone] = useState(false);
  const p = lesson.parts[part]!;
  const scenario = getScenario(p.scenario)!;
  const [run, setRun] = useState<RunState>(() => createRun(scenario));
  const scriptOver = beat >= p.beats.length;
  const cur: Beat | undefined = p.beats[beat];
  // no Estudo o mentor não pergunta: ele explica o que vai acontecer antes do clique
  const waitingAnswer = false;

  const restartPart = (k = part) => {
    const s = getScenario(lesson.parts[k]!.scenario)!;
    setPart(k);
    setBeat(0);
    setRun(createRun(s));
    setSummary(null);
    setDone(false);
  };

  const onStep = (tx: number) => {
    const next = stepTx(scenario, run, tx);
    if (!next) return;
    setRun(next);
    if (!scriptOver && cur?.press === tx) setBeat((b) => b + 1);
  };

  const next = RACE_LESSONS[RACE_LESSONS.findIndex((l) => l.id === lesson.id) + 1];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[380px_1fr]">
      <aside className="flex flex-col gap-3 lg:sticky lg:top-4 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-1">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-accent-2" />
          <span className="hud-label !text-accent-2">Estudo · Concorrência e dados · {lesson.level}</span>
        </div>
        <h1 className="font-display text-[11px] leading-relaxed text-accent glow">{lesson.title}</h1>

        <details open={part === 0 && beat < 2} className="panel p-2.5 text-[13px] leading-relaxed">
          <summary className="cursor-pointer list-none hud-label !text-accent-2">▸ A história</summary>
          <p className="mt-1.5 text-text/90">
            <Glossed text={lesson.story} />
          </p>
        </details>
        <div className="flex items-start gap-2 rounded-md border border-ok/40 bg-ok/5 p-2 text-[13px]">
          <Scale size={15} className="mt-0.5 shrink-0 text-ok" />
          <span>
            <span className="font-semibold text-ok">Regra que não pode quebrar: </span>
            {lesson.rule}
          </span>
        </div>
        {lesson.concept && (
          <details className="panel p-2.5 text-[13px] leading-relaxed">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 hud-label">
              <Lightbulb size={13} /> O que é {lesson.concept.title.toLowerCase()}?
            </summary>
            <p className="mt-1.5 text-text/90">
              <Glossed text={lesson.concept.body} />
            </p>
          </details>
        )}

        {lesson.parts.length > 1 && (
          <div className="flex gap-1">
            {lesson.parts.map((_, k) => (
              <div key={k} className={`h-1.5 flex-1 rounded-full ${k === part ? "bg-accent shadow-[0_0_6px_var(--accent)]" : k < part ? "bg-ok/70" : "bg-border"}`} />
            ))}
          </div>
        )}
        <div className="hud-label">
          {lesson.parts.length > 1 ? (part === 0 ? "Parte 1 · o problema" : "Parte 2 · a correção") : "Passo a passo"}
        </div>

        {/* narração: passos anteriores apagados, o atual em destaque */}
        {!done && <Narration beats={p.beats} current={beat} />}

        {!done && cur?.ask && <Explain key={`${part}-${beat}`} ask={cur.ask} />}

        {!done && !scriptOver && !waitingAnswer && cur?.press === undefined && (
          <button onClick={() => setBeat((b) => b + 1)} className="btn-neon self-start px-3 py-1.5 text-xs">
            Continuar ▶
          </button>
        )}
        {!done && !scriptOver && !waitingAnswer && cur?.press !== undefined && (
          <div className="pop-in text-[12px] text-accent">
            ▸ Clique em <b>Avançar</b> no <b>{scenario.txs[cur.press]!.name}</b>
          </div>
        )}

        {!done && scriptOver && (
          <div className="flex flex-col gap-2">
            {!summary && (
              <button onClick={() => setSummary(exploreAll(scenario))} className="btn-neon flex items-center gap-1.5 self-start px-3 py-1.5 text-xs">
                <FlaskConical size={13} /> Testar todas as ordens possíveis
              </button>
            )}
            {summary && (
              <>
                <ExploreResult sum={summary} onReplay={(sch) => setRun(runSchedule(scenario, sch))} />
                <p className="text-[12px] text-muted">
                  {summary.violations
                    ? "Não é azar: existe uma ordem possível que quebra a regra, e com tráfego real ela acontece."
                    : "Nenhuma ordem quebra a regra: a correção vale para qualquer intercalação, não só para a que você clicou."}{" "}
                  Agora você pode avançar as transações livremente.
                </p>
                {part < lesson.parts.length - 1 ? (
                  <button onClick={() => restartPart(part + 1)} className="btn-neon self-start px-3 py-1.5 text-xs">
                    Parte 2: a correção ▶
                  </button>
                ) : (
                  <button onClick={() => setDone(true)} className="btn-neon self-start px-3 py-1.5 text-xs">
                    Concluir aula ▶
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {done && <WrapUp lesson={lesson} nextId={next?.id} />}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => restartPart(0)} title="Volta para o começo da aula: história, parte 1 e transações zeradas" className="btn-ghost flex items-center gap-1 px-2 py-1 text-xs">
            <RotateCcw size={12} /> Reiniciar aula
          </button>
          {part > 0 && (
            <button onClick={() => restartPart()} className="btn-ghost px-2 py-1 text-xs">
              Refazer só a parte {part + 1}
            </button>
          )}
        </div>
      </aside>

      <main className="flex flex-col gap-5">
        <div>
          <div className="hud-label">{scenario.title}</div>
          <p className="mt-1 text-sm text-muted">{scenario.description}</p>
        </div>
        <Lanes
          s={scenario}
          run={run}
          onStep={onStep}
          allowed={scriptOver ? undefined : waitingAnswer || cur?.press === undefined ? [] : [cur.press]}
          cue={!scriptOver && !waitingAnswer ? cur?.press : undefined}
        />
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <Timeline s={scenario} run={run} empty="Siga o roteiro à esquerda: o mentor diz qual transação avança." />
          <StatePanel s={scenario} run={run} />
        </div>
        <p className="text-[11px] text-muted">{MODEL_NOTE}</p>
      </main>
    </div>
  );
}

function Narration({ beats, current }: { beats: Beat[]; current: number }) {
  const ref = useRef<HTMLOListElement>(null);
  useEffect(() => {
    ref.current?.querySelector("[data-current]")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [current]);
  return (
    <ol ref={ref} className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1 text-[13px] leading-relaxed">
      {beats.slice(0, current + 1).map((b, k) => (
        <li
          key={k}
          data-current={k === current ? "" : undefined}
          className={k === current ? "pop-in rounded-md border border-accent/50 bg-accent/5 p-2 text-text" : "px-2 text-muted"}
        >
          {k === current && <span className="font-semibold text-accent">Mentor: </span>}
          <Glossed text={b.say} />
        </li>
      ))}
    </ol>
  );
}

function Explain({ ask }: { ask: NonNullable<Beat["ask"]> }) {
  const right = ask.choices.filter((c) => c.correct);
  const wrong = ask.choices.filter((c) => !c.correct);
  return (
    <div className="panel pop-in flex flex-col gap-2 border-accent-2/50 p-2.5 text-[13px] leading-relaxed">
      <div className="flex items-center gap-1.5 font-semibold text-accent-2">
        <Lightbulb size={14} /> {ask.q}
      </div>
      {right.map((c) => (
        <div key={c.text} className="flex gap-1.5">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-ok" />
          <span>
            <span className="font-semibold text-ok">{c.text}. </span>
            <Glossed text={c.why.replace(/^Isso\.\s*/, "")} />
          </span>
        </div>
      ))}
      {wrong.length > 0 && (
        <details className="text-[12px]">
          <summary className="cursor-pointer text-muted hover:text-text">Erros comuns de raciocínio</summary>
          <ul className="mt-1.5 flex flex-col gap-1">
            {wrong.map((c) => (
              <li key={c.text} className="flex gap-1.5">
                <CircleX size={13} className="mt-0.5 shrink-0 text-down/80" />
                <span>
                  <span className="text-text">{c.text}: </span>
                  <span className="text-muted">{c.why}</span>
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function WrapUp({ lesson, nextId }: { lesson: RaceLesson; nextId?: string }) {
  return (
    <div className="flex flex-col gap-3 text-[13px]">
      <div className="panel pop-in flex flex-col items-center gap-2 p-3 text-center">
        <Trophy size={30} className="text-warn" style={{ filter: "drop-shadow(0 0 8px var(--warn))" }} />
        <div className="font-display text-[10px] text-warn glow">Aula concluída!</div>
        <div className="flex flex-wrap justify-center gap-2">
          {nextId && (
            <Link href={`/estudo/concorrencia/${nextId}`} className="btn-neon px-3 py-1.5 text-xs">
              Próxima aula ▶
            </Link>
          )}
          <Link href="/entrevista/concorrencia" className="btn-ghost px-3 py-1.5 text-xs font-semibold uppercase tracking-wider">
            Entrevista técnica
          </Link>
        </div>
      </div>
      <Box icon={<MessageSquareQuote size={14} />} title="Como falar na entrevista">
        <ul className="flex flex-col gap-1.5">
          {lesson.talk.map((t) => (
            <li key={t} className="flex gap-1.5 leading-relaxed">
              <span className="text-accent">“</span>
              {t}
            </li>
          ))}
        </ul>
      </Box>
      {lesson.tech && (
        <Box icon={<Cpu size={14} />} title="Tecnologias usadas hoje">
          <div className="flex flex-wrap gap-1.5">
            {lesson.tech.map((t) => (
              <span key={t} className="rounded border border-border bg-bg/60 px-1.5 py-0.5 font-mono text-[11px]">
                {t}
              </span>
            ))}
          </div>
        </Box>
      )}
      {lesson.study && (
        <Box icon={<BookOpen size={14} />} title="Para estudar">
          <RefList refs={lesson.study} />
          <Link href="/bibliografia" className="mt-1 text-xs text-accent hover:underline">
            Bibliografia completa →
          </Link>
        </Box>
      )}
    </div>
  );
}

function Box({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="panel pop-in flex flex-col gap-2 p-3">
      <div className="flex items-center gap-1.5 hud-label">
        {icon} {title}
      </div>
      {children}
    </div>
  );
}
