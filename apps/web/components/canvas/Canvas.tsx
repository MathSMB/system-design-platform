"use client";

import { Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { PRESETS, type NodeKind } from "@sdp/sim-engine";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type DragEvent } from "react";
import { DesignsBar } from "./DesignsBar";
import { EvaluationPanel } from "./EvaluationPanel";
import { Inspector } from "./Inspector";
import { Palette } from "./Palette";
import { ResultsPanel } from "./ResultsPanel";
import { SketchNode } from "./SketchNode";
import { useCanvas } from "./store";
import { useSimulation } from "./useSimulation";

const nodeTypes = { system: SketchNode };

function Board() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, select } = useCanvas();
  const result = useCanvas((s) => s.result);
  const { screenToFlowPosition } = useReactFlow();

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/sdp-kind") as NodeKind;
    if (kind) addNode(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  };

  // arestas animadas quando há tráfego simulado
  const styledEdges = edges.map((e) => ({ ...e, animated: !!result }));

  return (
    <ReactFlow
      nodes={nodes}
      edges={styledEdges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, n) => select(n.id)}
      onPaneClick={() => select(null)}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      defaultEdgeOptions={{ type: "smoothstep" }}
      colorMode="dark"
      fitView
      deleteKeyCode={["Delete", "Backspace"]}
    >
      <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#2a3038" />
      <Controls />
      <MiniMap pannable zoomable />
    </ReactFlow>
  );
}

export function Canvas() {
  const params = useSearchParams();
  const [tab, setTab] = useState<"sim" | "ai">("sim");
  const { loadPreset, addNode, set } = useCanvas.getState();
  const durationSec = useCanvas((s) => s.durationSec);
  const running = useCanvas((s) => s.running);
  const run = useSimulation();

  useEffect(() => {
    loadPreset(params.get("preset") ?? "singleServer");
  }, [params, loadPreset]);

  return (
    <div className="grid h-[calc(100vh-3rem)] grid-cols-[180px_1fr_380px]">
      <aside className="flex flex-col gap-4 overflow-y-auto border-r border-border p-3">
        <Palette onAdd={(k) => addNode(k, { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 })} />
        <div className="flex flex-col gap-1">
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Trilha</div>
          {Object.entries(PRESETS).map(([id, p]) => (
            <button key={id} onClick={() => loadPreset(id)} className="text-left text-xs text-muted hover:text-text">{p.title}</button>
          ))}
        </div>
        <DesignsBar />
      </aside>

      <section className="relative">
        <ReactFlowProvider>
          <Board />
        </ReactFlowProvider>
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-md border border-border bg-panel/90 p-2 text-sm backdrop-blur">
          <span className="text-muted">Duração</span>
          <input type="number" className="w-16" min={5} max={600} value={durationSec} onChange={(e) => set({ durationSec: Number(e.target.value) })} />
          <span className="text-muted">s</span>
          <button onClick={run} disabled={running} className="rounded-md bg-accent px-3 py-1 font-medium text-bg disabled:opacity-50">
            {running ? "Simulando…" : "▶ Simular"}
          </button>
        </div>
      </section>

      <aside className="flex flex-col overflow-y-auto border-l border-border">
        <div className="border-b border-border p-3">
          <Inspector />
        </div>
        <div className="flex gap-4 border-b border-border px-3 pt-2 text-sm">
          {(["sim", "ai"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-2 ${tab === t ? "border-b-2 border-accent text-text" : "text-muted"}`}>
              {t === "sim" ? "Simulação" : "Avaliação"}
            </button>
          ))}
        </div>
        <div className="p-3">{tab === "sim" ? <ResultsPanel /> : <EvaluationPanel />}</div>
      </aside>
    </div>
  );
}
