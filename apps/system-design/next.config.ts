import type { NextConfig } from "next";

// o .env fica na raiz do monorepo e vale para todos os apps (opcional)
try {
  process.loadEnvFile("../../.env");
} catch {}

const nextConfig: NextConfig = {
  transpilePackages: ["@sdp/ai", "@sdp/auth", "@sdp/db", "@sdp/events", "@sdp/race-sim", "@sdp/sim-engine", "@sdp/ui"],
  // o provedor de IA local chama o Claude Code com child_process; não deve ir para o bundle
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
