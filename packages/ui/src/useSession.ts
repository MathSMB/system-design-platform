"use client";

import { useEffect, useState } from "react";
import { appUrl, type AppId } from "./apps";
import type { SessionData } from "./profile";

/**
 * Quem está logado (o login vale para todos os apps).
 * undefined = carregando; null = sem conta. Atualiza no evento "conta-mudou".
 */
export function useSession(): SessionData | null | undefined {
  const [s, setS] = useState<SessionData | null | undefined>(undefined);
  useEffect(() => {
    const load = () =>
      fetch("/api/conta")
        .then((r) => r.json())
        .then((d) => setS(d.session ?? null))
        .catch(() => setS(null));
    load();
    window.addEventListener("conta-mudou", load);
    return () => window.removeEventListener("conta-mudou", load);
  }, []);
  return s;
}

/** Página de entrar do Painel, que devolve você para `app` (na página `path`) depois do login. */
export function loginUrl(app: AppId, path = "/"): string {
  const q = new URLSearchParams({ voltar: app });
  if (path !== "/") q.set("ir", path);
  return appUrl("painel", `/conta?${q}`);
}

/** Lê ?voltar=&ir= com segurança: só apps conhecidos e caminhos internos. */
export function backTarget(search: URLSearchParams, isApp: (id: string) => id is AppId): { app: AppId; url: string } | null {
  const app = search.get("voltar");
  if (!app || !isApp(app)) return null;
  const ir = search.get("ir") ?? "/";
  const path = /^\/(?!\/)[\w\-/#?=&.]*$/.test(ir) ? ir : "/";
  return { app, url: appUrl(app, path) };
}
