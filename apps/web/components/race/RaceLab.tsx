"use client";

import {
  SCENARIOS,
  createRun,
  exploreAll,
  getScenario,
  isFinished,
  runSchedule,
  stepTx,
  type ExploreSummary,
  type RunState,
} from "@sdp/race-sim";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const LANE_COLORS = ["text-accent", "text-accent-2"];

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

  const canStep = useMemo(() => scenario.txs.map((_, i) => stepTx(scenario, run, i) !== null), [scenario, run]);
  const finished = isFinished(run);
  const deadlock = !finished && canStep.every((c) => !c);
  const verdict = finished ? scenario.invariant(run.db) : null;

  const visibleRows = Object.entries(run.db.rows);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr]">
      <aside className="flex flex-col gap-1">
        <div className="mb-1 hud-label">Cenários</div>
        {SCENARIOS.map((s) => (
          <button
            key={s.id}
            onClick={() => router.push(`/concorrencia?c=${s.id}`)}
            className={`rounded-md px-2 py-1.5 text-left text-sm ${s.id === scenario.id ? "border-l-2 border-accent bg-accent/10 text-text" : "text-muted hover:text-text"}`}
          >
            {s.title}
          </button>
        ))}
      </aside>

      <main className="flex flex-col gap-5">
        <div>
          <h1 className="font-display text-lg leading-relaxed text-accent glow">{scenario.title}</h1>
          <p className="mt-1 text-muted">{scenario.description}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {scenario.txs.map((tx, i) => {
            const st = run.txs[i]!;
            return (
              <div key={tx.name} className="panel p-3">
                <div className="flex items-center justify-between">
                  <div className={`font-medium ${LANE_COLORS[i]}`}>{tx.name}</div>
                  <button
                    disabled={!canStep[i]}
                    onClick={() => setRun(stepTx(scenario, run, i)!)}
                    className="btn-neon px-2 py-1 text-[11px] disabled:opacity-30"
                  >
                    {st.done ? "terminou" : canStep[i] ? "Avançar ▶" : "bloqueada 🔒"}
                  </button>
                </div>
                {st.restarts > 0 && <div className="mt-1 text-[11px] text-warn">recomeçou {st.restarts}×</div>}
                <ol className="mt-2 flex flex-col gap-1 font-mono text-xs">
                  {tx.steps.map((s, j) => (
                    <li
                      key={j}
                      className={`rounded px-2 py-1 ${j === st.pc && !st.done ? "bg-accent/15 text-text" : j < st.pc || st.done ? "text-muted line-through decoration-muted/40" : "text-muted"}`}
                    >
                      {s.label}
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <button onClick={() => setRun(createRun(scenario))} className="btn-ghost px-3 py-1.5">Reiniciar</button>
          <button onClick={() => setSummary(exploreAll(scenario))} className="btn-ghost px-3 py-1.5">
            Testar todas as ordens possíveis
          </button>
        </div>

        {summary && (
          <div className={`rounded-lg border p-3 text-sm ${summary.violations ? "border-bad/60 bg-bad/10" : "border-ok/50 bg-ok/10"}`}>
            <div className="font-medium">
              {summary.violations
                ? `Em ${summary.violations} de ${summary.total} ordens possíveis a regra quebra${summary.deadlocks ? ` (${summary.deadlocks} com deadlock)` : ""}.`
                : `Correto nas ${summary.total} ordens possíveis.`}
            </div>
            {summary.truncated && <div className="text-xs text-warn">Busca interrompida no limite de ordens.</div>}
            {summary.example && (
              <button onClick={() => setRun(runSchedule(scenario, summary.example!.schedule))} className="mt-2 text-xs text-accent hover:underline">
                Reproduzir uma ordem com bug ({summary.example.verdict.message})
              </button>
            )}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="panel p-3">
            <div className="mb-2 hud-label">Linha do tempo</div>
            {run.trace.length === 0 ? (
              <p className="text-sm text-muted">Avance as transações em qualquer ordem e veja o que acontece.</p>
            ) : (
              <table className="w-full font-mono text-xs">
                <tbody>
                  {run.trace.map((t, k) => (
                    <tr key={k} className="align-top">
                      <td className="pr-2 text-muted">{k + 1}</td>
                      <td className={`pr-2 ${LANE_COLORS[t.tx]}`}>{scenario.txs[t.tx]!.name}</td>
                      <td className="pr-2">{t.label}</td>
                      <td className="text-muted">{t.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {verdict && (
              <div className={`mt-3 rounded-md p-2 text-sm ${verdict.ok ? "bg-ok/10 text-ok" : "bg-bad/10 text-bad"}`}>{verdict.message}</div>
            )}
            {deadlock && <div className="mt-3 rounded-md bg-down/10 p-2 text-sm text-down">Deadlock: cada transação espera um lock que a outra segura.</div>}
          </div>

          <div className="panel p-3 font-mono text-xs">
            <div className="mb-2 hud-label">Estado confirmado</div>
            {visibleRows.map(([k, r]) => (
              <div key={k} className="flex justify-between">
                <span className="text-muted">{k}</span>
                <span>{r.value ?? "vazio"}</span>
              </div>
            ))}
            <div className="mt-3 hud-label">Locks</div>
            {Object.keys(run.db.locks).length === 0 ? (
              <div className="text-muted">nenhum</div>
            ) : (
              Object.entries(run.db.locks).map(([k, tx]) => (
                <div key={k}>🔒 {k} → <span className={LANE_COLORS[tx]}>{scenario.txs[tx]!.name}</span></div>
              ))
            )}
            {run.db.log.length > 0 && (
              <>
                <div className="mt-3 hud-label">Eventos</div>
                {run.db.log.map((l, k) => (
                  <div key={k}>{l.event} <span className={LANE_COLORS[l.tx]}>({scenario.txs[l.tx]!.name})</span></div>
                ))}
              </>
            )}
          </div>
        </div>

        <p className="panel p-3 text-sm text-muted">
          <strong className="text-text">Lição: </strong>
          {scenario.lesson}
        </p>
        <p className="text-[11px] text-muted">
          Modelo: Read Committed (padrão do PostgreSQL). Escritas dentro de BEGIN só aparecem para os outros no COMMIT;
          UPDATE e SELECT FOR UPDATE travam a linha até o fim da transação.
        </p>
      </main>
    </div>
  );
}
