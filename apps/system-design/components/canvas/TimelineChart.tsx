"use client";

import type { TimelinePoint } from "@sdp/sim-engine";
import { useEffect, useRef } from "react";
import uPlot from "uplot";

/** Throughput (ok/erro por segundo) e p99 ao longo do tempo. */
export function TimelineChart({ points }: { points: TimelinePoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || points.length === 0) return;
    const scaled = points.some((p) => p.instances !== undefined);
    const data: uPlot.AlignedData = [
      points.map((p) => p.t),
      points.map((p) => p.okRps),
      points.map((p) => p.errorRps),
      points.map((p) => p.p99Ms),
      ...(scaled ? [points.map((p) => p.instances ?? null)] : []),
    ];
    const axis = { stroke: "#7d8bab", grid: { stroke: "#151b30" }, ticks: { stroke: "#151b30" } };
    const plot = new uPlot(
      {
        width: el.clientWidth,
        height: 160,
        legend: { show: true },
        scales: { x: { time: false }, ...(scaled ? { inst: { range: (_u: uPlot, _min: number, max: number) => [0, Math.max(2, max * 1.2)] as uPlot.Range.MinMax } } : {}) },
        axes: [
          { ...axis, label: "segundos" },
          { ...axis, label: "req/s", size: 60 },
          { ...axis, side: 1, scale: "ms", label: "p99 ms", grid: { show: false }, size: 60 },
        ],
        series: [
          {},
          { label: "ok/s", stroke: "#39ff8f", width: 1.5 },
          { label: "erros/s", stroke: "#ff4d6d", width: 1.5 },
          { label: "p99 (ms)", stroke: "#22e4ff", width: 1.5, scale: "ms" },
          ...(scaled ? [{ label: "instâncias", stroke: "#ff8a3d", width: 2, scale: "inst", dash: [6, 4] }] : []),
        ],
      },
      data,
      el,
    );
    return () => plot.destroy();
  }, [points]);
  return <div ref={ref} className="w-full" />;
}
