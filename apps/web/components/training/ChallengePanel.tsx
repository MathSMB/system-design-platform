"use client";

import { useEffect, useState } from "react";
import { Dices, Flag, Star, Timer } from "lucide-react";
import { baseRps, type ClientParams, type Graph } from "@sdp/sim-engine";
import { useCanvas } from "@/components/canvas/store";
import type { Challenge } from "@/lib/training/types";
import { readBoard } from "./useBoard";

const fmt = (x: number, d = 0) => x.toLocaleString("pt-BR", { maximumFractionDigits: d });

/** Desenho inicial do desafio: só os usuários do enunciado (e o que ele exigir). */
export function challengeGraph(c: Challenge): Graph {
  return {
    nodes: [
      { id: "users", kind: "client", label: "Usuários", params: { ...c.load, pattern: "constant", timeoutMs: 2000, readAfterWriteMs: 0 } },
      ...(c.mustHave ?? []).map((m, k) => ({ id: `req-${k}`, kind: m.kind, label: m.label, params: { ...m.params } })),
    ],
    edges: [],
  } as unknown as Graph;
}

export function peakOf(c: Challenge) {
  return baseRps({ ...c.load, pattern: "constant", timeoutMs: 0 } as ClientParams) * c.load.peakFactor;
}

interface Verdict {
  items: { label: string; ok: boolean; detail: string }[];
  stars: number;
  passed: boolean;
}

function judge(c: Challenge): Verdict | string {
  const b = readBoard(null);
  if (!b.result) return "Rode a simulação (▶ Simular) no desenho atual antes de entregar.";
  const client = b.nodes.find((n) => n.data.kind === "client");
  if (!client) return "Cadê os Usuários? Eles definem a carga do desafio.";
  const p = client.data.params as unknown as ClientParams;
  const rps = baseRps(p) * p.peakFactor;
  const target = peakOf(c);
  if (rps < target * 0.95) return `Os Usuários foram alterados: estão gerando ${fmt(rps)} req/s no pico, e o enunciado pede ${fmt(target)}.`;
  for (const m of c.mustHave ?? []) {
    const n = b.nodes.find((x) => x.data.kind === m.kind && x.data.label === m.label);
    if (!n) return `O enunciado exige o componente "${m.label}".`;
    if (JSON.stringify(n.data.params) !== JSON.stringify(m.params)) return `Os parâmetros do "${m.label}" são fixos no enunciado. Volte aos valores originais.`;
  }
  const r = b.result;
  const err = r.errorRate <= c.slo.errorRate;
  const lat = r.latency.p99Ms <= c.slo.p99Ms;
  const hot = r.nodes.filter((n) => n.status !== "ok" && n.kind !== "client");
  const room = hot.length === 0;
  return {
    items: [
      { label: "Erros", ok: err, detail: `${fmt(r.errorRate * 100, 2)}% (meta ≤ ${fmt(c.slo.errorRate * 100, 1)}%)` },
      { label: "Latência p99", ok: lat, detail: `${fmt(r.latency.p99Ms)} ms (meta ≤ ${fmt(c.slo.p99Ms)} ms)` },
      {
        label: "Folga para pico",
        ok: room,
        detail: room ? "nenhum componente acima de 70%" : `perto do limite: ${hot.map((n) => b.nodes.find((x) => x.id === n.nodeId)?.data.label ?? n.nodeId).join(", ")}`,
      },
    ],
    stars: [err, lat, room].filter(Boolean).length,
    passed: err && lat,
  };
}

/** Painel do modo sorteado: enunciado, cronômetro e entrega. Sem dicas. */
export function ChallengePanel({ c, onReroll }: { c: Challenge; onReroll(): void }) {
  const [start, setStart] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [verdict, setVerdict] = useState<Verdict | string | null>(null);
  const graphVersion = useCanvas((s) => s.graphVersion);

  useEffect(() => {
    setStart(Date.now());
    setVerdict(null);
    // a IA de avaliação recebe o enunciado como problema
    useCanvas.getState().set({ problem: `${c.title}. ${c.brief}\nRequisitos:\n- ${c.requirements.join("\n- ")}` });
  }, [c]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // mexeu no desenho, a nota antiga não vale mais
  useEffect(() => setVerdict((v) => (v && typeof v !== "string" ? null : v)), [graphVersion]);

  const sec = Math.floor((now - start) / 1000);
  const clock = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const overtime = sec > 45 * 60;

  return (
    <div className="flex flex-col gap-3 text-sm" data-tour="challenge">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 hud-label !text-accent-2">
          <Dices size={14} /> Desafio sorteado
        </span>
        <span className={`flex items-center gap-1 font-mono text-xs ${overtime ? "text-down" : "text-muted"}`} title="Uma entrevista costuma ter 45 minutos">
          <Timer size={13} /> {clock}
        </span>
      </div>
      <h1 className="font-display text-[11px] leading-relaxed text-accent glow">{c.title}</h1>
      <p className="leading-relaxed text-text">{c.brief}</p>
      <div>
        <div className="mb-1 hud-label">Requisitos</div>
        <ul className="flex flex-col gap-1">
          {c.requirements.map((r) => (
            <li key={r} className="flex gap-1.5 text-[13px] text-muted">
              <span className="text-accent">▸</span>
              {r}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-md border border-border bg-bg/60 p-2 font-mono text-[11px] text-muted">
        Carga no pico: <span className="text-accent">{fmt(peakOf(c))} req/s</span> · já configurada no nó Usuários
      </div>
      <div className="flex gap-2">
        <button onClick={() => setVerdict(judge(c))} className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Flag size={13} /> Entregar
        </button>
        <button onClick={onReroll} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Dices size={13} /> Sortear outro
        </button>
      </div>

      {typeof verdict === "string" && <div className="pop-in text-[13px] text-down">{verdict}</div>}
      {verdict && typeof verdict !== "string" && (
        <div className={`panel pop-in flex flex-col gap-2 p-3 ${verdict.passed ? "border-ok/60" : "border-down/60"}`}>
          <div className="flex items-center justify-between">
            <span className={`font-display text-[10px] ${verdict.passed ? "text-ok glow" : "text-down glow"}`}>{verdict.passed ? "SLO CUMPRIDO" : "SLO NÃO CUMPRIDO"}</span>
            <span className="flex gap-0.5">
              {[0, 1, 2].map((k) => (
                <Star
                  key={k}
                  size={18}
                  className={`${k < verdict.stars ? "pop-in fill-warn text-warn" : "text-border"}`}
                  style={{ animationDelay: `${k * 150}ms`, filter: k < verdict.stars ? "drop-shadow(0 0 5px var(--warn))" : undefined }}
                />
              ))}
            </span>
          </div>
          {verdict.items.map((it) => (
            <div key={it.label} className="flex justify-between gap-2 text-[13px]">
              <span className={it.ok ? "text-ok" : "text-down"}>
                {it.ok ? "✓" : "✕"} {it.label}
              </span>
              <span className="text-right font-mono text-[11px] text-muted">{it.detail}</span>
            </div>
          ))}
          <p className="text-[12px] text-muted">
            Para a nota de entrevista (requisitos, estimativas e trade-offs), escreva sua explicação na aba <span className="text-accent">Avaliação</span> e peça a avaliação por IA.
          </p>
        </div>
      )}
    </div>
  );
}
