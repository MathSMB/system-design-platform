"use client";

import { addEdge, applyEdgeChanges, applyNodeChanges, type Connection, type Edge, type EdgeChange, type Node, type NodeChange } from "@xyflow/react";
import { KIND_LABEL, PRESETS, type FailureInjection, type Graph, type NodeKind, type SimNode, type SimResult } from "@sdp/sim-engine";
import { create } from "zustand";
import { DEFAULT_PARAMS } from "./defaults";

export type SysNodeData = { kind: NodeKind; label: string; params: Record<string, unknown> };
export type SysNode = Node<SysNodeData, "system">;

export interface SavedDocument {
  nodes: SysNode[];
  edges: Edge[];
  problem: string;
}

interface CanvasState {
  nodes: SysNode[];
  edges: Edge[];
  selectedId: string | null;
  durationSec: number;
  failures: FailureInjection[];
  problem: string;
  notes: string;
  result: SimResult | null;
  running: boolean;
  error: string | null;
  /** Muda sempre que um desenho inteiro é carregado, para o canvas reenquadrar. */
  layoutVersion: number;
  /** Muda a cada alteração no desenho (componente, conexão, parâmetro ou falha). */
  graphVersion: number;
  /** graphVersion do desenho que gerou o resultado atual; diferente = resultado desatualizado. */
  resultVersion: number;
  onNodesChange(c: NodeChange<SysNode>[]): void;
  onEdgesChange(c: EdgeChange[]): void;
  onConnect(c: Connection): void;
  addNode(kind: NodeKind, position: { x: number; y: number }): void;
  select(id: string | null): void;
  updateNode(id: string, patch: Partial<SysNodeData>): void;
  removeSelected(): void;
  setFailure(nodeId: string, atSec: number | null): void;
  set(p: Partial<Pick<CanvasState, "durationSec" | "problem" | "notes" | "result" | "running" | "error" | "resultVersion">>): void;
  loadPreset(id: string): void;
  loadDocument(doc: SavedDocument): void;
  /** Carrega um grafo qualquer (cases e desafios). */
  loadGraph(graph: Graph): void;
  toGraph(): Graph;
}

let counter = 0;
const newId = (kind: string) => `${kind}-${Date.now().toString(36)}-${counter++}`;

/** Layout simples em colunas, pela profundidade no grafo. */
function layout(graph: Graph): SysNode[] {
  const depth = new Map<string, number>();
  const visit = (id: string, d: number) => {
    if ((depth.get(id) ?? -1) >= d) return;
    depth.set(id, d);
    for (const e of graph.edges) if (e.source === id) visit(e.target, d + 1);
  };
  for (const n of graph.nodes) if (n.kind === "client") visit(n.id, 0);
  const perCol = new Map<number, number>();
  return graph.nodes.map((n) => {
    const d = depth.get(n.id) ?? 0;
    const row = perCol.get(d) ?? 0;
    perCol.set(d, row + 1);
    return {
      id: n.id,
      type: "system",
      position: { x: 60 + d * 230, y: 60 + row * 150 },
      data: { kind: n.kind, label: n.label ?? KIND_LABEL[n.kind], params: { ...n.params } },
    };
  });
}

export const useCanvas = create<CanvasState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedId: null,
  durationSec: 60,
  failures: [],
  problem: "Projete um sistema que aguente 1 milhão de usuários ativos por dia.",
  notes: "",
  result: null,
  running: false,
  error: null,
  layoutVersion: 0,
  graphVersion: 0,
  resultVersion: -1,

  onNodesChange: (c) =>
    set({
      nodes: applyNodeChanges(c, get().nodes),
      // mover, selecionar ou medir não muda o sistema
      graphVersion: get().graphVersion + (c.some((x) => x.type === "add" || x.type === "remove" || x.type === "replace") ? 1 : 0),
    }),
  onEdgesChange: (c) =>
    set({ edges: applyEdgeChanges(c, get().edges), graphVersion: get().graphVersion + (c.some((x) => x.type !== "select") ? 1 : 0) }),
  onConnect: (c) => set({ edges: addEdge({ ...c, id: newId("e") }, get().edges), graphVersion: get().graphVersion + 1 }),

  addNode: (kind, position) => {
    const id = newId(kind);
    set({
      nodes: [...get().nodes, { id, type: "system", position, data: { kind, label: KIND_LABEL[kind], params: { ...DEFAULT_PARAMS[kind] } } }],
      selectedId: id,
      graphVersion: get().graphVersion + 1,
    });
  },
  select: (id) => set({ selectedId: id }),
  updateNode: (id, patch) =>
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      graphVersion: get().graphVersion + 1,
    }),
  removeSelected: () => {
    const id = get().selectedId;
    if (!id) return;
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      failures: get().failures.filter((f) => f.nodeId !== id),
      selectedId: null,
      graphVersion: get().graphVersion + 1,
    });
  },
  setFailure: (nodeId, atSec) => {
    const rest = get().failures.filter((f) => f.nodeId !== nodeId);
    set({ failures: atSec === null ? rest : [...rest, { nodeId, atSec }], graphVersion: get().graphVersion + 1 });
  },
  set: (p) => set(p),

  loadPreset: (id) => {
    const p = PRESETS[id];
    if (!p) return;
    set({
      nodes: layout(p.graph),
      edges: p.graph.edges.map((e) => ({ ...e })),
      failures: [],
      result: null,
      selectedId: null,
      error: null,
      layoutVersion: get().layoutVersion + 1,
      graphVersion: get().graphVersion + 1,
    });
  },
  loadGraph: (graph) =>
    set({
      nodes: layout(graph),
      edges: graph.edges.map((e) => ({ ...e })),
      failures: [],
      result: null,
      selectedId: null,
      error: null,
      layoutVersion: get().layoutVersion + 1,
      graphVersion: get().graphVersion + 1,
    }),
  loadDocument: (doc) =>
    set({
      nodes: doc.nodes,
      edges: doc.edges,
      problem: doc.problem,
      failures: [],
      result: null,
      selectedId: null,
      layoutVersion: get().layoutVersion + 1,
      graphVersion: get().graphVersion + 1,
    }),

  toGraph: () => ({
    nodes: get().nodes.map((n) => ({ id: n.id, kind: n.data.kind, label: n.data.label, params: n.data.params }) as unknown as SimNode),
    edges: get().edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  }),
}));
