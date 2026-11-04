"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCircle2, CircleX, Dices, FlaskConical, MessageCircle, Star, UserRound } from "lucide-react";
import { createRun, exploreAll, getScenario, runSchedule, stepTx, type ExploreSummary, type RunState } from "@sdp/race-sim";
import { ExploreResult, Lanes, MODEL_NOTE, StatePanel, Timeline } from "@/components/race/RaceParts";
import { RACE_INTERVIEWS, type RaceInterview, type RaceQuestion } from "@sdp/race-sim";

type Phase = "report" | "diagnose" | "fix" | "proof" | "follow" | "result";

function Bubble({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return (
    <div className={`pop-in flex gap-2 text-[13px] leading-relaxed ${me ? "flex-row-reverse text-right" : ""}`}>
      <span className={`mt-0.5 shrink-0 self-start rounded-full border p-1 ${me ? "border-accent text-accent" : "border-accent-2 text-accent-2"}`}>
        {me ? <MessageCircle size={12} /> : <UserRound size={12} />}
      </span>
      <div className={`rounded-md border px-2 py-1.5 ${me ? "border-accent/40 bg-accent/5" : "border-accent-2/40 bg-accent-2/5"}`}>{children}</div>
    </div>
  );
}

function OneShot({ q, onAnswer }: { q: RaceQuestion; onAnswer(k: number): void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Bubble>{q.q}</Bubble>
      {q.choices.map((ch, k) => (
        <button key={k} onClick={() => onAnswer(k)} className="btn-ghost px-2 py-1.5 text-left text-[13px]">
          <span className="mr-1.5 font-mono text-[11px] text-muted">{String.fromCharCode(65 + k)}</span>
          {ch.text}
        </button>
      ))}
    </div>
  );
}

/** Entrevista de concorrência: relato → reproduzir → diagnóstico → correção → prova → aprofundamento → nota. */
export function RaceInterviewView({ iv }: { iv: RaceInterview }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("report");
  const [picks, setPicks] = useState<{ diagnose?: number; fix?: number; follow?: number }>({});
  const fixChoice = picks.fix !== undefined ? iv.fix.choices[picks.fix] : undefined;
  // a prova roda a correção escolhida (se ela tiver cenário) ou a primeira correta
  const proofId = fixChoice?.proof ?? iv.fix.choices.find((c) => c.correct && c.proof)?.proof;
  const showId = phase === "proof" || phase === "follow" || phase === "result" ? (proofId ?? iv.bug) : iv.bug;
  const scenario = getScenario(showId)!;
  const [run, setRun] = useState<RunState>(() => createRun(getScenario(iv.bug)!));
  const [runFor, setRunFor] = useState(iv.bug);
  const [bugSum, setBugSum] = useState<ExploreSummary | null>(null);
  const proofSum = useMemo(() => (proofId ? exploreAll(getScenario(proofId)!) : null), [proofId]);

  if (runFor !== showId) {
    setRunFor(showId);
    setRun(createRun(scenario));
  }

  const others = RACE_INTERVIEWS.filter((x) => x.id !== iv.id);
  const reroll = () => router.push(`/entrevista/concorrencia/${others[Math.floor(Math.random() * others.length)]!.id}`);

  return (
    <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[380px_1fr]">
      <aside className="flex flex-col gap-3">
        <span className="flex items-center gap-1.5 hud-label !text-accent-2">
          <UserRound size={14} /> Entrevista técnica · Concorrência e dados
        </span>
        <h1 className="font-display text-[11px] leading-relaxed text-accent glow">{iv.title}</h1>
        <Bubble>{iv.report}</Bubble>

        {phase === "report" && (
          <>
            <Bubble>Se quiser, reproduza no laboratório ao lado antes de responder. Quando estiver pronto, me diga o que está acontecendo.</Bubble>
            <button onClick={() => setPhase("diagnose")} className="btn-neon self-start px-3 py-1.5 text-xs">
              Responder ▶
            </button>
          </>
        )}
        {phase === "diagnose" && <OneShot q={iv.diagnose} onAnswer={(k) => (setPicks({ ...picks, diagnose: k }), setPhase("fix"))} />}
        {picks.diagnose !== undefined && <Bubble me>{iv.diagnose.choices[picks.diagnose]!.text}</Bubble>}
        {phase === "fix" && <OneShot q={iv.fix} onAnswer={(k) => (setPicks({ ...picks, fix: k }), setPhase("proof"))} />}
        {fixChoice && <Bubble me>{fixChoice.text}</Bubble>}

        {phase === "proof" && (
          <>
            <Bubble>
              {fixChoice?.proof
                ? "Prove. Rode todas as ordens possíveis da sua correção."
                : proofId
                  ? "Essa eu não consigo verificar no laboratório. Vou te mostrar uma correção que dá para provar; depois comparamos."
                  : "Como você mostraria que funciona? Vamos para a última pergunta."}
            </Bubble>
            {proofSum && <ExploreResult sum={proofSum} />}
            <button onClick={() => setPhase("follow")} className="btn-neon self-start px-3 py-1.5 text-xs">
              Seguir ▶
            </button>
          </>
        )}
        {phase === "follow" && <OneShot q={iv.followUp} onAnswer={(k) => (setPicks({ ...picks, follow: k }), setPhase("result"))} />}
        {phase === "result" && <Result iv={iv} picks={picks} onReroll={reroll} />}
      </aside>

      <main className="flex flex-col gap-5">
        <div>
          <div className="hud-label">Laboratório · {scenario.title}</div>
          <p className="mt-1 text-sm text-muted">{scenario.description}</p>
        </div>
        <Lanes s={scenario} run={run} onStep={(i) => setRun(stepTx(scenario, run, i)!)} />
        <div className="flex flex-wrap gap-2 text-sm">
          <button onClick={() => setRun(createRun(scenario))} className="btn-ghost px-3 py-1.5">
            Reiniciar
          </button>
          {showId === iv.bug && (
            <button onClick={() => setBugSum(exploreAll(scenario))} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5">
              <FlaskConical size={14} /> Testar todas as ordens
            </button>
          )}
        </div>
        {bugSum && showId === iv.bug && <ExploreResult sum={bugSum} onReplay={(s) => setRun(runSchedule(scenario, s))} />}
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <Timeline s={scenario} run={run} />
          <StatePanel s={scenario} run={run} />
        </div>
        <p className="text-[11px] text-muted">{MODEL_NOTE}</p>
      </main>
    </div>
  );
}

function Result({ iv, picks, onReroll }: { iv: RaceInterview; picks: { diagnose?: number; fix?: number; follow?: number }; onReroll(): void }) {
  const items: [string, RaceQuestion, number | undefined][] = [
    ["Diagnóstico", iv.diagnose, picks.diagnose],
    ["Correção", iv.fix, picks.fix],
    ["Aprofundamento", iv.followUp, picks.follow],
  ];
  const stars = items.filter(([, q, k]) => k !== undefined && q.choices[k]?.correct).length;
  return (
    <div className="flex flex-col gap-3">
      <div className="panel pop-in flex flex-col items-center gap-2 p-3 text-center">
        <span className="flex gap-0.5">
          {[0, 1, 2].map((k) => (
            <Star key={k} size={20} className={k < stars ? "pop-in fill-warn text-warn" : "text-border"} style={{ animationDelay: `${k * 150}ms` }} />
          ))}
        </span>
        <div className={`font-display text-[10px] glow ${stars === 3 ? "text-ok" : stars === 2 ? "text-warn" : "text-down"}`}>
          {stars === 3 ? "Mandou bem" : stars === 2 ? "Quase lá" : "Vale revisar a aula"}
        </div>
      </div>
      <div className="hud-label">Gabarito comentado</div>
      {items.map(([title, q, k]) => {
        if (k === undefined) return null;
        const ch = q.choices[k]!;
        const ok = !!ch.correct;
        const best = q.choices.filter((x) => x.correct).map((x) => x.text);
        return (
          <div key={title} className="panel flex flex-col gap-1 p-2.5 text-[13px]">
            <div className={ok ? "text-ok" : "text-down"}>
              {ok ? <CheckCircle2 size={14} className="mr-1 inline" /> : <CircleX size={14} className="mr-1 inline" />}
              {title}
            </div>
            <div className="text-[12px] text-muted">{ch.why}</div>
            {!ok && <div className="text-text">Melhor resposta: {best.join(" Ou: ")}</div>}
            <div className="text-[12px] text-muted">{q.lesson}</div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <button onClick={onReroll} className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Dices size={13} /> Outra entrevista
        </button>
        <Link href={`/estudo/concorrencia/${iv.lesson}`} className="btn-ghost px-3 py-1.5 text-xs">
          Ver a aula
        </Link>
      </div>
    </div>
  );
}
