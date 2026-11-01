"use client";

import { BaseEdge, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { memo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useCanvas } from "./store";

/** Formato do "pacote": uma setinha apontando para frente (rotate="auto" a alinha ao caminho). */
const ARROW = "M -5 -3.5 L 4 0 L -5 3.5 L -2.5 0 Z";

interface Flow {
  /** req/s estimadas passando por esta aresta */
  rps: number;
  /** fração barrada no destino (rejeitada ou destino fora do ar) */
  blockedShare: number;
  targetDown: boolean;
}

/** Estima o fluxo da aresta a partir das métricas do destino, dividido entre as arestas que chegam nele. */
function useFlow(target: string): Flow | null {
  return useCanvas(
    useShallow((s): Flow | null => {
    const r = s.result;
    if (!r) return null;
    const t = r.nodes.find((n) => n.nodeId === target);
    const indeg = Math.max(1, s.edges.filter((e) => e.target === target).length);
    const sec = Math.max(1, r.simulatedSec);
    const rps = t ? t.arrivals / sec / indeg : 0;
    const targetDown = t?.status === "down";
    const blockedShare = targetDown ? 1 : t && t.arrivals > 0 ? t.rejected / t.arrivals : 0;
    return { rps, blockedShare, targetDown };
    }),
  );
}

/**
 * Aresta com tráfego: setinhas andam da origem ao destino.
 * Mais tráfego = mais setinhas e mais rápidas. Setinhas vermelhas são barradas antes de chegar
 * (destino rejeitando ou fora do ar), e o fim da aresta ganha um bloqueio piscando.
 */
function TrafficEdgeImpl(props: EdgeProps) {
  const { id, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, selected } = props;
  const [path] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const flow = useFlow(target);
  const running = useCanvas((s) => s.running);

  const length = Math.abs(targetX - sourceX) + Math.abs(targetY - sourceY) + 1;
  const active = !!flow && flow.rps > 0.5;
  const blocked = !!flow && flow.blockedShare > 0.01;
  const totalBlock = !!flow && flow.targetDown;

  // quantidade e velocidade crescem com o log do tráfego
  const lg = active ? Math.log10(flow.rps + 1) : 0;
  const count = running ? 2 : active ? Math.min(9, Math.max(1, Math.round(lg * 2.2))) : 0;
  const speed = running ? 45 : 60 + lg * 35; // px/s
  const dur = Math.max(0.8, length / speed);
  const redCount = !active ? 0 : totalBlock ? count : blocked ? Math.max(1, Math.round(count * Math.min(1, flow.blockedShare * 2))) : 0;

  const stroke = totalBlock ? "var(--down)" : blocked ? "var(--bad)" : active ? "rgba(34,228,255,0.55)" : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "var(--accent-2)" : stroke,
          strokeWidth: active ? 1.8 : 1.4,
          strokeDasharray: active ? "4 6" : "3 5",
          filter: active ? `drop-shadow(0 0 3px ${stroke})` : undefined,
        }}
      />
      {Array.from({ length: count }, (_, i) => {
        // espalha as setas vermelhas entre as azuis
        const red = redCount > 0 && i % Math.max(1, Math.round(count / redCount)) === 0;
        const begin = `${(-i * dur) / count}s`;
        const color = running ? "var(--muted)" : red ? "var(--down)" : "var(--accent)";
        return (
          <path key={`${id}-${i}-${count}-${red}`} d={ARROW} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
            {red ? (
              <>
                {/* barrada: anda até perto do destino e some */}
                <animateMotion dur={`${dur}s`} begin={begin} repeatCount="indefinite" rotate="auto" path={path} keyPoints="0;0.86" keyTimes="0;1" calcMode="linear" />
                <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.75;1" dur={`${dur}s`} begin={begin} repeatCount="indefinite" />
              </>
            ) : (
              <animateMotion dur={`${dur}s`} begin={begin} repeatCount="indefinite" rotate="auto" path={path} />
            )}
          </path>
        );
      })}
      {blocked && !running && (
        <g transform={`translate(${targetX - 14}, ${targetY})`} className="edge-block">
          <circle r={7} fill="var(--bg)" stroke={totalBlock ? "var(--down)" : "var(--bad)"} strokeWidth={1.5} />
          <path d="M -3 -3 L 3 3 M 3 -3 L -3 3" stroke={totalBlock ? "var(--down)" : "var(--bad)"} strokeWidth={1.8} strokeLinecap="round" />
        </g>
      )}
    </>
  );
}

export const TrafficEdge = memo(TrafficEdgeImpl);
