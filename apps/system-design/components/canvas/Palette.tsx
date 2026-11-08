"use client";

import { KIND_LABEL, type NodeKind } from "@sdp/sim-engine";
import { KIND_COLOR, KIND_GLYPH } from "./icons";

const KINDS: NodeKind[] = ["client", "loadBalancer", "server", "cache", "cdn", "database", "queue", "external", "rateLimiter"];

export function Palette({ onAdd, compact = false }: { onAdd: (k: NodeKind) => void; compact?: boolean }) {
  if (compact) {
    // versão em grade, só ícones, para sobrar espaço para o mentor
    return (
      <div data-tour="palette">
        <div className="mb-1.5 hud-label">Componentes</div>
        <div className="grid grid-cols-4 gap-1.5">
          {KINDS.map((k) => {
            const Icon = KIND_GLYPH[k];
            return (
              <button
                key={k}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("application/sdp-kind", k)}
                onClick={() => onAdd(k)}
                className="btn-ghost flex flex-col items-center gap-1 px-1 py-1.5 text-[10px] leading-tight"
                title={`${KIND_LABEL[k]}: arraste para o canvas ou clique`}
              >
                <Icon size={16} strokeWidth={2} style={{ color: KIND_COLOR[k] }} />
                <span className="w-full truncate text-center">{KIND_LABEL[k]}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5" data-tour="palette">
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
