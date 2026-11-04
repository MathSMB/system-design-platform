"use client";

import type { Evaluation } from "@sdp/ai";
import { useState } from "react";
import { useCanvas } from "./store";

export function EvaluationPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const problem = useCanvas((s) => s.problem);
  const notes = useCanvas((s) => s.notes);
  const set = useCanvas((s) => s.set);

  async function evaluate() {
    setLoading(true);
    setError(null);
    const s = useCanvas.getState();
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ problem: s.problem, notes: s.notes, graph: s.toGraph(), simulation: s.result ?? undefined }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha na avaliação.");
      setEvaluation(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      <label className="flex flex-col gap-1">
        <span className="text-muted">Problema</span>
        <textarea rows={2} value={problem} onChange={(e) => set({ problem: e.target.value })} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-muted">Sua explicação (requisitos, estimativas, trade-offs)</span>
        <textarea rows={4} value={notes} onChange={(e) => set({ notes: e.target.value })} />
      </label>
      <button onClick={evaluate} disabled={loading} className="btn-neon self-start px-3 py-1.5 text-xs disabled:opacity-50">
        {loading ? "Avaliando… (pode levar ~1 min)" : "Avaliar com IA"}
      </button>
      {error && <p className="text-down">{error}</p>}
      {evaluation && (
        <div className="flex flex-col gap-3">
          <div className="font-display text-xl text-accent glow">{evaluation.overallScore}/10</div>
          <p className="text-muted">{evaluation.consensus}</p>
          {evaluation.judges.map((j) => (
            <div key={j.name} className="panel p-2">
              <div className="font-medium">{j.name} · {j.score}/10</div>
              <div className="text-[11px] text-muted">{j.perspective}</div>
              <ul className="mt-1 list-disc pl-4">
                {j.strengths.map((x) => <li key={x} className="text-ok">{x}</li>)}
                {j.weaknesses.map((x) => <li key={x} className="text-bad">{x}</li>)}
              </ul>
            </div>
          ))}
          <table className="w-full text-xs">
            <tbody>
              {evaluation.dimensions.map((d) => (
                <tr key={d.dimension} className="align-top">
                  <td className="pr-2 font-mono">{d.score}</td>
                  <td className="pr-2">{d.dimension}</td>
                  <td className="text-muted">{d.comment}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <div className="hud-label">O entrevistador perguntaria</div>
            <ul className="list-disc pl-4">{evaluation.followUpQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
          <div>
            <div className="hud-label">Próximos passos</div>
            <ul className="list-disc pl-4">{evaluation.nextSteps.map((q) => <li key={q}>{q}</li>)}</ul>
          </div>
        </div>
      )}
    </div>
  );
}
