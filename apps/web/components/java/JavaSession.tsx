"use client";

import { BLOCKS, POINTS, drawInterview, estimateLevel, getQuestion, type JavaQuestion } from "@sdp/hiring";
import { Dices, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { JavaQuestionView, type QuestionResult } from "./JavaQuestionView";

const GUIDE_URL = "https://claude.ai/artifact/AczyWaw1NdYjhjTScY3qCn";

/** Pontos de uma pergunta: resposta principal + aprofundamento (máximo 4). */
export const pointsOf = (r: QuestionResult) => POINTS[r.main.level] + POINTS[r.follow.level];

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

  if (i >= questions.length) return <SessionSummary questions={questions} results={results} onRestart={restart} full={full} />;

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
  const total = results.reduce((s, r) => s + pointsOf(r), 0);
  const max = results.length * 4;
  const est = estimateLevel(max ? total / max : 0);
  const ai = results.filter((r) => r.ai);
  const byBlock = BLOCKS.map((b) => {
    const rs = results.filter((r) => getQuestion(r.id)!.block === b.id);
    return { b, n: rs.length, pts: rs.reduce((s, r) => s + pointsOf(r), 0) };
  }).filter((x) => x.n);
  const weak = byBlock.filter((x) => x.pts / (x.n * 4) < 0.6);

  return (
    <div className="flex flex-col gap-5">
      <div className="panel pop-in flex flex-col items-center gap-2 p-5 text-center">
        <div className="hud-label">Nível que suas respostas mostraram</div>
        <div className={`font-display text-lg uppercase glow ${est.level.startsWith("pleno") ? "text-ok" : est.level === "júnior" ? "text-warn" : "text-down"}`}>{est.level}</div>
        <div className="font-mono text-sm text-muted">
          {total} de {max} pontos
        </div>
        <p className="max-w-lg text-sm text-muted">{est.text}</p>
        {ai.length > 0 && (
          <p className="text-sm">
            Na avaliação da IA ({ai.length} {ai.length === 1 ? "resposta" : "respostas"}):{" "}
            {ai.map((r) => r.ai!.level).join(", ")}.
          </p>
        )}
      </div>

      {byBlock.length > 1 && (
        <div className="panel flex flex-col gap-2 p-4">
          <div className="hud-label">Por bloco</div>
          {byBlock.map(({ b, n, pts }) => (
            <div key={b.id} className="grid grid-cols-[minmax(140px,220px)_1fr_4ch] items-center gap-3 text-sm">
              <span>{b.title}</span>
              <span className="h-2 overflow-hidden rounded bg-border">
                <span className={`block h-full ${pts / (n * 4) >= 0.6 ? "bg-ok" : "bg-down"}`} style={{ width: `${(pts / (n * 4)) * 100}%` }} />
              </span>
              <span className="font-mono text-xs text-muted">{pts}/{n * 4}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <div className="hud-label">Perguntas</div>
        {questions.map((q, k) => {
          const r = results[k];
          if (!r) return null;
          const p = pointsOf(r);
          return (
            <div key={q.id} className="panel flex items-start justify-between gap-3 p-2.5 text-[13px]">
              <span>{q.prompt}</span>
              <span className={`shrink-0 font-mono text-xs ${p >= 3 ? "text-ok" : p >= 2 ? "text-warn" : "text-down"}`}>{p}/4</span>
            </div>
          );
        })}
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
