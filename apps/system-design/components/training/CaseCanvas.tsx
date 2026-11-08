"use client";

import { useCallback } from "react";
import { Canvas } from "@/components/canvas/Canvas";
import { useCanvas } from "@/components/canvas/store";
import { getCase } from "@/lib/training/cases";
import { Coach } from "./Coach";

export function CaseCanvas({ id }: { id: string }) {
  const c = getCase(id)!;
  const setup = useCallback(() => {
    const s = useCanvas.getState();
    s.loadGraph(c.start);
    // os Usuários definem a carga da aula: não podem ser apagados
    s.setLocked(c.start.nodes.filter((n) => n.kind === "client").map((n) => n.id));
    s.set({ problem: `${c.title}: ${c.summary}`, durationSec: c.durationSec ?? 60 });
  }, [c]);
  return <Canvas coach={<Coach c={c} onRestart={setup} />} setup={setup} />;
}
