"use client";

import { BLOCKS, drawInterview, getQuestion, type JavaQuestion } from "@sdp/hiring";
import { Dices, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { SessionFeedbackPanel, answersOf, levelOf } from "@/components/answer/AiConversation";
import { AnswerFeedback, LEVEL_COLOR } from "@/components/answer/VoiceAnswer";
import { SaveBadge, useSaveHistory } from "@/lib/history";
import type { SessionFeedback } from "@sdp/ai";
import { JAVA_PLENO_JOB, JavaQuestionView, type QuestionResult } from "./JavaQuestionView";

const GUIDE_URL = "https://claude.ai/artifact/AczyWaw1NdYjhjTScY3qCn";

/** Sessão de perguntas: um bloco inteiro ou a entrevista completa sorteada. */
export function JavaSession({ ids, full }: { ids?: string[]; full?: boolean }) {
  const [questions, setQuestions] = useState<JavaQuestion[] | null>(ids ? ids.map((id) => getQuestion(id)!) : null);
  const [i, setI] = useState(0);
  const [results, setResults] = useState<QuestionResult[]>([]);

  // a entrevista completa é sorteada no navegador, para não repetir sempre a mesma
  useEffect(() => {
    if (full && !questions) setQuestions(drawInterview(Math.floor(Math.random() * 1e9)));
  }, [full, questions]);

  if (!questions) return null;
  const restart = () => {
    setResults([]);
    setI(0);
    if (full) setQuestions(drawInterview(Math.floor(Math.random() * 1e9)));
  };

  if (i >= questions.length) return <SessionSummary key={results.length} questions={questions} results={results} onRestart={restart} full={full} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-muted">
          Pergunta {i + 1} de {questions.length}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded bg-border">
          <div className="h-full bg-accent-2 transition-all" style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
      </div>
      <JavaQuestionView
        key={questions[i]!.id}
        q={questions[i]!}
        onDone={(r) => {
          setResults([...results, r]);
          setI(i + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}

function SessionSummary({ questions, results, onRestart, full }: { questions: JavaQuestion[]; results: QuestionResult[]; onRestart(): void; full?: boolean }) {
  const rated = results.filter((r) => !r.conv.skipped);
  const avg = rated.length ? rated.reduce((s, r) => s + r.conv.score, 0) / rated.length : 0;
  const level = levelOf(rated.map((r) => r.conv.level));
  const byBlock = BLOCKS.map((b) => {
    const rs = rated.filter((r) => getQuestion(r.id)!.block === b.id);
    return { b, n: rs.length, avg: rs.length ? rs.reduce((s, r) => s + r.conv.score, 0) / rs.length : 0 };
  }).filter((x) => x.n);
  const weak = byBlock.filter((x) => x.avg < 6);
  const blockTitle = questions[0] ? BLOCKS.find((b) => b.id === questions[0]!.block)?.title : "";
  const [id] = useState(() => crypto.randomUUID());
  const [general, setGeneral] = useState<SessionFeedback | undefined>();
  const title = full ? "Treino · Java Pleno · entrevista técnica completa" : `Treino · Java Pleno · bloco ${blockTitle}`;
  const saved = useSaveHistory(
    rated.length
      ? { id, kind: "treino", stack: "java", level: "pleno", title, outcome: `Média ${avg.toFixed(1)}/10 em ${rated.length} respostas`, levelShown: level, score: Math.round(avg * 10) / 10, state: { questions: questions.map((q) => q.id), results }, feedback: general }
      : null,
    [general],
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="panel pop-in flex flex-col items-center gap-2 p-5 text-center">
        <div className="hud-label">Nível que suas respostas mostraram</div>
        <div className={`font-display text-lg uppercase glow ${LEVEL_COLOR[level] ?? ""}`}>{rated.length ? level : "sem avaliação"}</div>
        <div className="font-mono text-sm text-muted">
          média {avg.toFixed(1)}/10 · {rated.length} de {results.length} respostas avaliadas pela IA
        </div>
      </div>

      <SaveBadge status={saved} />
      <SessionFeedbackPanel
        onReady={setGeneral}
        input={{
          title,
          target: "pleno",
          job: JAVA_PLENO_JOB,
          stages: [
            {
              stage: full ? "Entrevista técnica" : (blockTitle ?? "Bloco"),
              items: rated.map((r) => ({ question: r.conv.question, answer: answersOf(r.conv), level: r.conv.level, score: r.conv.score, gaps: r.conv.evals.flatMap((e) => e.gaps).slice(0, 4) })),
            },
          ],
        }}
      />

      {byBlock.length > 1 && (
        <div className="panel flex flex-col gap-2 p-4">
          <div className="hud-label">Por bloco</div>
          {byBlock.map(({ b, avg: a }) => (
            <div key={b.id} className="grid grid-cols-[minmax(140px,220px)_1fr_5ch] items-center gap-3 text-sm">
              <span>{b.title}</span>
              <span className="h-2 overflow-hidden rounded bg-border">
                <span className={`block h-full ${a >= 6 ? "bg-ok" : "bg-down"}`} style={{ width: `${a * 10}%` }} />
              </span>
              <span className="font-mono text-xs text-muted">{a.toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="hud-label">Perguntas · clique para rever o feedback</div>
        {results.map((r) => (
          <details key={r.id} className="panel p-2.5 text-[13px]">
            <summary className="flex cursor-pointer items-start justify-between gap-3">
              <span>{r.conv.question}</span>
              <span className={`shrink-0 font-mono text-xs ${r.conv.skipped ? "text-muted" : r.conv.score >= 7 ? "text-ok" : r.conv.score >= 5 ? "text-warn" : "text-down"}`}>
                {r.conv.skipped ? "pulada" : `${r.conv.score}/10 · ${r.conv.level}`}
              </span>
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              {r.conv.evals.map((e, k) => (
                <AnswerFeedback key={k} e={e} target="pleno" title={k === 0 ? "Resposta principal" : "Aprofundamento"} />
              ))}
            </div>
          </details>
        ))}
      </div>

      {weak.length > 0 && (
        <p className="text-sm text-muted">
          Para revisar no{" "}
          <a href={GUIDE_URL} target="_blank" rel="noopener" className="text-accent underline">
            guia de estudo
          </a>
          : {weak.map((w) => w.b.guide).join("; ")}.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={onRestart} className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs">
          {full ? <Dices size={13} /> : <RotateCcw size={13} />} {full ? "Outra entrevista" : "Refazer o bloco"}
        </button>
        <Link href="/entrevista/java/pleno" className="btn-ghost px-3 py-1.5 text-xs">
          Voltar aos blocos
        </Link>
      </div>
    </div>
  );
}
