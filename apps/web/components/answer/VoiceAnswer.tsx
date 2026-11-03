"use client";

import type { AnswerEvaluation, AnswerInput } from "@sdp/ai";
import { Bot, Mic, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Web Speech API: só o Chrome e o Edge transcrevem (o áudio vai para o serviço de voz do navegador).
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};
const recognitionCtor = () =>
  typeof window === "undefined" ? undefined : ((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition) as (new () => Recognition) | undefined;

const LEVEL_COLOR: Record<string, string> = { "abaixo de júnior": "text-down", júnior: "text-warn", pleno: "text-ok", sênior: "text-accent" };

export type AnswerContext = Omit<AnswerInput, "answer" | "spoken">;

/**
 * Resposta falada ou escrita. Grava e transcreve no navegador, mostra o tempo
 * e manda para a IA avaliar (Claude Code da assinatura, rodando local).
 */
export function VoiceAnswer({ ctx, limitSec = 120, onEvaluated }: { ctx: AnswerContext; limitSec?: number; onEvaluated?(e: AnswerEvaluation): void }) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnswerEvaluation | null>(null);
  const rec = useRef<Recognition | null>(null);
  const base = useRef("");

  useEffect(() => setSupported(!!recognitionCtor()), []);
  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);
  useEffect(() => {
    if (recording && elapsed >= limitSec) rec.current?.stop();
  }, [recording, elapsed, limitSec]);
  useEffect(() => () => rec.current?.stop(), []);

  function start() {
    const Ctor = recognitionCtor();
    if (!Ctor) return setSupported(false);
    const r = new Ctor();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    base.current = text ? text.trimEnd() + " " : "";
    r.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]!;
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      setText(base.current + finalText + interim);
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "O navegador bloqueou o microfone. Libere o acesso no ícone do cadeado." : `Erro no reconhecimento de voz: ${e.error}`);
    r.onend = () => setRecording(false);
    rec.current = r;
    setError(null);
    setElapsed(0);
    setSpoken(true);
    setRecording(true);
    r.start();
  }

  async function evaluate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/avaliar-resposta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...ctx, answer: text, spoken }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha na avaliação.");
      setResult(body);
      onEvaluated?.(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="panel flex flex-col gap-2 p-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        {recording ? (
          <button onClick={() => rec.current?.stop()} className="btn-ghost flex items-center gap-1.5 border-down px-3 py-1.5 text-xs text-down">
            <Square size={12} className="fill-down" /> Parar
          </button>
        ) : (
          <button onClick={start} disabled={!supported} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40">
            <Mic size={13} /> Responder falando
          </button>
        )}
        <span className={`font-mono text-xs ${recording ? "blink-warn text-down" : "text-muted"}`}>
          {recording ? "● gravando " : ""}
          {mm(elapsed)} / {mm(limitSec)}
        </span>
        {!supported && <span className="text-[11px] text-muted">Este navegador não transcreve voz. Use o Chrome ou o Edge, ou digite.</span>}
      </div>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Fale ou digite sua resposta como diria ao entrevistador."
        className="w-full"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={evaluate} disabled={loading || recording || text.trim().split(/\s+/).length < 5} className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40">
          <Bot size={13} /> {loading ? "Avaliando… (até 1 min)" : "Avaliar com IA"}
        </button>
        <span className="text-[11px] text-muted">Usa o Claude Code da sua assinatura, rodando no seu computador.</span>
      </div>
      {error && <p className="text-down">{error}</p>}
      {result && <AnswerFeedback e={result} target={ctx.target} />}
    </div>
  );
}

export function AnswerFeedback({ e, target }: { e: AnswerEvaluation; target: string }) {
  return (
    <div className="pop-in flex flex-col gap-2 border-t border-border pt-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="hud-label">Nível da resposta</span>
        <span className={`font-display text-[11px] uppercase glow ${LEVEL_COLOR[e.level] ?? "text-text"}`}>{e.level}</span>
        <span className="font-mono text-xs text-muted">{e.score}/10 para a vaga</span>
      </div>
      <p>{e.verdict}</p>
      {e.strengths.length > 0 && (
        <ul className="list-disc pl-4 text-ok">
          {e.strengths.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}
      {e.gaps.length > 0 && (
        <ul className="list-disc pl-4 text-bad">
          {e.gaps.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}
      {e.communication && <p className="text-muted"><b className="text-text">Comunicação:</b> {e.communication}</p>}
      {e.betterAnswer && (
        <details>
          <summary className="cursor-pointer text-accent">Como um {target} responderia</summary>
          <p className="mt-1 text-muted">{e.betterAnswer}</p>
        </details>
      )}
    </div>
  );
}
