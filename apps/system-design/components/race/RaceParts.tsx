"use client";

import { Lock, RotateCcw, ShieldCheck, ShieldAlert, Unlock } from "lucide-react";
import { isFinished, stepTx, type ExploreSummary, type RunState, type Scenario } from "@sdp/race-sim";

export const LANE_COLORS = ["text-accent", "text-accent-2"];
const LANE_BORDER = ["border-accent", "border-accent-2"];

/** Quem pode andar agora e se travou tudo. */
export function laneState(s: Scenario, run: RunState) {
  const canStep = s.txs.map((_, i) => stepTx(s, run, i) !== null);
  const finished = isFinished(run);
  return { canStep, finished, deadlock: !finished && canStep.every((c) => !c) };
}

/** Linha que trava a transação (o próximo passo dela pede um lock que outra segura). */
function waitingFor(s: Scenario, run: RunState, tx: number): { key: string; holder: number } | null {
  const st = run.txs[tx]!;
  if (st.done) return null;
  const label = s.txs[tx]!.steps[st.pc]!.label;
  const others = Object.entries(run.db.locks).filter(([, holder]) => holder !== tx);
  const hit = others.find(([key]) => label.includes(key.split(":").pop()!)) ?? others[0];
  return hit ? { key: hit[0], holder: hit[1] } : null;
}

/** As colunas das transações, com o botão de avançar de cada uma. */
export function Lanes({
  s,
  run,
  onStep,
  allowed,
  cue,
}: {
  s: Scenario;
  run: RunState;
  onStep(tx: number): void;
  /** Se definido, só estas transações podem andar (roteiro guiado). */
  allowed?: number[];
  /** Transação que o roteiro pede para avançar agora (fica piscando). */
  cue?: number;
}) {
  const { canStep } = laneState(s, run);
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {s.txs.map((tx, i) => {
        const st = run.txs[i]!;
        const wait = !st.done && !canStep[i] ? waitingFor(s, run, i) : null;
        const enabled = canStep[i] && (!allowed || allowed.includes(i));
        return (
          <div key={tx.name} className={`panel p-3 transition-shadow ${cue === i ? `${LANE_BORDER[i]} shadow-[0_0_18px_rgba(34,228,255,0.35)]` : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <div className={`font-semibold ${LANE_COLORS[i]}`}>{tx.name}</div>
              <button
                disabled={!enabled}
                onClick={() => onStep(i)}
                className={`btn-neon flex items-center gap-1 px-2 py-1 text-[11px] disabled:opacity-30 disabled:shadow-none ${wait ? "shake" : ""} ${cue === i ? "pulse-cue" : ""}`}
              >
                {st.done ? "terminou" : canStep[i] ? "Avançar ▶" : (
                  <>
                    <Lock size={11} /> esperando
                  </>
                )}
              </button>
            </div>
            {wait && (
              <div className="pop-in mt-1.5 flex items-center gap-1.5 rounded border border-warn/40 bg-warn/10 px-2 py-1 text-[11px] text-warn">
                <Lock size={12} /> esperando o lock de <b className="font-mono">{wait.key}</b>, que está com{" "}
                <span className={LANE_COLORS[wait.holder]}>{s.txs[wait.holder]!.name}</span>
              </div>
            )}
            {st.restarts > 0 && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-warn">
                <RotateCcw size={11} /> recomeçou {st.restarts}×
              </div>
            )}
            <ol className="mt-2 flex flex-col gap-1 font-mono text-xs">
              {tx.steps.map((step, j) => (
                <li
                  key={j}
                  className={`rounded px-2 py-1 ${j === st.pc && !st.done ? "bg-accent/15 text-text" : j < st.pc || st.done ? "text-muted line-through decoration-muted/40" : "text-muted"}`}
                >
                  {j === st.pc && !st.done && <span className="cursor-blink mr-1 text-accent">▸</span>}
                  {step.label}
                </li>
              ))}
            </ol>
          </div>
        );
      })}
    </div>
  );
}

/** Linha do tempo: um "tique" do relógio por passo executado. */
export function Timeline({ s, run, empty }: { s: Scenario; run: RunState; empty?: string }) {
  const { finished, deadlock } = laneState(s, run);
  const verdict = finished ? s.invariant(run.db) : null;
  return (
    <div className="panel p-3">
      <div className="mb-2 hud-label">Linha do tempo</div>
      {run.trace.length === 0 ? (
        <p className="text-sm text-muted">{empty ?? "Avance as transações em qualquer ordem e veja o que acontece."}</p>
      ) : (
        <table className="w-full font-mono text-xs">
          <tbody>
            {run.trace.map((t, k) => (
              <tr key={k} className="pop-in align-top">
                <td className="pr-2 text-muted">t{k + 1}</td>
                <td className={`pr-2 ${LANE_COLORS[t.tx]}`}>{s.txs[t.tx]!.name}</td>
                <td className="pr-2">{t.label}</td>
                <td className="text-muted">{t.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {verdict && (
        <div className={`pop-in mt-3 flex items-start gap-1.5 rounded-md p-2 text-sm ${verdict.ok ? "bg-ok/10 text-ok" : "pulse-bad border border-down/40 bg-down/10 text-down"}`}>
          {verdict.ok ? <ShieldCheck size={16} className="mt-0.5 shrink-0" /> : <ShieldAlert size={16} className="mt-0.5 shrink-0" />}
          {verdict.message}
        </div>
      )}
      {deadlock && (
        <div className="pulse-bad mt-3 rounded-md border border-down/40 bg-down/10 p-2 text-sm text-down">Deadlock: cada transação espera um lock que a outra segura.</div>
      )}
    </div>
  );
}

/** Estado confirmado do banco, locks e eventos registrados. */
export function StatePanel({ s, run }: { s: Scenario; run: RunState }) {
  return (
    <div className="panel p-3 font-mono text-xs">
      <div className="mb-2 hud-label">Estado confirmado</div>
      {Object.entries(run.db.rows).map(([k, r]) => (
        <div key={k} className="flex justify-between gap-2">
          <span className="text-muted">{k}</span>
          <span>
            {r.value ?? "vazio"}
            {r.version > 0 && <span className="text-muted"> · v{r.version}</span>}
          </span>
        </div>
      ))}
      <div className="mt-3 hud-label">Locks</div>
      {Object.keys(run.db.locks).length === 0 ? (
        <div className="flex items-center gap-1 text-muted">
          <Unlock size={12} /> nenhum
        </div>
      ) : (
        Object.entries(run.db.locks).map(([k, tx]) => (
          <div key={k} className="pop-in flex items-center gap-1">
            <Lock size={12} className={LANE_COLORS[tx]} /> {k} → <span className={LANE_COLORS[tx]}>{s.txs[tx]!.name}</span>
          </div>
        ))
      )}
      {run.db.log.length > 0 && (
        <>
          <div className="mt-3 hud-label">Eventos</div>
          {run.db.log.map((l, k) => (
            <div key={k} className="pop-in">
              {l.event} <span className={LANE_COLORS[l.tx]}>({s.txs[l.tx]!.name})</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

/** Resultado do "testar todas as ordens". */
export function ExploreResult({ sum, onReplay }: { sum: ExploreSummary; onReplay?(schedule: number[]): void }) {
  return (
    <div className={`pop-in rounded-lg border p-3 text-sm ${sum.violations ? "border-down/60 bg-down/10" : "border-ok/50 bg-ok/10"}`}>
      <div className="font-medium">
        {sum.violations
          ? `Em ${sum.violations} de ${sum.total} ordens possíveis a regra quebra${sum.deadlocks ? ` (${sum.deadlocks} com deadlock)` : ""}.`
          : `Correto nas ${sum.total} ordens possíveis.`}
      </div>
      {sum.truncated && <div className="text-xs text-warn">Busca interrompida no limite de ordens.</div>}
      {sum.example && onReplay && (
        <button onClick={() => onReplay(sum.example!.schedule)} className="mt-2 text-xs text-accent hover:underline">
          Reproduzir uma ordem com bug ({sum.example.verdict.message})
        </button>
      )}
    </div>
  );
}

export const MODEL_NOTE =
  "Modelo: Read Committed (padrão do PostgreSQL). Escritas dentro de BEGIN só aparecem para os outros no COMMIT; UPDATE e SELECT FOR UPDATE travam a linha até o fim da transação.";
