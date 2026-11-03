"use client";

import type { AnswerEvaluation } from "@sdp/ai";
import { getBlock, type JavaQuestion, type Option } from "@sdp/hiring";
import { useMemo, useState } from "react";
import { Bubble, Choices, Verdict, stableShuffle } from "@/components/answer/Chat";
import { VoiceAnswer } from "@/components/answer/VoiceAnswer";

export interface QuestionResult {
  id: string;
  main: Option;
  follow: Option;
  checked: number;
  ai?: AnswerEvaluation;
}

/**
 * Uma pergunta de entrevista: o entrevistador pergunta, você responde falando ou
 * escrevendo (opcional, com avaliação por IA), escolhe a alternativa mais próxima
 * da sua, responde o aprofundamento e confere o que ele queria ouvir.
 */
export function JavaQuestionView({ q, who = "Entrevistador", stage = "Entrevista técnica · Java Pleno", onDone }: { q: JavaQuestion; who?: string; stage?: string; onDone(r: QuestionResult): void }) {
  const [main, setMain] = useState<Option | null>(null);
  const [follow, setFollow] = useState<Option | null>(null);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [ai, setAi] = useState<AnswerEvaluation | undefined>();
  const mainOpts = useMemo(() => stableShuffle(q.options, q.id), [q]);
  const followOpts = useMemo(() => stableShuffle(q.followUp.options, q.id + ":f"), [q]);
  const reference = q.options.find((o) => o.level === "pleno")!.text;

  return (
    <div className="flex flex-col gap-3">
      <div className="hud-label !text-muted">{getBlock(q.block)?.title}</div>
      <Bubble who={who}>{q.prompt}</Bubble>
      {q.code && <pre className="panel overflow-x-auto p-3 font-mono text-[12px] leading-relaxed text-text">{q.code}</pre>}

      <VoiceAnswer key={q.id} ctx={{ stage, target: "pleno", question: q.prompt, code: q.code, expected: q.checklist, reference }} onEvaluated={setAi} />
      {!main && (
        <>
          <div className="text-[12px] text-muted">Respondeu? Agora escolha a alternativa mais próxima do que você disse:</div>
          <Choices options={mainOpts} onPick={setMain} />
        </>
      )}

      {main && (
        <>
          <Bubble me>{main.text}</Bubble>
          <Verdict picked={main} options={q.options} />
          <Bubble who={who}>{q.followUp.q}</Bubble>
          {!follow && <Choices options={followOpts} onPick={setFollow} />}
        </>
      )}

      {follow && (
        <>
          <Bubble me>{follow.text}</Bubble>
          <Verdict picked={follow} options={q.followUp.options} title="Aprofundamento" />
          <div className="panel flex flex-col gap-1.5 p-3 text-[13px]">
            <div className="hud-label">O que o entrevistador queria ouvir · marque o que você falou</div>
            {q.checklist.map((c, k) => (
              <label key={c} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={checked.has(k) || !!ai?.covered.includes(c)}
                  onChange={() => setChecked((s) => (s.has(k) ? new Set([...s].filter((x) => x !== k)) : new Set(s).add(k)))}
                />
                {c}
              </label>
            ))}
          </div>
          <button
            onClick={() => onDone({ id: q.id, main: main!, follow, checked: q.checklist.filter((c, k) => checked.has(k) || ai?.covered.includes(c)).length, ai })}
            className="btn-neon self-start px-3 py-1.5 text-xs"
          >
            Próxima ▶
          </button>
        </>
      )}
    </div>
  );
}
