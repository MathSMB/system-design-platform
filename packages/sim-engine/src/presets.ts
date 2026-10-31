import type { Graph } from "./types";

/** Arquiteturas prontas da trilha "0 a 1 milhão de usuários" (seção 7 da base técnica). */

const users = (dau: number) => ({
  id: "users",
  kind: "client" as const,
  label: "Usuários",
  params: {
    dailyActiveUsers: dau,
    requestsPerUserPerDay: 20,
    peakFactor: 5,
    pattern: "constant" as const,
    timeoutMs: 2000,
  },
});

const server = (id: string, label = "App", workers = 32) => ({
  id,
  kind: "server" as const,
  label,
  params: { workers, serviceTimeMs: 20, queueCapacity: 500, retries: 0 },
});

const db = (id = "db", label = "Postgres") => ({
  id,
  kind: "database" as const,
  label,
  params: { workers: 50, serviceTimeMs: 15, queueCapacity: 1000 },
});

export const PRESETS: Record<string, { title: string; description: string; graph: Graph }> = {
  singleServer: {
    title: "1. Um servidor + banco",
    description: "O começo de todo sistema. Aguenta mais do que parece, mas é ponto único de falha.",
    graph: {
      nodes: [users(1_000_000), server("app"), db()],
      edges: [
        { id: "e1", source: "users", target: "app" },
        { id: "e2", source: "app", target: "db" },
      ],
    },
  },
  loadBalanced: {
    title: "2. Load balancer + servidores",
    description: "Servidores stateless atrás de um LB. Remove o ponto único no app; o banco continua sendo um.",
    graph: {
      nodes: [
        users(1_000_000),
        { id: "lb", kind: "loadBalancer", label: "LB", params: { algorithm: "leastOutstanding" } },
        server("app1", "App 1"),
        server("app2", "App 2"),
        server("app3", "App 3"),
        db(),
      ],
      edges: [
        { id: "e1", source: "users", target: "lb" },
        { id: "e2", source: "lb", target: "app1" },
        { id: "e3", source: "lb", target: "app2" },
        { id: "e4", source: "lb", target: "app3" },
        { id: "e5", source: "app1", target: "db" },
        { id: "e6", source: "app2", target: "db" },
        { id: "e7", source: "app3", target: "db" },
      ],
    },
  },
  withCache: {
    title: "3. Cache na frente do banco",
    description: "Cache-aside com 90% de hit rate. Derrube o cache para ver a avalanche.",
    graph: {
      nodes: [
        users(5_000_000),
        { id: "lb", kind: "loadBalancer", label: "LB", params: { algorithm: "leastOutstanding" } },
        server("app1", "App 1", 64),
        server("app2", "App 2", 64),
        server("app3", "App 3", 64),
        {
          id: "cache",
          kind: "cache",
          label: "Redis",
          params: { workers: 8, serviceTimeMs: 0.5, queueCapacity: 5000, hitRate: 0.9 },
        },
        db(),
      ],
      edges: [
        { id: "e1", source: "users", target: "lb" },
        { id: "e2", source: "lb", target: "app1" },
        { id: "e3", source: "lb", target: "app2" },
        { id: "e4", source: "lb", target: "app3" },
        { id: "e5", source: "app1", target: "cache" },
        { id: "e6", source: "app2", target: "cache" },
        { id: "e7", source: "app3", target: "cache" },
        { id: "e8", source: "cache", target: "db" },
      ],
    },
  },
  asyncQueue: {
    title: "4. Escrita assíncrona com fila",
    description: "O app confirma na hora e um worker grava depois. O usuário não espera pelo serviço lento.",
    graph: {
      nodes: [
        users(1_000_000),
        server("app"),
        { id: "queue", kind: "queue", label: "Fila", params: { capacity: 50_000, consumers: 4 } },
        {
          id: "email",
          kind: "external",
          label: "Provedor de e-mail",
          params: { workers: 10, serviceTimeMs: 300, queueCapacity: 100, errorRate: 0.01 },
        },
      ],
      edges: [
        { id: "e1", source: "users", target: "app" },
        { id: "e2", source: "app", target: "queue" },
        { id: "e3", source: "queue", target: "email" },
      ],
    },
  },
};
