/**
 * Os apps da plataforma, cada um na sua porta fixa (`pnpm dev` abre todos).
 * A cor é a assinatura da área: o link acende nela e o app atual fica dela.
 */
export const APP_LIST = [
  { id: "painel", title: "Painel", port: 3000, color: "text", body: "Entrar, perfis, meta do dia e o que aconteceu em cada app." },
  { id: "system-design", title: "System Design", port: 3001, color: "accent", body: "Desenhe, simule carga e concorrência e veja onde quebra. Estudo e Entrevista técnica." },
  { id: "entrevista", title: "Entrevista", port: 3002, color: "bad", body: "Processo seletivo do RH à contratação e treino por stack, com a IA e o seu histórico." },
  { id: "estudos", title: "Estudos", port: 3003, color: "accent-2", body: "Do anúncio da vaga à meta de hoje: pesquisa, trilhas, projetos e cronograma." },
  { id: "habito", title: "Hábito", port: 3004, color: "ok", body: "A placa-mãe neon: cada dia de meta cumprida instala, repara ou faz overclock." },
] as const;

export type AppId = (typeof APP_LIST)[number]["id"];
export type AppInfo = (typeof APP_LIST)[number];

export const getApp = (id: AppId): AppInfo => APP_LIST.find((a) => a.id === id)!;

/** Endereço de uma página em outro app (ex. appUrl("painel", "/conta")). */
export function appUrl(id: AppId, path = "/"): string {
  return `http://localhost:${getApp(id).port}${path}`;
}

export const isAppId = (id: string): id is AppId => APP_LIST.some((a) => a.id === id);
