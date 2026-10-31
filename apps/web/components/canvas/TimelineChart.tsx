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
    const data: uPlot.AlignedData = [
      points.map((p) => p.t),
      points.map((p) => p.okRps),
      points.map((p) => p.errorRps),
      points.map((p) => p.p99Ms),
    ];
    const axis = { stroke: "#8b939e", grid: { stroke: "#1f242b" }, ticks: { stroke: "#1f242b" } };
    const plot = new uPlot(
      {
        width: el.clientWidth,
        height: 160,
        legend: { show: true },
        scales: { x: { time: false } },
        axes: [
          { ...axis, label: "segundos" },
          { ...axis, label: "req/s", size: 60 },
          { ...axis, side: 1, scale: "ms", label: "p99 ms", grid: { show: false }, size: 60 },
        ],
        series: [
          {},
          { label: "ok/s", stroke: "#4ade80", width: 1.5 },
          { label: "erros/s", stroke: "#f87171", width: 1.5 },
          { label: "p99 (ms)", stroke: "#7c9cff", width: 1.5, scale: "ms" },
        ],
      },
      data,
      el,
    );
    return () => plot.destroy();
  }, [points]);
  return <div ref={ref} className="w-full" />;
}
