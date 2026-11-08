"use client";

import { HelpDot } from "@/components/glossary/Glossary";
import { Bold } from "./Bold";
import { CountUp } from "./CountUp";
import { useCanvas } from "./store";
import { TimelineChart } from "./TimelineChart";

const fmt = (x: number, d = 0) => x.toLocaleString("pt-BR", { maximumFractionDigits: d });

export function ResultsPanel() {
  const r = useCanvas((s) => s.result);
  const error = useCanvas((s) => s.error);
  const running = useCanvas((s) => s.running);

  if (error) return <div className="rounded-md border border-down/50 bg-down/10 p-3 text-sm text-down">{error}</div>;
  if (running)
    return (
      <div className="flex flex-col gap-2 text-sm text-muted">
        <span className="font-mono text-xs text-accent">SIMULANDO<span className="cursor-blink">_</span></span>
        <div className="h-1 overflow-hidden rounded-full bg-border">
          <div className="loading-bar h-full w-1/3 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
        </div>
      </div>
    );
  if (!r) return <p className="text-sm text-muted">Rode a simulação para ver throughput, latência e onde o sistema quebra.</p>;

  // com bot, o que importa é o erro dos usuários legítimos (o 429 do bot é o objetivo)
  const errRate = r.bot ? r.legit.errorRate : r.errorRate;
  const cards = [
    { label: "req/s", help: "req-s", value: r.totalRequests / r.simulatedSec, format: (x: number) => fmt(x) },
    { label: r.bot ? "erros legít." : "erros", help: "taxa-de-erro", value: errRate * 100, format: (x: number) => `${fmt(x, 2)}%`, bad: errRate > 0.01 },
    { label: "p50", help: "p50", value: r.latency.p50Ms, format: (x: number) => `${fmt(x, 1)} ms` },
    { label: "p99", help: "p99", value: r.latency.p99Ms, format: (x: number) => `${fmt(x, 1)} ms`, bad: r.latency.p99Ms > 500 },
  ];

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="grid grid-cols-4 gap-2">
        {cards.map((c, i) => (
          <div key={c.label} className={`panel pop-in p-2 ${c.bad ? "pulse-bad" : ""}`} style={{ animationDelay: `${i * 70}ms` }}>
            <div className="flex items-center justify-between font-mono text-[10px] uppercase text-muted">
              {c.label} <HelpDot id={c.help} label={c.label} />
            </div>
            <div className={`font-mono text-base ${c.bad ? "text-bad glow" : "text-accent"}`}>
              <CountUp value={c.value} format={c.format} />
            </div>
          </div>
        ))}
      </div>
      {r.consistency.staleReads > 0 && (
        <div className="rounded-md border border-bad/50 bg-bad/10 p-2 text-xs text-bad">
          <span className="font-mono">{fmt(r.consistency.staleReads)}</span> leituras com dado velho <HelpDot id="dado-velho" /> (
          {fmt((r.consistency.staleReads / Math.max(1, r.consistency.dbReads)) * 100, 1)}% das leituras no banco)
        </div>
      )}
      {r.duplicateEffects > 0 && (
        <div className="rounded-md border border-bad/50 bg-bad/10 p-2 text-xs text-bad">
          <span className="font-mono">{fmt(r.duplicateEffects)}</span> chamadas processadas em dobro <HelpDot id="idempotencia" /> (ex.: cobrança dupla)
        </div>
      )}
      {r.bot && (
        <div className="rounded-md border border-border p-2 text-xs text-muted">
          Bot: <span className="font-mono">{fmt(r.bot.sent)}</span> requisições, <span className="font-mono">{fmt(r.bot.limited)}</span> barradas com 429 <HelpDot id="bot" />. Todos
          os clientes juntos: {fmt(r.errorRate * 100, 1)}% de erro.
        </div>
      )}
      {r.timeline.some((p) => p.instances !== undefined) && (
        <div className="rounded-md border border-border p-2 text-xs text-muted">
          Custo dos servidores: <span className="font-mono">{fmt(r.workerHours, 2)}</span> worker-horas <HelpDot id="custo-worker-hora" /> · instâncias de{" "}
          {fmt(Math.min(...r.timeline.map((p) => p.instances ?? Infinity)))} a {fmt(Math.max(...r.timeline.map((p) => p.instances ?? 0)))}
        </div>
      )}
      {r.warnings.map((w) => (
        <p key={w} className="text-xs text-warn">{w}</p>
      ))}
      <div>
        <div className="mb-1 flex items-center gap-1.5 hud-label">
          Onde quebrou <HelpDot id="gargalo" label="onde quebrou" />
        </div>
        <ul className="flex list-disc flex-col gap-1 pl-4 text-muted">
          {r.diagnosis.map((d, i) => (
            <li key={i}><Bold text={d} /></li>
          ))}
        </ul>
      </div>
      <div>
        <div className="mb-1 flex items-center gap-1.5 hud-label">
          Linha do tempo <HelpDot id="grafico" label="como ler o gráfico" />
          <span className="ml-auto normal-case tracking-normal text-[10px] text-muted">
            verde ok · vermelho erro · azul p99{r.timeline.some((p) => p.instances !== undefined) ? " · laranja instâncias" : ""}
          </span>
        </div>
        <TimelineChart points={r.timeline} />
      </div>
      <details className="text-xs text-muted">
        <summary className="cursor-pointer">Detalhes por componente</summary>
        <table className="mt-2 w-full font-mono">
          <thead>
            <tr className="text-left"><th>nó</th><th>util. <HelpDot id="utilizacao" /></th><th>rejeit. <HelpDot id="fila-interna" /></th><th>fila máx <HelpDot id="backlog" /></th><th>lag máx <HelpDot id="replication-lag" /></th></tr>
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
