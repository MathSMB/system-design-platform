import type { NextConfig } from "next";

// o .env fica na raiz do monorepo e vale para todos os apps (opcional)
try {
  process.loadEnvFile("../../.env");
} catch {}

const nextConfig: NextConfig = {
  transpilePackages: ["@sdp/auth", "@sdp/db", "@sdp/events", "@sdp/habit", "@sdp/hiring", "@sdp/ui"],
};

export default nextConfig;
