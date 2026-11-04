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

/** Foto do desenho para desfazer/refazer. */
export interface Snapshot {
  nodes: SysNode[];
  edges: Edge[];
  failures: FailureInjection[];
}

const HISTORY = 50;
/** Área de transferência do canvas (só dentro da aba). */
let clipboard: { nodes: SysNode[]; edges: Edge[] } | null = null;
let pasteCount = 0;

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
  past: Snapshot[];
  future: Snapshot[];
  /** Componentes que não podem ser apagados (Usuários e exigidos nos modos Estudo/Entrevista). */
  locked: string[];
  /** Guarda o desenho atual no histórico antes de uma mudança. */
  checkpoint(): void;
  undo(): void;
  redo(): void;
  copySelection(): number;
  paste(): number;
  duplicateSelection(): number;
  selectAll(): void;
  /** Foto do desenho (para "Reiniciar desenho"). */
  snapshot(): Snapshot;
  restore(s: Snapshot): void;
  setLocked(ids: string[]): void;
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
let lastEdit = { id: "", at: 0 };
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
  past: [],
  future: [],
  locked: [],

  checkpoint: () => {
    const { nodes, edges, failures, past } = get();
    set({ past: [...past.slice(-(HISTORY - 1)), { nodes, edges, failures }], future: [] });
  },
  undo: () => {
    const { past, future, nodes, edges, failures, graphVersion } = get();
    const prev = past[past.length - 1];
    if (!prev) return;
    set({
      ...prev,
      past: past.slice(0, -1),
      future: [{ nodes, edges, failures }, ...future].slice(0, HISTORY),
      selectedId: null,
      graphVersion: graphVersion + 1,
    });
  },
  redo: () => {
    const { past, future, nodes, edges, failures, graphVersion } = get();
    const next = future[0];
    if (!next) return;
    set({ ...next, future: future.slice(1), past: [...past, { nodes, edges, failures }], selectedId: null, graphVersion: graphVersion + 1 });
  },
  copySelection: () => {
    const sel = get().nodes.filter((n) => n.selected || n.id === get().selectedId);
    const ids = new Set(sel.map((n) => n.id));
    clipboard = { nodes: sel, edges: get().edges.filter((e) => ids.has(e.source) && ids.has(e.target)) };
    pasteCount = 0;
    return sel.length;
  },
  paste: () => {
    if (!clipboard || clipboard.nodes.length === 0) return 0;
    get().checkpoint();
    pasteCount++;
    const map = new Map<string, string>();
    const nodes = clipboard.nodes.map((n) => {
      const id = newId(n.data.kind);
      map.set(n.id, id);
      return {
        ...n,
        id,
        selected: true,
        position: { x: n.position.x + 40 * pasteCount, y: n.position.y + 40 * pasteCount },
        data: { ...n.data, params: { ...n.data.params } },
      };
    });
    const edges = clipboard.edges.map((e) => ({ ...e, id: newId("e"), source: map.get(e.source)!, target: map.get(e.target)!, selected: false }));
    set({
      nodes: [...get().nodes.map((n) => ({ ...n, selected: false })), ...nodes],
      edges: [...get().edges, ...edges],
      selectedId: nodes.length === 1 ? nodes[0]!.id : null,
      graphVersion: get().graphVersion + 1,
    });
    return nodes.length;
  },
  duplicateSelection: () => {
    const saved = clipboard;
    const savedCount = pasteCount;
    const n = get().copySelection();
    if (n) get().paste();
    clipboard = saved;
    pasteCount = savedCount;
    return n;
  },
  selectAll: () => set({ nodes: get().nodes.map((n) => ({ ...n, selected: true })), selectedId: null }),
  snapshot: () => {
    const { nodes, edges, failures } = get();
    return { nodes, edges, failures };
  },
  restore: (snap) => {
    get().checkpoint();
    set({ ...snap, selectedId: null, result: null, graphVersion: get().graphVersion + 1, layoutVersion: get().layoutVersion + 1 });
  },
  setLocked: (ids) => set({ locked: ids }),

  onNodesChange: (c) => {
    const locked = get().locked;
    // componentes travados não saem nem com Delete
    c = c.filter((x) => !(x.type === "remove" && locked.includes(x.id)));
    const structural = c.some((x) => x.type === "add" || x.type === "remove" || x.type === "replace");
    if (structural) get().checkpoint();
    const removed = new Set(c.filter((x) => x.type === "remove").map((x) => (x as { id: string }).id));
    set({
      nodes: applyNodeChanges(c, get().nodes),
      failures: removed.size ? get().failures.filter((f) => !removed.has(f.nodeId)) : get().failures,
      // mover, selecionar ou medir não muda o sistema
      graphVersion: get().graphVersion + (structural ? 1 : 0),
    });
  },
  onEdgesChange: (c) => {
    const structural = c.some((x) => x.type !== "select");
    if (structural) get().checkpoint();
    set({ edges: applyEdgeChanges(c, get().edges), graphVersion: get().graphVersion + (structural ? 1 : 0) });
  },
  onConnect: (c) => {
    get().checkpoint();
    set({ edges: addEdge({ ...c, id: newId("e") }, get().edges), graphVersion: get().graphVersion + 1 });
  },

  addNode: (kind, position) => {
    get().checkpoint();
    const id = newId(kind);
    set({
      nodes: [...get().nodes, { id, type: "system", position, data: { kind, label: KIND_LABEL[kind], params: { ...DEFAULT_PARAMS[kind] } } }],
      selectedId: id,
      graphVersion: get().graphVersion + 1,
    });
  },
  select: (id) => set({ selectedId: id }),
  updateNode: (id, patch) => {
    // várias teclas seguidas no mesmo campo viram um passo só de desfazer
    const now = Date.now();
    if (now - lastEdit.at > 1000 || lastEdit.id !== id) get().checkpoint();
    lastEdit = { id, at: now };
    set({
      nodes: get().nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
      graphVersion: get().graphVersion + 1,
    });
  },
  removeSelected: () => {
    const id = get().selectedId;
    if (!id || get().locked.includes(id)) return;
    get().checkpoint();
    set({
      nodes: get().nodes.filter((n) => n.id !== id),
      edges: get().edges.filter((e) => e.source !== id && e.target !== id),
      failures: get().failures.filter((f) => f.nodeId !== id),
      selectedId: null,
      graphVersion: get().graphVersion + 1,
    });
  },
  setFailure: (nodeId, atSec) => {
    get().checkpoint();
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
      past: [],
      future: [],
      locked: [],
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
      past: [],
      future: [],
      locked: [],
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
      past: [],
      future: [],
      locked: [],
    }),

  toGraph: () => ({
    nodes: get().nodes.map((n) => ({ id: n.id, kind: n.data.kind, label: n.data.label, params: n.data.params }) as unknown as SimNode),
    edges: get().edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
  }),
}));
