"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleX, Dices, Flag, MessageCircle, Star, Timer, UserRound } from "lucide-react";
import { Canvas } from "@/components/canvas/Canvas";
import { useCanvas } from "@/components/canvas/store";
import { judge, peakOf, startChallenge, type Verdict } from "@/components/training/challenge";
import { CHALLENGES, randomChallenge } from "@/lib/training/challenges";
import type { Challenge, Choice } from "@/lib/training/types";
import { useRouter } from "next/navigation";

const fmt = (x: number, d = 0) => x.toLocaleString("pt-BR", { maximumFractionDigits: d });

type Q = { title: string; body: string; choices: Choice[]; lesson: string };
type Answer = { q: Q; picked: number };
type Phase = "brief" | "ask" | "estimate" | "design" | "follow" | "result";

/** Pergunta de entrevista: uma tentativa só, sem dica. O gabarito aparece no fim. */
function OneShot({ q, onAnswer }: { q: Q; onAnswer(k: number): void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Bubble>{q.body}</Bubble>
      {q.choices.map((ch, k) => (
        <button key={k} onClick={() => onAnswer(k)} className="btn-ghost px-2 py-1.5 text-left text-[13px]">
          <span className="mr-1.5 font-mono text-[11px] text-muted">{String.fromCharCode(65 + k)}</span>
          {ch.text}
        </button>
      ))}
    </div>
  );
}

function Bubble({ children, me }: { children: React.ReactNode; me?: boolean }) {
  return (
    <div className={`pop-in flex gap-2 text-[13px] leading-relaxed ${me ? "flex-row-reverse text-right" : ""}`}>
      <span className={`mt-0.5 shrink-0 self-start rounded-full border p-1 ${me ? "border-accent text-accent" : "border-accent-2 text-accent-2"}`}>
        {me ? <MessageCircle size={12} /> : <UserRound size={12} />}
      </span>
      <div className={`rounded-md border px-2 py-1.5 ${me ? "border-accent/40 bg-accent/5" : "border-accent-2/40 bg-accent-2/5"}`}>{children}</div>
    </div>
  );
}

/** O entrevistador: requisitos → estimativa → desenho com SLO → aprofundamento → nota. */
export function SdInterview({ c }: { c: Challenge }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("brief");
  const [start, setStart] = useState(0);
  const [now, setNow] = useState(0);
  const [ask, setAsk] = useState<Answer[]>([]);
  const [follow, setFollow] = useState<Answer[]>([]);
  const [estimate, setEstimate] = useState<number | null>(null);
  const [estInput, setEstInput] = useState("");
  const [verdict, setVerdict] = useState<Verdict | string | null>(null);
  const [delivered, setDelivered] = useState<Verdict | null>(null);
  const graphVersion = useCanvas((s) => s.graphVersion);
  const asks = c.ask ?? [];
  const follows = c.followUps ?? [];
  const peak = peakOf(c);

  useEffect(() => {
    setPhase("brief");
    setAsk([]);
    setFollow([]);
    setEstimate(null);
    setVerdict(null);
    setDelivered(null);
    useCanvas.getState().set({ problem: `${c.title}. ${c.brief}\nRequisitos:\n- ${c.requirements.join("\n- ")}` });
  }, [c]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  // mexeu no desenho: a nota antiga não vale mais
  useEffect(() => setVerdict((v) => (v && typeof v !== "string" ? null : v)), [graphVersion]);

  const sec = start ? Math.max(0, Math.floor((now - start) / 1000)) : 0;
  const clock = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;
  const estOk = estimate !== null && Math.abs(estimate - peak) <= peak * 0.2;

  const reroll = () => router.push(`/entrevista/system-design/${randomChallenge(c.id).id}`);

  return (
    <div className="flex flex-col gap-3 text-sm" data-tour="challenge">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 hud-label !text-accent-2">
          <UserRound size={14} /> Entrevista técnica
        </span>
        {start > 0 && (
          <span className={`flex items-center gap-1 font-mono text-xs ${sec > 45 * 60 ? "text-down" : "text-muted"}`} title="Uma entrevista costuma ter 45 minutos">
            <Timer size={13} /> {clock}
          </span>
        )}
      </div>
      <h1 className="font-display text-[11px] leading-relaxed text-accent glow">{c.title}</h1>
      <Stages phase={phase} />

      {phase === "brief" && (
        <>
          <Bubble>{c.brief}</Bubble>
          <p className="text-[12px] text-muted">
            O entrevistador não dá dica. Você pergunta, estima, desenha, simula e responde. No fim sai a nota, com o gabarito comentado.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setStart(Date.now());
                setNow(Date.now());
                setPhase(asks.length ? "ask" : "estimate");
              }}
              className="btn-neon px-3 py-1.5 text-xs"
            >
              Começar ▶
            </button>
            <button onClick={reroll} className="btn-ghost flex items-center gap-1.5 px-3 py-1.5 text-xs">
              <Dices size={13} /> Sortear outro
            </button>
          </div>
        </>
      )}

      {phase === "ask" && asks[ask.length] && (
        <OneShot
          key={ask.length}
          q={asks[ask.length]!}
          onAnswer={(k) => {
            const next = [...ask, { q: asks[ask.length]!, picked: k }];
            setAsk(next);
            if (next.length >= asks.length) setPhase("estimate");
          }}
        />
      )}

      {(phase === "estimate" || phase === "design" || phase === "follow") && (
        <>
          <Bubble>
            Boa pergunta. Os números:
            <ul className="mt-1 flex flex-col gap-0.5">
              {c.requirements.map((r) => (
                <li key={r} className="flex gap-1.5">
                  <span className="text-accent-2">▸</span>
                  {r}
                </li>
              ))}
            </ul>
          </Bubble>
        </>
      )}

      {phase === "estimate" && (
        <div className="flex flex-col gap-1.5">
          <Bubble>Antes de desenhar: quantas requisições por segundo no pico?</Bubble>
          <div className="flex items-center gap-2">
            <input value={estInput} onChange={(e) => setEstInput(e.target.value)} placeholder="sua conta" className="w-32" inputMode="decimal" />
            <span className="text-xs text-muted">req/s</span>
            <button
              onClick={() => {
                const v = Number(estInput.replace(/\./g, "").replace(",", "."));
                if (!Number.isFinite(v) || v <= 0) return;
                setEstimate(v);
                setPhase("design");
                useCanvas.getState().set({ notes: `${useCanvas.getState().notes}\nEstimativa de pico: ${fmt(v)} req/s`.trim() });
              }}
              className="btn-neon ml-auto px-2.5 py-1 text-xs"
            >
              Responder
            </button>
          </div>
        </div>
      )}

      {(phase === "design" || phase === "follow") && (
        <>
          <Bubble me>Estimei {fmt(estimate ?? 0)} req/s no pico.</Bubble>
          <Bubble>
            Anotado. Os Usuários já estão no canvas com essa carga ({fmt(peak)} req/s no pico). Monte o desenho, simule e me entregue quando cumprir o SLO.
          </Bubble>
        </>
      )}

      {phase === "design" && (
        <>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                const v = judge(c);
                setVerdict(v);
                if (typeof v !== "string") setDelivered(v);
              }}
              className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Flag size={13} /> Entregar desenho
            </button>
            <button onClick={() => startChallenge(c)} className="btn-ghost px-3 py-1.5 text-xs" title="Volta ao desenho inicial (Ctrl+Z desfaz)">
              Reiniciar desenho
            </button>
          </div>
          {typeof verdict === "string" && <div className="pop-in text-[13px] text-down">{verdict}</div>}
          {verdict && typeof verdict !== "string" && <VerdictCard v={verdict} />}
          {delivered && (
            <button onClick={() => setPhase(follows.length ? "follow" : "result")} className="btn-ghost self-start px-3 py-1.5 text-xs">
              {delivered.passed ? "Seguir para as perguntas finais ▶" : "Seguir mesmo assim ▶"}
            </button>
          )}
        </>
      )}

      {phase === "follow" && follows[follow.length] && (
        <OneShot
          key={`f${follow.length}`}
          q={follows[follow.length]!}
          onAnswer={(k) => {
            const next = [...follow, { q: follows[follow.length]!, picked: k }];
            setFollow(next);
            if (next.length >= follows.length) setPhase("result");
          }}
        />
      )}

      {phase === "result" && (
        <Result
          c={c}
          answers={[...ask, ...follow]}
          estimate={estimate}
          estOk={estOk}
          peak={peak}
          design={delivered}
          time={clock}
          onReroll={reroll}
        />
      )}
    </div>
  );
}

const STAGES: [Phase, string][] = [
  ["ask", "Requisitos"],
  ["estimate", "Estimativa"],
  ["design", "Desenho"],
  ["follow", "Aprofundamento"],
  ["result", "Nota"],
];

function Stages({ phase }: { phase: Phase }) {
  const idx = STAGES.findIndex(([p]) => p === phase);
  return (
    <div className="flex gap-1">
      {STAGES.map(([p, label], k) => (
        <div key={p} className="flex flex-1 flex-col gap-1">
          <div className={`h-1.5 rounded-full ${k === idx ? "bg-accent shadow-[0_0_6px_var(--accent)]" : k < idx ? "bg-ok/70" : "bg-border"}`} />
          <span className={`text-center font-mono text-[9px] uppercase ${k === idx ? "text-accent" : "text-muted"}`}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function VerdictCard({ v }: { v: Verdict }) {
  return (
    <div className={`panel pop-in flex flex-col gap-2 p-3 ${v.passed ? "border-ok/60" : "border-down/60"}`}>
      <div className="flex items-center justify-between">
        <span className={`font-display text-[10px] ${v.passed ? "text-ok glow" : "text-down glow"}`}>{v.passed ? "SLO CUMPRIDO" : "SLO NÃO CUMPRIDO"}</span>
        <Stars n={v.stars} of={v.max} />
      </div>
      {v.items.map((it) => (
        <div key={it.label} className="flex justify-between gap-2 text-[13px]">
          <span className={it.ok ? "text-ok" : "text-down"}>
            {it.ok ? "✓" : "✕"} {it.label}
          </span>
          <span className="text-right font-mono text-[11px] text-muted">{it.detail}</span>
        </div>
      ))}
    </div>
  );
}

function Stars({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: of }, (_, k) => (
        <Star
          key={k}
          size={18}
          className={k < n ? "pop-in fill-warn text-warn" : "text-border"}
          style={{ animationDelay: `${k * 150}ms`, filter: k < n ? "drop-shadow(0 0 5px var(--warn))" : undefined }}
        />
      ))}
    </span>
  );
}

function Result({
  c,
  answers,
  estimate,
  estOk,
  peak,
  design,
  time,
  onReroll,
}: {
  c: Challenge;
  answers: Answer[];
  estimate: number | null;
  estOk: boolean;
  peak: number;
  design: Verdict | null;
  time: string;
  onReroll(): void;
}) {
  const right = answers.filter((a) => a.q.choices[a.picked]?.correct).length;
  const parts = [answers.length ? right / answers.length : 1, estOk ? 1 : 0, design ? design.stars / design.max : 0];
  const score = parts.reduce((s, x) => s + x, 0) / parts.length;
  const stars = Math.round(score * 5);
  const label = score >= 0.8 ? "Forte: eu seguiria com você" : score >= 0.55 ? "Na média: depende das outras entrevistas" : "Ainda não: vale estudar e tentar de novo";
  return (
    <div className="flex flex-col gap-3">
      <div className="panel pop-in flex flex-col items-center gap-2 p-3 text-center">
        <Stars n={stars} of={5} />
        <div className={`font-display text-[10px] leading-relaxed ${score >= 0.8 ? "text-ok" : score >= 0.55 ? "text-warn" : "text-down"} glow`}>{label}</div>
        <div className="font-mono text-[11px] text-muted">
          perguntas {right}/{answers.length} · estimativa {estOk ? "✓" : "✕"} · desenho {design ? `${design.stars}/${design.max}` : "não entregue"} · {time}
        </div>
      </div>

      <div className="hud-label">Gabarito comentado</div>
      <div className="panel flex flex-col gap-1 p-2.5 text-[13px]">
        <div className={estOk ? "text-ok" : "text-down"}>
          {estOk ? "✓" : "✕"} Estimativa: você disse {fmt(estimate ?? 0)}; o pico é ≈ {fmt(peak)} req/s
        </div>
        <div className="text-[12px] text-muted">
          {fmt(c.load.dailyActiveUsers)} × {fmt(c.load.requestsPerUserPerDay)} ÷ 86.400 s × {fmt(c.load.peakFactor, 1)} (pico). Arredondar o dia para 100 mil segundos vale.
        </div>
      </div>
      {answers.map((a, k) => {
        const ok = !!a.q.choices[a.picked]?.correct;
        const best = a.q.choices.find((x) => x.correct)!;
        return (
          <div key={k} className="panel flex flex-col gap-1 p-2.5 text-[13px]">
            <div className={ok ? "text-ok" : "text-down"}>
              {ok ? <CheckCircle2 size={14} className="mr-1 inline" /> : <CircleX size={14} className="mr-1 inline" />}
              {a.q.title}
            </div>
            <div className="text-muted">Você: {a.q.choices[a.picked]!.text}</div>
            {!ok && <div className="text-[12px] text-down/90">{a.q.choices[a.picked]!.why}</div>}
            {!ok && <div className="text-text">Melhor resposta: {best.text}</div>}
            <div className="text-[12px] text-muted">{a.q.lesson}</div>
          </div>
        );
      })}
      <p className="text-[12px] text-muted">
        Quer uma avaliação de trade-offs por escrito? Explique o desenho na aba <span className="text-accent">Avaliação</span> e peça a nota da IA.
      </p>
      <div className="flex flex-wrap gap-2">
        <button onClick={onReroll} className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <Dices size={13} /> Outra entrevista
        </button>
        <Link href="/estudo/system-design" className="btn-ghost px-3 py-1.5 text-xs">
          Estudar os temas
        </Link>
      </div>
    </div>
  );
}

/** Página da entrevista: canvas com o entrevistador no painel da esquerda. */
export function SdInterviewCanvas({ id }: { id: string }) {
  const c = CHALLENGES.find((x) => x.id === id)!;
  const setup = useCallback(() => startChallenge(c), [c]);
  return <Canvas coach={<SdInterview c={c} />} setup={setup} />;
}
