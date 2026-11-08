import type { NodeKind } from "@sdp/sim-engine";
import { Database, Gauge, Globe, Inbox, Network, Plug, Server, Users, Zap, type LucideIcon } from "lucide-react";

/** Ícone de cada tipo de componente (canvas e paleta). */
export const KIND_GLYPH: Record<NodeKind, LucideIcon> = {
  client: Users,
  loadBalancer: Network,
  server: Server,
  cache: Zap,
  cdn: Globe,
  database: Database,
  queue: Inbox,
  external: Plug,
  rateLimiter: Gauge,
};

/** Cor neon de cada tipo, usada quando ainda não há resultado de simulação. */
export const KIND_COLOR: Record<NodeKind, string> = {
  client: "#e6f1ff",
  loadBalancer: "#b18cff",
  server: "#22e4ff",
  cache: "#ff3cac",
  cdn: "#4d9dff",
  database: "#ffb547",
  queue: "#39ff8f",
  external: "#9fb4ff",
  rateLimiter: "#ff8a3d",
};
