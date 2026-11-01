"use client";

import { KIND_LABEL, type NodeKind } from "@sdp/sim-engine";
import { KIND_COLOR, KIND_GLYPH } from "./icons";

const KINDS: NodeKind[] = ["client", "loadBalancer", "server", "cache", "cdn", "database", "queue", "external"];

export function Palette({ onAdd }: { onAdd: (k: NodeKind) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="mb-1 hud-label">Componentes</div>
      {KINDS.map((k) => {
        const Icon = KIND_GLYPH[k];
        return (
          <button
            key={k}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("application/sdp-kind", k)}
            onClick={() => onAdd(k)}
            className="btn-ghost flex items-center gap-2.5 px-2 py-1.5 text-left text-sm"
            title="Arraste para o canvas ou clique"
          >
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border bg-bg"
              style={{ color: KIND_COLOR[k], borderColor: `color-mix(in srgb, ${KIND_COLOR[k]} 55%, transparent)` }}
            >
              <Icon size={15} strokeWidth={2} />
            </span>
            <span>{KIND_LABEL[k]}</span>
          </button>
        );
      })}
    </div>
  );
}
