import type { NodeKind } from "./types";

export const KIND_LABEL: Record<NodeKind, string> = {
  client: "Usuários",
  loadBalancer: "Load balancer",
  server: "Servidor",
  cache: "Cache",
  cdn: "CDN",
  database: "Banco de dados",
  queue: "Fila",
  external: "Serviço externo",
  rateLimiter: "Rate limiter",
};
