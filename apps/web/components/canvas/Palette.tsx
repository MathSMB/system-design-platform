"use client";

import { KIND_LABEL, type NodeKind } from "@sdp/sim-engine";
import { KIND_ICON } from "./defaults";

const KINDS: NodeKind[] = ["client", "loadBalancer", "server", "cache", "cdn", "database", "queue", "external"];

export function Palette({ onAdd }: { onAdd: (k: NodeKind) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Componentes</div>
      {KINDS.map((k) => (
        <button
          key={k}
          draggable
          onDragStart={(e) => e.dataTransfer.setData("application/sdp-kind", k)}
          onClick={() => onAdd(k)}
          className="flex items-center gap-2 rounded-md border border-border bg-panel-2 px-2 py-1.5 text-left text-sm hover:border-accent"
          title="Arraste para o canvas ou clique"
        >
          <span>{KIND_ICON[k]}</span>
          <span>{KIND_LABEL[k]}</span>
        </button>
      ))}
    </div>
  );
}
