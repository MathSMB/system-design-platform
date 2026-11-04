"use client";

import type { AnswerEvaluation, SessionFeedback } from "@sdp/ai";
import { Mic, Send, Square } from "lucide-react";
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

export const LEVEL_COLOR: Record<string, string> = { "abaixo de júnior": "text-down", júnior: "text-warn", pleno: "text-ok", sênior: "text-accent" };

/**
 * Caixa de resposta: grava e transcreve no navegador (ou você digita) e envia.
 */
export function AnswerComposer({ limitSec = 120, disabled, onSend }: { limitSec?: number; disabled?: boolean; onSend(text: string, spoken: boolean): void }) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [spoken, setSpoken] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const base = useRef("");

  useEffect(() => {
    setSupported(!!recognitionCtor());
  }, []);
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

  function send() {
    const t = text.trim();
    if (t.length < 2) return;
    onSend(t, spoken);
    setText("");
    setSpoken(false);
    setElapsed(0);
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
          <button onClick={start} disabled={!supported || disabled} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40">
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
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
        }}
        placeholder="Fale ou digite sua resposta como diria ao entrevistador. Ctrl+Enter envia."
        className="w-full"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={send} disabled={disabled || recording || text.trim().length < 2} className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40">
          <Send size={13} /> Enviar resposta
        </button>
        <span className="text-[11px] text-muted">A IA (Claude Code da sua assinatura) responde como entrevistador e avalia.</span>
      </div>
      {error && <p className="text-down">{error}</p>}
    </div>
  );
}

/** Feedback de uma resposta: nível, pontos fortes e fracos e como você deveria falar. */
export function AnswerFeedback({ e, target, title }: { e: AnswerEvaluation; target: string; title?: string }) {
  return (
    <div className="panel pop-in flex flex-col gap-2 p-3 text-[13px]">
      {title && <div className="hud-label !text-muted">{title}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <span className="hud-label">Nível da resposta</span>
        <span className={`font-display text-[11px] uppercase glow ${LEVEL_COLOR[e.level] ?? "text-text"}`}>{e.level}</span>
        <span className="font-mono text-xs text-muted">{e.score}/10 para a vaga</span>
      </div>
      <p>{e.verdict}</p>
      {e.strengths.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-ok">Pontos fortes</div>
          <ul className="list-disc pl-4 text-ok">
            {e.strengths.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      )}
      {e.gaps.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-bad">Pontos fracos</div>
          <ul className="list-disc pl-4 text-bad">
            {e.gaps.map((x) => <li key={x}>{x}</li>)}
          </ul>
        </div>
      )}
      {e.communication && <p className="text-muted"><b className="text-text">Sua fala:</b> {e.communication}</p>}
      {(e.betterAnswer || e.howToSay.length > 0) && (
        <div className="flex flex-col gap-1.5 rounded-md border border-accent/40 bg-accent/5 p-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-accent">Como você deveria falar · resposta de {target} para esta vaga</div>
          {e.betterAnswer && <p className="italic leading-relaxed">“{e.betterAnswer}”</p>}
          {e.howToSay.length > 0 && (
            <ul className="list-disc pl-4 text-muted">
              {e.howToSay.map((x) => <li key={x}>{x}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Feedback geral de uma sessão inteira. */
export function SessionFeedbackView({ f, target }: { f: SessionFeedback; target: string }) {
  const block = (title: string, items: string[], cls: string, ordered?: boolean) =>
    items.length > 0 && (
      <div>
        <div className={`text-[11px] font-semibold uppercase tracking-wider ${cls}`}>{title}</div>
        {ordered ? (
          <ol className="list-decimal pl-5">{items.map((x) => <li key={x}>{x}</li>)}</ol>
        ) : (
          <ul className="list-disc pl-4">{items.map((x) => <li key={x}>{x}</li>)}</ul>
        )}
      </div>
    );
  return (
    <div className="panel pop-in flex flex-col gap-3 border-accent p-4 text-[13px]">
      <div className="hud-label">Feedback geral da IA</div>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`font-display text-sm uppercase glow ${LEVEL_COLOR[f.level] ?? ""}`}>{f.level}</span>
        <span className="font-mono text-xs text-muted">{f.score}/10 para a vaga de {target}</span>
      </div>
      <p className="text-sm">{f.verdict}</p>
      {f.decision && (
        <p className="text-muted">
          <b className="text-text">O que a empresa decidiria:</b> {f.decision}
        </p>
      )}
      {f.byStage.length > 0 && (
        <div className="flex flex-col gap-1">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">Por etapa</div>
          {f.byStage.map((s) => (
            <div key={s.stage} className="grid gap-x-3 sm:grid-cols-[180px_90px_1fr]">
              <span>{s.stage}</span>
              <span className={`font-semibold ${LEVEL_COLOR[s.level] ?? ""}`}>{s.level}</span>
              <span className="text-muted">{s.comment}</span>
            </div>
          ))}
        </div>
      )}
      {block("Padrões nas suas respostas", f.patterns, "text-accent-2")}
      {block("Pontos fortes", f.strengths, "text-ok")}
      {block("Pontos fracos", f.gaps, "text-bad")}
      {block("Como falar nas próximas entrevistas", f.howToSpeak, "text-accent")}
      {block("O que estudar, em ordem", f.studyPlan, "text-warn", true)}
    </div>
  );
}
