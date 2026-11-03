"use client";

import type { AnswerEvaluation, AnswerInput, SessionFeedback, SessionInput, Seniority } from "@sdp/ai";
import { Bot, RotateCcw, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Bubble } from "./Chat";
import { AnswerComposer, AnswerFeedback, SessionFeedbackView } from "./VoiceAnswer";

// cópia local: importar valores de @sdp/ai no navegador puxaria o child_process do provedor
const SENIORITY: Seniority[] = ["abaixo de júnior", "júnior", "pleno", "sênior"];

export interface Turn {
  who: "entrevistador" | "candidato";
  text: string;
}

/** O que a IA precisa saber da pergunta (o resto vem da conversa). */
export type ConvContext = Omit<AnswerInput, "answer" | "spoken" | "history" | "allowFollowUp" | "question" | "code">;

export interface ConvResult {
  question: string;
  transcript: Turn[];
  /** Avaliação de cada resposta: a principal e o aprofundamento. */
  evals: AnswerEvaluation[];
  /** 0 a 10: média das avaliações. */
  score: number;
  level: Seniority;
  /** A IA falhou e você pulou: não entra na nota. */
  skipped?: boolean;
}

/** Nível médio de uma lista de avaliações. */
export function levelOf(levels: Seniority[]): Seniority {
  if (!levels.length) return "júnior";
  const avg = levels.reduce((s, l) => s + SENIORITY.indexOf(l), 0) / levels.length;
  return SENIORITY[Math.round(avg)]!;
}

export function convResult(question: string, transcript: Turn[], evals: AnswerEvaluation[], skipped = false): ConvResult {
  const score = evals.length ? Math.round((evals.reduce((s, e) => s + e.score, 0) / evals.length) * 10) / 10 : 0;
  return { question, transcript, evals, score, level: levelOf(evals.map((e) => e.level)), skipped };
}

/** Respostas do candidato numa conversa, juntas (para o feedback geral). */
export const answersOf = (r: ConvResult) =>
  r.transcript
    .filter((t) => t.who === "candidato")
    .map((t) => t.text)
    .join(" / ");

/**
 * Uma pergunta em conversa com a IA: o entrevistador pergunta, você responde
 * falando ou digitando, a IA reage no papel, faz até `maxFollowUps` perguntas de
 * aprofundamento e avalia cada resposta.
 * `showFeedback`: mostra o feedback logo após a pergunta (treino). Sem ele, o
 * feedback aparece no fim da etapa (simulação).
 */
export function AiConversation({
  question,
  code,
  who,
  ctx,
  maxFollowUps = 1,
  showFeedback,
  nextLabel = "Próxima ▶",
  onDone,
}: {
  question: string;
  code?: string;
  who: string;
  ctx: ConvContext;
  maxFollowUps?: number;
  showFeedback?: boolean;
  nextLabel?: string;
  onDone(r: ConvResult): void;
}) {
  const [turns, setTurns] = useState<Turn[]>([{ who: "entrevistador", text: question }]);
  const [evals, setEvals] = useState<AnswerEvaluation[]>([]);
  const [pending, setPending] = useState<{ text: string; spoken: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, finished, error]);

  async function ask(text: string, spoken: boolean, history: Turn[], done: AnswerEvaluation[]) {
    setPending({ text, spoken });
    setError(null);
    try {
      const res = await fetch("/api/avaliar-resposta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...ctx, question, code, answer: text, spoken, interviewer: ctx.interviewer ?? who, history, allowFollowUp: done.length < maxFollowUps }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha na avaliação.");
      const e = body as AnswerEvaluation;
      const allEvals = [...done, e];
      setEvals(allEvals);
      const follow = allEvals.length <= maxFollowUps ? e.followUp : "";
      const say = [e.reply, follow].filter(Boolean).join(" ");
      setTurns((t) => (say ? [...t, { who: "entrevistador", text: say }] : t));
      if (!follow) setFinished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPending(null);
    }
  }

  function send(text: string, spoken: boolean) {
    const history = turns;
    setTurns([...turns, { who: "candidato", text }]);
    void ask(text, spoken, history, evals);
  }

  const lastAnswer = [...turns].reverse().find((t) => t.who === "candidato");
  const retry = () => lastAnswer && void ask(lastAnswer.text, false, turns.slice(0, turns.lastIndexOf(lastAnswer)), evals);

  return (
    <div className="flex flex-col gap-3">
      {turns.map((t, k) => (
        <div key={k} className="flex flex-col gap-2">
          <Bubble me={t.who === "candidato"} who={t.who === "entrevistador" ? who : undefined}>
            {t.text}
          </Bubble>
          {k === 0 && code && <pre className="panel overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-text">{code}</pre>}
        </div>
      ))}
      {pending && (
        <div className="flex items-center gap-2 text-[12px] text-muted">
          <Bot size={13} className="blink-warn" /> {who.split(",")[0]} está pensando… (até 1 min)
        </div>
      )}
      {error && (
        <div className="panel flex flex-col gap-2 border-down p-3 text-[13px]">
          <p className="text-down">A IA não respondeu: {error}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={retry} className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <RotateCcw size={12} /> Tentar de novo
            </button>
            <button
              onClick={() => onDone(evals.length ? convResult(question, turns, evals) : convResult(question, turns, [], true))}
              className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <SkipForward size={12} /> Pular {evals.length ? "o aprofundamento" : "sem avaliação"}
            </button>
          </div>
        </div>
      )}
      {!finished && !pending && !error && <AnswerComposer key={turns.length} onSend={send} />}
      {finished && (
        <>
          {showFeedback &&
            evals.map((e, k) => <AnswerFeedback key={k} e={e} target={ctx.target} title={evals.length > 1 ? (k === 0 ? "Resposta principal" : "Aprofundamento") : undefined} />)}
          <button onClick={() => onDone(convResult(question, turns, evals))} className="btn-neon self-start px-4 py-2 text-xs">
            {nextLabel}
          </button>
        </>
      )}
      <div ref={end} />
    </div>
  );
}

/** Pede o feedback geral à IA assim que aparece e mostra o resultado. */
export function SessionFeedbackPanel({ input, cached, onReady }: { input: SessionInput; cached?: SessionFeedback; onReady?(f: SessionFeedback): void }) {
  const [f, setF] = useState<SessionFeedback | null>(cached ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  const hasItems = input.stages.some((s) => s.items.length);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback-geral", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Falha no feedback geral.");
      setF(body);
      onReady?.(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!f && hasItems && !started.current) {
      started.current = true;
      void load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!hasItems) return null;
  if (f) return <SessionFeedbackView f={f} target={input.target} />;
  return (
    <div className="panel flex flex-col gap-2 p-4 text-[13px]">
      <div className="hud-label">Feedback geral da IA</div>
      {loading && (
        <p className="flex items-center gap-2 text-muted">
          <Bot size={14} className="blink-warn" /> Lendo todas as suas respostas e montando o feedback geral… (até 2 min)
        </p>
      )}
      {error && (
        <>
          <p className="text-down">{error}</p>
          <button onClick={load} className="btn-neon self-start px-3 py-1.5 text-xs">
            Tentar de novo
          </button>
        </>
      )}
    </div>
  );
}
