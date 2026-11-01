"use client";

import { useCallback } from "react";
import { Canvas } from "@/components/canvas/Canvas";
import { useCanvas } from "@/components/canvas/store";
import { getCase } from "@/lib/training/cases";
import { Coach } from "./Coach";

export function CaseCanvas({ id }: { id: string }) {
  const c = getCase(id)!;
  const setup = useCallback(() => {
    useCanvas.getState().loadGraph(c.start);
    useCanvas.getState().set({ problem: `${c.title}: ${c.summary}` });
  }, [c]);
  return <Canvas coach={<Coach c={c} />} setup={setup} />;
}
