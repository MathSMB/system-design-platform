"use client";

import { Bold } from "./Bold";
import { useCanvas } from "./store";
import { TimelineChart } from "./TimelineChart";

const fmt = (x: number, d = 0) => x.toLocaleString("pt-BR", { maximumFractionDigits: d });

export function ResultsPanel() {
  const r = useCanvas((s) => s.result);
  const error = useCanvas((s) => s.error);
  const running = useCanvas((s) => s.running);

  if (error) return <div className="rounded-md border border-down/50 bg-down/10 p-3 text-sm text-down">{error}</div>;
  if (running) return <p className="text-sm text-muted">Simulando…</p>;
  if (!r) return <p className="text-sm text-muted">Rode a simulação para ver throughput, latência e onde o sistema quebra.</p>;

  const cards = [
    { label: "req/s", value: fmt(r.totalRequests / r.simulatedSec) },
    { label: "erros", value: `${fmt(r.errorRate * 100, 2)}%`, bad: r.errorRate > 0.01 },
    { label: "p50", value: `${fmt(r.latency.p50Ms, 1)} ms` },
    { label: "p99", value: `${fmt(r.latency.p99Ms, 1)} ms`, bad: r.latency.p99Ms > 500 },
  ];

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c) => (
          <div key={c.label} className="rounded-md border border-border bg-panel-2 p-2">
            <div className="font-mono text-[10px] uppercase text-muted">{c.label}</div>
            <div className={`font-mono text-base ${c.bad ? "text-bad" : "text-text"}`}>{c.value}</div>
          </div>
        ))}
      </div>
      {r.consistency.staleReads > 0 && (
        <div className="rounded-md border border-bad/50 bg-bad/10 p-2 text-xs text-bad">
          <span className="font-mono">{fmt(r.consistency.staleReads)}</span> leituras com dado velho (
          {fmt((r.consistency.staleReads / Math.max(1, r.consistency.dbReads)) * 100, 1)}% das leituras no banco)
        </div>
      )}
      {r.warnings.map((w) => (
        <p key={w} className="text-xs text-warn">{w}</p>
      ))}
      <div>
        <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Onde quebrou</div>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-muted">
          {r.diagnosis.map((d, i) => (
            <li key={i}><Bold text={d} /></li>
          ))}
        </ul>
      </div>
      <TimelineChart points={r.timeline} />
      <details className="text-xs text-muted">
        <summary className="cursor-pointer">Detalhes por componente</summary>
        <table className="mt-2 w-full font-mono">
          <thead>
            <tr className="text-left"><th>nó</th><th>util.</th><th>rejeit.</th><th>fila máx</th><th>lag máx</th></tr>
          </thead>
          <tbody>
            {r.nodes.map((n) => (
              <tr key={n.nodeId}>
                <td>{n.nodeId}</td>
                <td>
                  {fmt(n.utilization * 100)}%{n.replicaUtilization !== undefined && ` / ${fmt(n.replicaUtilization * 100)}%`}
                </td>
                <td>{fmt(n.rejected)}</td>
                <td>{fmt(n.maxQueue)}</td>
                <td>{n.replicationLag ? `${fmt(n.replicationLag.maxMs)} ms` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2">
          Em voo, em média: {fmt(r.avgInFlight, 1)} requisições (Lei de Little: ≈ throughput × latência). Simulação de
          eventos discretos com seed fixa: mesmo desenho, mesmo resultado.
        </p>
      </details>
    </div>
  );
}
