"use client";

import { SCENARIOS, createRun, exploreAll, getScenario, runSchedule, stepTx, type ExploreSummary, type RunState } from "@sdp/race-sim";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ExploreResult, Lanes, MODEL_NOTE, StatePanel, Timeline } from "./RaceParts";

/** Laboratório livre: escolha um cenário e avance as transações na ordem que quiser. */
export function RaceLab() {
  const params = useSearchParams();
  const router = useRouter();
  const scenario = getScenario(params.get("c") ?? "") ?? SCENARIOS[0]!;
  const [run, setRun] = useState<RunState>(() => createRun(scenario));
  const [summary, setSummary] = useState<ExploreSummary | null>(null);
  const [scenarioId, setScenarioId] = useState(scenario.id);

  // trocou de cenário pela URL: reinicia
  if (scenarioId !== scenario.id) {
    setScenarioId(scenario.id);
    setRun(createRun(scenario));
    setSummary(null);
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-1">
        <div className="mb-1 hud-label">Laboratório livre · cenários</div>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => router.push(`/concorrencia?c=${s.id}`)}
            className={`rounded-md px-2 py-1.5 text-left text-sm ${s.id === scenario.id ? "border-l-2 border-accent bg-accent/10 text-text" : "text-muted hover:text-text"}`}
          >
            {s.title}
          </button>
        ))}
        <Link href="/estudo/concorrencia" className="mt-3 rounded-md border border-accent-2/50 p-2 text-xs text-accent-2 hover:bg-accent-2/10">
          Primeira vez? As aulas guiadas explicam cada passo →
        </Link>
      </aside>

      <main className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-lg leading-relaxed text-accent glow">{scenario.title}</h1>
          <p className="mt-1 text-muted">{scenario.description}</p>
        </div>

        <Lanes s={scenario} run={run} onStep={(i) => setRun(stepTx(scenario, run, i)!)} />

        <div className="flex flex-wrap gap-2 text-sm">
          <button onClick={() => setRun(createRun(scenario))} className="btn-ghost px-3 py-1.5">
            Reiniciar
          </button>
          <button onClick={() => setSummary(exploreAll(scenario))} className="btn-ghost px-3 py-1.5">
            Testar todas as ordens possíveis
          </button>
        </div>

        {summary && <ExploreResult sum={summary} onReplay={(sch) => setRun(runSchedule(scenario, sch))} />}

        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <Timeline s={scenario} run={run} />
          <StatePanel s={scenario} run={run} />
        </div>

        <p className="panel p-3 text-sm text-muted">
          <strong className="text-text">Lição: </strong>
          {scenario.lesson}
        </p>
        <p className="text-[11px] text-muted">{MODEL_NOTE}</p>
      </main>
    </div>
  );
}
