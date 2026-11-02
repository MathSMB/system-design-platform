"use client";

import { KIND_LABEL } from "@sdp/sim-engine";
import { HelpDot } from "@/components/glossary/Glossary";
import { FIELDS } from "./defaults";

/** Campo do painel → termo do glossário que o explica. */
const FIELD_HELP: Record<string, string> = {
  dailyActiveUsers: "dau",
  requestsPerUserPerDay: "dau",
  peakFactor: "fator-de-pico",
  pattern: "padrao-de-trafego",
  timeoutMs: "timeout",
  writeRatio: "fracao-escritas",
  readAfterWriteMs: "rele-depois",
  algorithm: "least-outstanding",
  workers: "workers",
  serviceTimeMs: "tempo-de-servico",
  queueCapacity: "fila-interna",
  retries: "retries",
  hitRate: "hit-rate",
  readReplicas: "replica-de-leitura",
  replicationDelayMs: "replication-lag",
  readYourWritesMs: "read-your-writes",
  capacity: "fila",
  consumers: "fila",
  errorRate: "externo",
};
const KIND_HELP: Record<string, string> = {
  client: "usuarios",
  loadBalancer: "load-balancer",
  server: "servidor",
  cache: "cache",
  cdn: "cdn",
  database: "banco",
  queue: "fila",
  external: "externo",
};
import { useCanvas } from "./store";

export function Inspector() {
  const node = useCanvas((s) => s.nodes.find((n) => n.id === s.selectedId));
  const failure = useCanvas((s) => s.failures.find((f) => f.nodeId === s.selectedId));
  const { updateNode, removeSelected, setFailure, durationSec } = useCanvas.getState();
  const locked = useCanvas((s) => (s.selectedId ? s.locked.includes(s.selectedId) : false));

  if (!node) {
    return <p className="text-sm text-muted">Selecione um componente para editar os parâmetros. Conecte arrastando da bolinha da direita.</p>;
  }
  const { kind, label, params } = node.data;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-1.5 hud-label">
        {KIND_LABEL[kind]} <HelpDot id={KIND_HELP[kind]!} label={KIND_LABEL[kind]} />
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-muted">Nome</span>
        <input value={label} onChange={(e) => updateNode(node.id, { label: e.target.value })} />
      </label>
      {FIELDS[kind].map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="flex items-center gap-1.5 text-muted">
            {f.label} {FIELD_HELP[f.key] && <HelpDot id={FIELD_HELP[f.key]!} label={f.label} />}
          </span>
          {f.type === "number" ? (
            <input
              type="number"
              step={f.step ?? 1}
              min={f.min}
              max={f.max}
              value={Number(params[f.key] ?? 0)}
              onChange={(e) => updateNode(node.id, { params: { ...params, [f.key]: Number(e.target.value) } })}
            />
          ) : (
            <select value={String(params[f.key])} onChange={(e) => updateNode(node.id, { params: { ...params, [f.key]: e.target.value } })}>
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
          {f.help && <span className="text-[11px] text-muted">{f.help}</span>}
        </label>
      ))}
      {kind !== "client" && (
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!failure}
            onChange={(e) => setFailure(node.id, e.target.checked ? Math.round(durationSec / 3) : null)}
          />
          <span>Derrubar no segundo</span>
          <HelpDot id="derrubar" />
          {failure && (
            <input
              type="number"
              className="w-16"
              min={0}
              value={failure.atSec}
              onChange={(e) => setFailure(node.id, Number(e.target.value))}
            />
          )}
        </label>
      )}
      {locked ? (
        <span className="mt-2 text-xs text-muted">🔒 Faz parte do enunciado: não pode ser removido.</span>
      ) : (
        <button onClick={removeSelected} className="mt-2 self-start text-xs text-down hover:underline">Remover componente</button>
      )}
    </div>
  );
}
