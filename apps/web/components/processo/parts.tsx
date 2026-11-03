"use client";

import type { AskStep, CodeReview } from "@sdp/hiring";
import { useState } from "react";
import { AiConversation, type ConvContext, type ConvResult } from "@/components/answer/AiConversation";
import { Bubble } from "@/components/answer/Chat";

/** Uma pergunta da etapa, com o que a IA precisa para avaliar. */
export interface ConvItem {
  q: string;
  code?: string;
  /** Dica mostrada antes de responder (ex. formato STAR). */
  hint?: string;
  reference?: string;
  expected?: string[];
  avoid?: string[];
  maxFollowUps?: number;
}

/** Converte uma pergunta com alternativas em contexto para a IA: a melhor vira referência, as outras viram sinais de alerta. */
export function fromStep(step: AskStep & { star?: string }): ConvItem {
  const best = step.options.find((o) => o.level === "pleno");
  return {
    q: step.q,
    hint: step.star ? `Monte no formato STAR · ${step.star}` : undefined,
    reference: best ? `${best.text} (${best.why})` : undefined,
    avoid: step.options.filter((o) => o.level !== "pleno").map((o) => `${o.text} (${o.why})`),
  };
}

/** Revisão de código como conversa: você escreve os comentários do pull request e a IA confere com os problemas do código. */
export function fromReview(review: CodeReview): ConvItem {
  return {
    q: `${review.context} Faça a revisão como faria num pull request: diga a linha, o problema e como corrigir. Comece pelo que é mais grave.`,
    code: `// ${review.title}\n` + review.lines.map((l, k) => `${String(k + 1).padStart(2)}  ${l}`).join("\n"),
    expected: review.issues.map((i) => `Linha ${i.line} (${i.kind}): ${i.why}`),
    maxFollowUps: 1,
  };
}

/**
 * Sequência de perguntas em conversa com a IA. Mostra o que já foi conversado e
 * a pergunta atual; o feedback de cada resposta fica para o fim da etapa.
 */
export function ConvSequence({
  items,
  who,
  ctx,
  hint,
  showFeedback,
  onFinish,
}: {
  items: ConvItem[];
  who: string;
  ctx: Omit<ConvContext, "reference" | "expected" | "avoid">;
  hint?: string;
  showFeedback?: boolean;
  onFinish(results: ConvResult[]): void;
}) {
  const [done, setDone] = useState<ConvResult[]>([]);
  const i = done.length;
  const item = items[i];

  return (
    <div className="flex flex-col gap-3">
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
      {done.map((r) => (
        <div key={r.question} className="flex flex-col gap-2 opacity-70">
          {r.transcript.map((t, k) => (
            <Bubble key={k} me={t.who === "candidato"} who={t.who === "entrevistador" ? who : undefined}>
              {t.text}
            </Bubble>
          ))}
        </div>
      ))}
      {item && (
        <>
          {items.length > 1 && (
            <div className="font-mono text-[11px] text-muted">
              Pergunta {i + 1} de {items.length}
            </div>
          )}
          {item.hint && <p className="text-[12px] text-muted">{item.hint}</p>}
          <AiConversation
            key={item.q}
            question={item.q}
            code={item.code}
            who={who}
            ctx={{ ...ctx, reference: item.reference, expected: item.expected, avoid: item.avoid }}
            maxFollowUps={item.maxFollowUps ?? 1}
            showFeedback={showFeedback}
            nextLabel={i === items.length - 1 ? "Encerrar a etapa ▶" : "Próxima pergunta ▶"}
            onDone={(r) => {
              const next = [...done, r];
              setDone(next);
              if (next.length === items.length) onFinish(next);
            }}
          />
        </>
      )}
    </div>
  );
}
