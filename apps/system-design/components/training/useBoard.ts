"use client";

import type { SimResult } from "@sdp/sim-engine";
import { useCanvas } from "@/components/canvas/store";
import type { Board } from "@/lib/training/types";

/** Monta o que as checagens enxergam. O resultado só vale se a simulação rodou no desenho atual. */
export function readBoard(before: SimResult | null): Board {
  const s = useCanvas.getState();
  return {
    nodes: s.nodes,
    edges: s.edges,
    failures: s.failures,
    result: s.result && s.resultVersion === s.graphVersion ? s.result : null,
    before,
  };
}
