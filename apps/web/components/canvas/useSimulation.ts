"use client";

import { validateGraph, type SimResult } from "@sdp/sim-engine";
import { useCallback, useEffect, useRef } from "react";
import { useCanvas } from "./store";

export function useSimulation() {
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);

  return useCallback(() => {
    const s = useCanvas.getState();
    const graph = s.toGraph();
    const problems = validateGraph(graph);
    if (problems.length) {
      s.set({ error: problems.join(" "), result: null });
      return;
    }
    worker.current?.terminate();
    const w = new Worker(new URL("../../workers/sim.worker.ts", import.meta.url), { type: "module" });
    worker.current = w;
    s.set({ running: true, error: null });
    w.onmessage = (ev: MessageEvent<{ ok: true; result: SimResult } | { ok: false; error: string }>) => {
      const data = ev.data;
      useCanvas.getState().set(data.ok ? { result: data.result, running: false } : { error: data.error, running: false });
      w.terminate();
    };
    w.postMessage({ graph, config: { durationSec: s.durationSec, seed: 42, warmupSec: 2, failures: s.failures } });
  }, []);
}
