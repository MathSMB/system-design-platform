"use client";

import { useEffect, useState } from "react";

export interface HistoryEntry {
  id: string;
  kind: "processo" | "treino";
  stack: string;
  level: string;
  company?: string;
  title: string;
  outcome?: string;
  levelShown?: string;
  score?: number;
  state: unknown;
  feedback?: unknown;
}

export type SaveStatus = "salvando" | "salvo" | "sem-banco" | "erro";

/**
 * Salva a entrevista no histórico (banco) sempre que `deps` mudam, por exemplo
 * quando o feedback geral chega. O id fixo faz cada novo salvamento atualizar o mesmo registro.
 */
export function useSaveHistory(entry: HistoryEntry | null, deps: unknown[]): SaveStatus | null {
  const [status, setStatus] = useState<SaveStatus | null>(null);
  useEffect(() => {
    if (!entry) return;
    let alive = true;
    setStatus("salvando");
    fetch(`/api/historico/${entry.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(entry) })
      .then((r) => r.json().then((b) => ({ ok: r.ok, b })))
      .then(({ ok, b }) => alive && setStatus(!ok ? "erro" : b.db === false ? "sem-banco" : "salvo"))
      .catch(() => alive && setStatus("erro"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return status;
}

export function SaveBadge({ status }: { status: SaveStatus | null }) {
  if (!status) return null;
  const text = {
    salvando: "Salvando no histórico…",
    salvo: "Salvo no seu histórico.",
    "sem-banco": "Histórico desligado: o banco não respondeu (abra o Docker Desktop e rode pnpm db:up).",
    erro: "Não consegui salvar no histórico (o banco respondeu com erro).",
  }[status];
  return <p className={`text-[12px] ${status === "salvo" ? "text-ok" : status === "erro" ? "text-down" : "text-muted"}`}>{text} {status === "salvo" && <a href="/historico" className="underline">Ver histórico</a>}</p>;
}

/**
 * Avisa que uma etapa ou um processo terminou (evento na API de eventos).
 * O app Hábito conta isso para a meta do dia. Sem conta, não faz nada.
 */
export function countActivity(kind: "stage" | "process", ref: string) {
  const type = kind === "stage" ? "etapa.concluida" : "processo.concluido";
  fetch("/api/eventos", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type, ref }) }).catch(() => {});
}
