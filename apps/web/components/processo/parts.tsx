"use client";

import type { AnswerEvaluation } from "@sdp/ai";
import { ISSUE_KINDS, scoreReview, type AskStep, type CodeReview, type IssueKind, type Option } from "@sdp/hiring";
import { useMemo, useState } from "react";
import { Bubble, Choices, Verdict, stableShuffle } from "@/components/answer/Chat";
import { VoiceAnswer } from "@/components/answer/VoiceAnswer";

export interface Picked {
  q: string;
  option: Option & { note?: string };
  options: Option[];
}

/**
 * Sequência de perguntas em formato de conversa. A cada pergunta você pode
 * responder falando (com avaliação da IA) e depois escolhe a alternativa mais próxima.
 * `instant`: mostra o comentário logo após cada resposta (senão, só no fim da etapa).
 */
export function AskSequence({
  steps,
  who,
  stage,
  hint,
  instant,
  voice = true,
  onAi,
  onFinish,
}: {
  steps: (AskStep & { star?: string })[];
  who: string;
  stage: string;
  hint?: string;
  instant?: boolean;
  voice?: boolean;
  onAi?(q: string, e: AnswerEvaluation): void;
  onFinish(picked: Picked[]): void;
}) {
  const [picked, setPicked] = useState<Picked[]>([]);
  const i = picked.length;
  const step = steps[i];
  const opts = useMemo(() => (step ? stableShuffle(step.options, step.q) : []), [step]);

  return (
    <div className="flex flex-col gap-3">
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
      {picked.map((p) => (
        <div key={p.q} className="flex flex-col gap-2">
          <Bubble who={who}>{p.q}</Bubble>
          <Bubble me>{p.option.text}</Bubble>
          {instant && <Verdict picked={p.option} options={p.options} />}
        </div>
      ))}
      {step && (
        <>
          <Bubble who={who}>{step.q}</Bubble>
          {step.star && <p className="text-[12px] text-muted">Monte no formato STAR · {step.star}</p>}
          {voice && (
            <VoiceAnswer
              key={step.q}
              ctx={{ stage, target: "pleno", question: step.q, reference: step.options.find((o) => o.level === "pleno")?.text }}
              onEvaluated={(e) => onAi?.(step.q, e)}
            />
          )}
          <div className="text-[12px] text-muted">Escolha a resposta mais próxima da sua:</div>
          <Choices
            options={opts}
            onPick={(o) => {
              const next = [...picked, { q: step.q, option: o, options: step.options }];
              setPicked(next);
              if (next.length === steps.length) onFinish(next);
            }}
          />
        </>
      )}
    </div>
  );
}

/** Revisão de código: clique na linha e diga o problema. */
export function CodeReviewView({ review, onFinish }: { review: CodeReview; onFinish(score: number, max: number, marks: Record<number, IssueKind>): void }) {
  const [marks, setMarks] = useState<Record<number, IssueKind>>({});
  const [open, setOpen] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const result = sent ? scoreReview(review, marks) : null;

  return (
    <div className="flex flex-col gap-3">
      <Bubble who="Time técnico">{review.context}</Bubble>
      <div className="panel overflow-x-auto p-0">
        <div className="border-b border-border px-3 py-1.5 font-mono text-[11px] text-muted">{review.title}</div>
        <div className="font-mono text-[12px] leading-6">
          {review.lines.map((line, k) => {
            const n = k + 1;
            const mark = marks[n];
            const issue = sent ? review.issues.find((x) => x.line === n) : undefined;
            const state = !sent ? (mark ? "marked" : "") : issue ? (mark === issue.kind ? "hit" : mark ? "half" : "miss") : mark ? "false" : "";
            const bg = { "": "", marked: "bg-accent-2/10", hit: "bg-ok/15", half: "bg-warn/15", miss: "bg-down/15", false: "bg-down/10" }[state];
            return (
              <div key={n}>
                <button
                  disabled={sent || !line.trim()}
                  onClick={() => setOpen(open === n ? null : n)}
                  className={`flex w-full gap-3 px-3 text-left hover:bg-accent/5 disabled:cursor-default ${bg}`}
                >
                  <span className="w-6 shrink-0 text-right text-muted">{n}</span>
                  <span className="whitespace-pre">{line || " "}</span>
                  {mark && <span className="ml-auto shrink-0 pl-3 text-[11px] text-accent-2">● {mark}</span>}
                </button>
                {open === n && !sent && (
                  <div className="flex flex-wrap gap-1.5 bg-panel-2 px-3 py-2 font-sans">
                    {ISSUE_KINDS.map((k2) => (
                      <button
                        key={k2}
                        onClick={() => {
                          setMarks({ ...marks, [n]: k2 });
                          setOpen(null);
                        }}
                        className={`btn-ghost px-2 py-1 text-[11px] ${mark === k2 ? "border-accent-2 text-accent-2" : ""}`}
                      >
                        {k2}
                      </button>
                    ))}
                    {mark && (
                      <button
                        onClick={() => {
                          const { [n]: _, ...rest } = marks;
                          setMarks(rest);
                          setOpen(null);
                        }}
                        className="px-2 py-1 text-[11px] text-muted underline"
                      >
                        tirar comentário
                      </button>
                    )}
                  </div>
                )}
                {issue && (
                  <div className={`px-12 py-1 font-sans text-[12px] ${state === "hit" ? "text-ok" : state === "half" ? "text-warn" : "text-down"}`}>
                    {state === "hit" ? "✓ " : state === "half" ? "± " : "✗ não marcada · "}
                    {issue.kind}: {issue.why}
                  </div>
                )}
                {sent && state === "false" && <div className="px-12 py-1 font-sans text-[12px] text-down">Esta linha não tinha problema (−0,5).</div>}
              </div>
            );
          })}
        </div>
      </div>
      {!sent ? (
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setSent(true)} className="btn-neon px-3 py-1.5 text-xs">
            Enviar revisão ({Object.keys(marks).length} comentários)
          </button>
          <span className="text-[12px] text-muted">Linha e tipo certos valem 1; linha certa com tipo errado, 0,5; linha sem problema marcada, −0,5.</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-mono text-sm">
            {result!.score} de {result!.max} problemas
          </span>
          <button onClick={() => onFinish(result!.score, result!.max, marks)} className="btn-neon px-3 py-1.5 text-xs">
            Seguir ▶
          </button>
        </div>
      )}
    </div>
  );
}
