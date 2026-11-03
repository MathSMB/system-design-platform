import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@sdp/sim-engine", "@sdp/race-sim", "@sdp/ai", "@sdp/hiring"],
  // o provedor de IA local chama o Claude Code com child_process; não deve ir para o bundle
  serverExternalPackages: ["@anthropic-ai/sdk"],
};

export default nextConfig;
