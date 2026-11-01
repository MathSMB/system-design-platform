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
import { SystemNode } from "./SystemNode";
import { useCanvas } from "./store";
import { useSimulation } from "./useSimulation";

const nodeTypes = { system: SystemNode };

function Board() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, select } = useCanvas();
  const result = useCanvas((s) => s.result);
  const layoutVersion = useCanvas((s) => s.layoutVersion);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // reenquadra quando uma trilha ou um desenho salvo é carregado
  useEffect(() => {
    const t = setTimeout(() => void fitView({ padding: 0.15, duration: 300 }), 50);
    return () => clearTimeout(t);
  }, [layoutVersion, fitView]);

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
      {/* grade estilo blueprint: linhas finas a cada 24px e mais fortes a cada 96px */}
      <Background id="fine" variant={BackgroundVariant.Lines} gap={24} lineWidth={1} color="rgba(34,228,255,0.035)" />
      <Background id="major" variant={BackgroundVariant.Lines} gap={96} lineWidth={1} color="rgba(34,228,255,0.08)" />
      <Controls />
      <MiniMap pannable zoomable nodeColor="#22e4ff" nodeStrokeWidth={0} maskColor="rgba(5,6,11,0.65)" />
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
    <div className="grid h-[calc(100vh-3rem)] grid-cols-[200px_1fr_380px]">
      <aside className="flex flex-col gap-5 overflow-y-auto border-r border-border bg-panel/60 p-3">
        <Palette onAdd={(k) => addNode(k, { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 })} />
        <div className="flex flex-col gap-1">
          <div className="mb-1 hud-label">Trilha</div>
          {Object.entries(PRESETS).map(([id, p]) => (
            <button key={id} onClick={() => loadPreset(id)} className="rounded px-1 py-0.5 text-left text-xs text-muted transition-colors hover:bg-accent/10 hover:text-accent">{p.title}</button>
          ))}
        </div>
        <DesignsBar />
      </aside>

      <section className="relative bg-bg">
        <ReactFlowProvider>
          <Board />
        </ReactFlowProvider>
        <div className="panel absolute left-3 top-3 flex items-center gap-2 p-2 text-sm backdrop-blur">
          <span className="text-muted">Duração</span>
          <input type="number" className="w-16" min={5} max={600} value={durationSec} onChange={(e) => set({ durationSec: Number(e.target.value) })} />
          <span className="text-muted">s</span>
          <button onClick={run} disabled={running} className="btn-neon px-3 py-1 text-xs disabled:opacity-50">
            {running ? "Simulando…" : "▶ Simular"}
          </button>
        </div>
      </section>

      <aside className="flex flex-col overflow-y-auto border-l border-border bg-panel/60">
        <div className="border-b border-border p-3">
          <Inspector />
        </div>
        <div className="flex gap-4 border-b border-border px-3 pt-2 text-sm">
          {(["sim", "ai"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-2 text-xs font-semibold uppercase tracking-[0.14em] ${tab === t ? "border-b-2 border-accent text-accent glow" : "text-muted hover:text-text"}`}>
              {t === "sim" ? "Simulação" : "Avaliação"}
            </button>
          ))}
        </div>
        <div className="p-3">{tab === "sim" ? <ResultsPanel /> : <EvaluationPanel />}</div>
      </aside>
    </div>
  );
}
