"use client";

import { Background, BackgroundVariant, Controls, MarkerType, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { PRESETS, type NodeKind } from "@sdp/sim-engine";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, type DragEvent, type ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import { Tour } from "@/components/tour/Tour";
import { CANVAS_TOUR } from "@/components/tour/steps";
import { DesignsBar } from "./DesignsBar";
import { EvaluationPanel } from "./EvaluationPanel";
import { Inspector } from "./Inspector";
import { Palette } from "./Palette";
import { ResultsPanel } from "./ResultsPanel";
import { SystemNode } from "./SystemNode";
import { TrafficEdge } from "./TrafficEdge";
import { useCanvas } from "./store";
import { useSimulation } from "./useSimulation";

const nodeTypes = { system: SystemNode };
const edgeTypes = { traffic: TrafficEdge };
const ARROW_END = { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "#3f6f8f" };

function Board() {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, select } = useCanvas();
  const layoutVersion = useCanvas((s) => s.layoutVersion);
  const { screenToFlowPosition, fitView } = useReactFlow();

  // reenquadra quando uma trilha ou um desenho salvo é carregado
  useEffect(() => {
    const t = setTimeout(() => void fitView({ padding: 0.15, duration: 300, maxZoom: 1.1 }), 50);
    return () => clearTimeout(t);
  }, [layoutVersion, fitView]);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData("application/sdp-kind") as NodeKind;
    if (kind) addNode(kind, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  };

  // toda aresta mostra o tráfego com setinhas andando (TrafficEdge)
  const styledEdges = edges.map((e) => ({ ...e, type: "traffic", markerEnd: ARROW_END }));

  return (
    <ReactFlow
      nodes={nodes}
      edges={styledEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeClick={(_, n) => select(n.id)}
      onPaneClick={() => select(null)}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      defaultEdgeOptions={{ type: "traffic" }}
      colorMode="dark"
      fitView
      fitViewOptions={{ maxZoom: 1.1 }}
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

/**
 * Tela do canvas. Sem props é o modo livre (trilha e desenhos salvos).
 * Com `coach`, o painel da esquerda vira o mentor (cases guiados e desafios) e `setup` monta o desenho inicial.
 */
/** Primeira vaga livre numa grade de colunas, para o componente clicado não cair em cima de outro. */
function freeSlot() {
  const taken = useCanvas.getState().nodes.map((n) => n.position);
  for (let col = 0; col < 12; col++)
    for (let row = 0; row < 6; row++) {
      const pos = { x: 60 + col * 230, y: 60 + row * 150 };
      if (taken.every((t) => Math.abs(t.x - pos.x) > 150 || Math.abs(t.y - pos.y) > 100)) return pos;
    }
  return { x: 60 + Math.random() * 400, y: 60 + Math.random() * 300 };
}

export function Canvas({ coach, setup }: { coach?: ReactNode; setup?: () => void } = {}) {
  const params = useSearchParams();
  const [tourOpen, setTourOpen] = useState(false);
  const [tab, setTab] = useState<"sim" | "ai">("sim");
  const { loadPreset, addNode, set } = useCanvas.getState();
  const durationSec = useCanvas((s) => s.durationSec);
  const running = useCanvas((s) => s.running);
  const run = useSimulation();

  useEffect(() => {
    if (setup) setup();
    else loadPreset(params.get("preset") ?? "singleServer");
  }, [params, loadPreset, setup]);

  useEffect(() => {
    if (params.get("tour") === "1") setTourOpen(true);
  }, [params]);

  return (
    <div className={`grid h-[calc(100vh-3rem)] ${coach ? "grid-cols-[340px_1fr_360px]" : "grid-cols-[200px_1fr_380px]"}`}>
      <aside className="flex flex-col gap-5 overflow-y-auto border-r border-border bg-panel/60 p-3">
        <Palette compact={!!coach} onAdd={(k) => addNode(k, freeSlot())} />
        {coach}
        {!coach && (
        <>
        <div className="flex flex-col gap-1" data-tour="trilha">
          <div className="mb-1 hud-label">Trilha</div>
          {Object.entries(PRESETS).map(([id, p]) => (
            <button key={id} onClick={() => loadPreset(id)} className="rounded px-1 py-0.5 text-left text-xs text-muted transition-colors hover:bg-accent/10 hover:text-accent">{p.title}</button>
          ))}
        </div>
        <DesignsBar />
        </>
        )}
      </aside>

      <section className="relative bg-bg" data-tour="board">
        <ReactFlowProvider>
          <Board />
        </ReactFlowProvider>
        {running && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="scanline absolute inset-0" />
          </div>
        )}
        <div className="panel absolute left-3 top-3 flex items-center gap-2 p-2 text-sm backdrop-blur" data-tour="simulate">
          <span className="text-muted">Duração</span>
          <input type="number" className="w-16" min={5} max={600} value={durationSec} onChange={(e) => set({ durationSec: Number(e.target.value) })} />
          <span className="text-muted">s</span>
          <button onClick={run} disabled={running} className="btn-neon px-3 py-1 text-xs disabled:opacity-50">
            {running ? "Simulando…" : "▶ Simular"}
          </button>
          {!coach && (
            <button onClick={() => setTourOpen(true)} title="Tour pela tela" className="ml-1 text-muted transition-colors hover:text-accent">
              <HelpCircle size={18} />
            </button>
          )}
        </div>
      </section>

      <aside className="flex flex-col overflow-y-auto border-l border-border bg-panel/60">
        <div className="border-b border-border p-3" data-tour="inspector">
          <Inspector />
        </div>
        <div className="flex gap-4 border-b border-border px-3 pt-2 text-sm" data-tour="tabs">
          {(["sim", "ai"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`pb-2 text-xs font-semibold uppercase tracking-[0.14em] ${tab === t ? "border-b-2 border-accent text-accent glow" : "text-muted hover:text-text"}`}>
              {t === "sim" ? "Simulação" : "Avaliação"}
            </button>
          ))}
        </div>
        <div className="p-3">{tab === "sim" ? <ResultsPanel /> : <EvaluationPanel />}</div>
      </aside>
      {!coach && <Tour steps={CANVAS_TOUR} storageKey="sdp-tour-canvas-v1" open={tourOpen} onClose={() => setTourOpen(false)} />}
    </div>
  );
}
