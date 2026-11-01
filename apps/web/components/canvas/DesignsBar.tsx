"use client";

import { useEffect, useState } from "react";
import { useCanvas, type SavedDocument } from "./store";

interface Item {
  id: string;
  name: string;
}

const LOCAL_KEY = "sdp:designs";

function readLocal(): Record<string, { name: string; document: SavedDocument }> {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Salvar e abrir desenhos. Usa o Postgres se configurado; senão, o navegador. */
export function DesignsBar() {
  const [items, setItems] = useState<Item[]>([]);
  const [mode, setMode] = useState<"db" | "local">("db");
  const [msg, setMsg] = useState("");

  async function refresh() {
    const res = await fetch("/api/designs").catch(() => null);
    const body: { db?: boolean; items?: Item[] } | null = res?.ok ? await res.json().catch(() => null) : null;
    if (body?.db) {
      setMode("db");
      setItems(body.items ?? []);
    } else {
      setMode("local");
      setItems(Object.entries(readLocal()).map(([id, v]) => ({ id, name: v.name })));
    }
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function save() {
    const name = prompt("Nome do desenho:");
    if (!name) return;
    const s = useCanvas.getState();
    const document: SavedDocument = { nodes: s.nodes, edges: s.edges, problem: s.problem };
    if (mode === "db") {
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, problem: s.problem, document }),
      });
      setMsg(res.ok ? "Salvo no banco." : "Erro ao salvar.");
    } else {
      try {
        localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...readLocal(), [crypto.randomUUID()]: { name, document } }));
        setMsg("Salvo no navegador.");
      } catch {
        setMsg("Não foi possível salvar no navegador.");
      }
    }
    void refresh();
  }

  async function open(id: string) {
    if (mode === "db") {
      const res = await fetch(`/api/designs/${id}`);
      if (res.ok) useCanvas.getState().loadDocument((await res.json()).document);
    } else {
      const d = readLocal()[id];
      if (d) useCanvas.getState().loadDocument(d.document);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Meus desenhos</div>
      <button onClick={save} className="rounded-md border border-border px-2 py-1 text-xs hover:border-accent">Salvar desenho</button>
      {msg && <span className="text-[11px] text-muted">{msg}</span>}
      {items.map((i) => (
        <button key={i.id} onClick={() => open(i.id)} className="truncate text-left text-xs text-muted hover:text-text">{i.name}</button>
      ))}
      <span className="text-[10px] text-muted">{mode === "db" ? "Salvando no Postgres" : "Sem banco: salvando no navegador"}</span>
    </div>
  );
}
