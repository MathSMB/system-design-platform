"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { baseRps } from "@sdp/sim-engine";
import type { ClientParams, NodeStatus } from "@sdp/sim-engine";
import { memo, type CSSProperties } from "react";
import { KIND_COLOR, KIND_GLYPH } from "./icons";
import { useCanvas, type SysNode } from "./store";

const W = 150;
const TILE = 64;
const STATUS_COLOR: Record<NodeStatus, string> = {
  ok: "var(--ok)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  down: "var(--down)",
};

/** Nó do canvas: ícone em cima (tile neon) e o nome embaixo, como nos diagramas de arquitetura. */
function SystemNodeImpl({ id, data, selected }: NodeProps<SysNode>) {
  const metrics = useCanvas((s) => s.result?.nodes.find((n) => n.nodeId === id));
  const failing = useCanvas((s) => s.failures.some((f) => f.nodeId === id));
  const status = metrics?.status;
  const color = status ? STATUS_COLOR[status] : KIND_COLOR[data.kind];
  const Icon = KIND_GLYPH[data.kind];

  let sub = "";
  if (data.kind === "client") {
    const p = data.params as unknown as ClientParams;
    sub = `pico ≈ ${Math.round(baseRps(p) * p.peakFactor).toLocaleString("pt-BR")} req/s`;
  } else if (metrics && data.kind !== "loadBalancer") {
    sub = data.kind === "queue" ? `fila máx ${metrics.maxQueue.toLocaleString("pt-BR")}` : `${Math.round(metrics.utilization * 100)}% ocupado`;
    if (metrics.replicaUtilization !== undefined) {
      sub = `prim. ${Math.round(metrics.utilization * 100)}% · rép. ${Math.round(metrics.replicaUtilization * 100)}%`;
    }
  }
  const replicas = data.kind === "database" ? Number(data.params.readReplicas ?? 0) : 0;
  const lag = metrics?.replicationLag;
  const usage = metrics && data.kind !== "client" && data.kind !== "loadBalancer" && data.kind !== "queue" ? Math.min(1, metrics.utilization) : null;

  const tileStyle: CSSProperties = {
    width: TILE,
    height: TILE,
    borderColor: color,
    color,
    boxShadow: `0 0 ${selected ? 22 : 12}px color-mix(in srgb, ${color} ${selected ? 70 : 45}%, transparent), inset 0 0 14px color-mix(in srgb, ${color} 18%, transparent)`,
  };
  // as conexões saem das laterais do ícone, não das bordas do nó inteiro
  const inset = (W - TILE) / 2;

  return (
    <div style={{ width: W }} className="group relative flex flex-col items-center">
      <div className="relative" style={{ width: TILE, height: TILE }}>
        {/* réplicas de leitura aparecem como cópias empilhadas atrás do banco */}
        {Array.from({ length: Math.min(replicas, 3) }, (_, i) => (
          <div
            key={i}
            className="absolute rounded-xl border bg-panel"
            style={{ width: TILE, height: TILE, left: (i + 1) * 6, top: (i + 1) * 6, borderColor: color, opacity: 0.45 - i * 0.12, zIndex: -1 - i }}
          />
        ))}
        <div
          className={`relative flex items-center justify-center rounded-xl border-2 bg-[linear-gradient(160deg,#141a2e,#070a12)] transition-shadow ${status === "down" ? "node-tile-down" : ""}`}
          style={tileStyle}
        >
          <Icon size={30} strokeWidth={1.75} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
          {selected && <div className="pointer-events-none absolute -inset-[7px] rounded-[15px] border border-dashed border-accent-2" />}
          {failing && (
            <div className="absolute -right-2 -top-2 rounded-sm bg-down px-1 font-mono text-[9px] font-bold leading-4 text-bg shadow-[0_0_8px_var(--down)]">
              {status === "down" ? "OFF" : "!"}
            </div>
          )}
          {replicas > 0 && (
            <div className="absolute -bottom-2 -right-2 rounded-sm border border-current bg-bg px-1 font-mono text-[9px] leading-4">×{replicas + 1}</div>
          )}
        </div>
      </div>

      {usage !== null && (
        <div className="mt-2 h-1 w-16 overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full" style={{ width: `${Math.max(4, usage * 100)}%`, background: color, boxShadow: `0 0 6px ${color}` }} />
        </div>
      )}
      <div className={`${usage !== null ? "mt-1.5" : "mt-2.5"} max-w-full truncate text-center text-[14px] font-semibold uppercase leading-tight tracking-wide text-text`}>
        {data.label}
      </div>
      {sub && <div className="mt-0.5 text-center font-mono text-[11px] leading-tight text-muted">{sub}</div>}
      {replicas > 0 && (
        <div className={`text-center font-mono text-[10px] leading-tight ${lag && lag.maxMs > 1000 ? "text-bad" : "text-muted"}`}>
          {lag ? `lag ${Math.round(lag.avgMs).toLocaleString("pt-BR")} ms` : `+${replicas} réplica${replicas > 1 ? "s" : ""}`}
        </div>
      )}
      {failing && <div className="text-center font-mono text-[10px] leading-tight text-down">falha programada</div>}

      {data.kind !== "client" && <Handle type="target" position={Position.Left} style={{ top: TILE / 2, left: inset }} />}
      <Handle type="source" position={Position.Right} style={{ top: TILE / 2, right: inset }} />
    </div>
  );
}

export const SystemNode = memo(SystemNodeImpl);
