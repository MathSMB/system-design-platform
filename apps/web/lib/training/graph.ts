import type { Graph, NodeKind } from "@sdp/sim-engine";
import { DEFAULT_PARAMS } from "@/components/canvas/defaults";
import type { Board, Ref } from "./types";

type N = { id: string; kind: NodeKind; label: string; params?: Record<string, unknown> };

/** Monta um desenho inicial: parâmetros padrão do componente + o que a aula muda. */
export function build(nodes: N[], edges: [string, string][]): Graph {
  return {
    nodes: nodes.map((n) => ({ id: n.id, kind: n.kind, label: n.label, params: { ...DEFAULT_PARAMS[n.kind], ...n.params } })),
    edges: edges.map(([source, target], k) => ({ id: `e${k}`, source, target })),
  } as unknown as Graph;
}

/** Usuários com a carga da aula (sem releitura após escrita, a não ser que a aula peça). */
export const users = (params: Record<string, unknown>): N => ({ id: "users", kind: "client", label: "Usuários", params: { readAfterWriteMs: 0, ...params } });

/** Nó do canvas pelo id do desenho inicial. */
export const nodeById = (b: Board, id: string) => b.nodes.find((n) => n.id === id);
/** Parâmetro numérico de um nó do desenho inicial. */
export const param = (b: Board, id: string, key: string) => Number(nodeById(b, id)?.data.params[key] ?? NaN);
/** Métricas da última simulação para um nó. */
export const metric = (b: Board, id: string) => b.result?.nodes.find((n) => n.nodeId === id);
export const metricBefore = (b: Board, id: string) => b.before?.nodes.find((n) => n.nodeId === id);
/** Existe conexão direta entre dois nós? */
export const edge = (b: Board, from: string, to: string) => b.edges.some((e) => e.source === from && e.target === to);

export const yt = (id: string, title: string): Ref => ({ title, by: "Renato Augusto (YouTube)", url: `https://www.youtube.com/watch?v=${id}` });
