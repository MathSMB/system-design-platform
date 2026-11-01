"use client";

import { KIND_LABEL } from "@sdp/sim-engine";
import { FIELDS } from "./defaults";
import { useCanvas } from "./store";

export function Inspector() {
  const node = useCanvas((s) => s.nodes.find((n) => n.id === s.selectedId));
  const failure = useCanvas((s) => s.failures.find((f) => f.nodeId === s.selectedId));
  const { updateNode, removeSelected, setFailure, durationSec } = useCanvas.getState();

  if (!node) {
    return <p className="text-sm text-muted">Selecione um componente para editar os parâmetros. Conecte arrastando da bolinha da direita.</p>;
  }
  const { kind, label, params } = node.data;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="font-mono text-[11px] uppercase tracking-wider text-muted">{KIND_LABEL[kind]}</div>
      <label className="flex flex-col gap-1">
        <span className="text-muted">Nome</span>
        <input value={label} onChange={(e) => updateNode(node.id, { label: e.target.value })} />
      </label>
      {FIELDS[kind].map((f) => (
        <label key={f.key} className="flex flex-col gap-1">
          <span className="text-muted">{f.label}</span>
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
      <button onClick={removeSelected} className="mt-2 self-start text-xs text-down hover:underline">Remover componente</button>
    </div>
  );
}
