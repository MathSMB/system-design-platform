import { KIND_LABEL } from "./labels";
import type { Graph } from "./types";

/** Retorna os problemas do grafo (vazio = pode simular). Mensagens em PT-BR. */
export function validateGraph(graph: Graph): string[] {
  const problems: string[] = [];
  const ids = new Set(graph.nodes.map((n) => n.id));
  const name = (id: string) => {
    const n = graph.nodes.find((x) => x.id === id);
    return n ? (n.label ?? KIND_LABEL[n.kind]) : id;
  };

  for (const e of graph.edges) {
    if (!ids.has(e.source) || !ids.has(e.target)) problems.push(`A conexão ${e.id} aponta para um nó que não existe.`);
    if (graph.nodes.find((n) => n.id === e.target)?.kind === "client") {
      problems.push(`"${name(e.target)}" é um gerador de carga e não pode receber conexões.`);
    }
  }
  const out = (id: string) => graph.edges.filter((e) => e.source === id);

  if (!graph.nodes.some((n) => n.kind === "client")) problems.push("Adicione um nó de Usuários para gerar carga.");
  for (const n of graph.nodes) {
    if (n.kind === "client" && out(n.id).length === 0) problems.push(`Conecte "${name(n.id)}" ao primeiro componente do sistema.`);
    if (n.kind === "loadBalancer" && out(n.id).length === 0) problems.push(`O load balancer "${name(n.id)}" não tem para onde mandar tráfego.`);
  }

  // ciclos causariam chamadas infinitas
  const state = new Map<string, 0 | 1 | 2>();
  const visit = (id: string): boolean => {
    if (state.get(id) === 1) return true;
    if (state.get(id) === 2) return false;
    state.set(id, 1);
    for (const e of out(id)) if (visit(e.target)) return true;
    state.set(id, 2);
    return false;
  };
  if (graph.nodes.some((n) => visit(n.id))) problems.push("O desenho tem um ciclo de chamadas; o simulador só aceita fluxos sem ciclo.");

  return problems;
}
