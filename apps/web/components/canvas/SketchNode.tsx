"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { baseRps } from "@sdp/sim-engine";
import type { ClientParams, NodeStatus } from "@sdp/sim-engine";
import rough from "roughjs";
import { memo, useMemo } from "react";
import { KIND_ICON } from "./defaults";
import { useCanvas, type SysNode } from "./store";

const W = 170;
const H = 78;
const STATUS_COLOR: Record<NodeStatus, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  down: "var(--down)",
};

function hashSeed(s: string): number {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (h % 2_000_000) + 1;
}

/** Retângulo "desenhado à mão" com rough.js (seed fixa por nó, então não treme). */
function useSketch(id: string, kind: string, stroke: string, fill: string) {
  return useMemo(() => {
    const gen = rough.generator();
    const seed = hashSeed(id);
    const opts = { seed, roughness: 1.2, bowing: 1.5, stroke, strokeWidth: 1.6, fill, fillStyle: "hachure" as const, hachureGap: 9, fillWeight: 0.6 };
    const shape =
      kind === "database"
        ? gen.path(`M 6 14 Q ${W / 2} -2 ${W - 6} 14 L ${W - 6} ${H - 12} Q ${W / 2} ${H + 4} 6 ${H - 12} Z`, opts)
        : kind === "queue"
          ? gen.rectangle(6, 10, W - 12, H - 20, opts)
          : gen.rectangle(4, 4, W - 8, H - 8, opts);
    return gen.toPaths(shape);
  }, [id, kind, stroke, fill]);
}

function SketchNodeImpl({ id, data, selected }: NodeProps<SysNode>) {
  const metrics = useCanvas((s) => s.result?.nodes.find((n) => n.nodeId === id));
  const failing = useCanvas((s) => s.failures.some((f) => f.nodeId === id));
  const status = metrics?.status;
  const stroke = selected ? "var(--accent)" : status ? STATUS_COLOR[status] : "var(--ink)";
  const fill = status === "down" ? "rgba(248,113,113,0.25)" : status === "bad" ? "rgba(251,146,60,0.18)" : "rgba(124,156,255,0.10)";
  const paths = useSketch(id, data.kind, stroke, fill);

  let sub = "";
  if (data.kind === "client") {
    const p = data.params as unknown as ClientParams;
    sub = `pico ≈ ${Math.round(baseRps(p) * p.peakFactor).toLocaleString("pt-BR")} req/s`;
  } else if (metrics && data.kind !== "loadBalancer") {
    sub = data.kind === "queue" ? `fila máx ${metrics.maxQueue.toLocaleString("pt-BR")}` : `${Math.round(metrics.utilization * 100)}% ocupado`;
  }

  return (
    <div style={{ width: W, height: H }} className="relative">
      <svg width={W} height={H} className="absolute inset-0 overflow-visible">
        {paths.map((p, i) => (
          <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill ?? "none"} />
        ))}
      </svg>
      <div className="relative flex h-full flex-col items-center justify-center px-3 text-center">
        <div className="font-hand text-[15px] leading-tight text-text">
          {KIND_ICON[data.kind]} {data.label}
        </div>
        {sub && <div className="mt-0.5 font-mono text-[10px] text-muted">{sub}</div>}
        {failing && <div className="mt-0.5 font-mono text-[10px] text-down">falha programada</div>}
      </div>
      {data.kind !== "client" && <Handle type="target" position={Position.Left} />}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

export const SketchNode = memo(SketchNodeImpl);
