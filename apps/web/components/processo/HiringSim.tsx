"use client";

import type { AnswerEvaluation } from "@sdp/ai";
import {
  ADMISSAO,
  BEHAVIORAL,
  COMPANIES,
  DOWNLEVEL,
  GHOSTING,
  PASS,
  POINTS,
  SOFT_WARMUP,
  STAGES,
  TAKEHOME,
  cltVsPj,
  counterOffer,
  drawInterview,
  estimateLevel,
  getCompany,
  getQuestion,
  makeOffer,
  reviewFor,
  rhQuestions,
  rng,
  triagemForm,
  type Company,
  type CompanyId,
  type Offer,
  type Option,
  type Regime,
  type StageId,
} from "@sdp/hiring";
import { Briefcase, Building2, CheckCircle2, CircleX, Flag, RotateCcw, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bubble, Choices, Verdict } from "@/components/answer/Chat";
import { JavaQuestionView, type QuestionResult } from "@/components/java/JavaQuestionView";
import { pointsOf } from "@/components/java/JavaSession";
import { RACE_INTERVIEWS } from "@/lib/concurrency/interviews";
import { AskSequence, CodeReviewView, type Picked } from "./parts";

// ───────────────────────── Estado ─────────────────────────

interface Note {
  stage: StageId;
  text: string;
  bad: boolean;
}

interface Run {
  v: 1;
  company: CompanyId;
  seed: number;
  stage: StageId | "fim";
  scores: Partial<Record<StageId, { score: number; max: number }>>;
  notes: Note[];
  eliminated?: { stage: StageId; reason: string };
  declined?: boolean;
  askedLow: boolean;
  downgraded: boolean;
  java: { id: string; pts: number }[];
  ai: { stage: StageId; question: string; level: string }[];
  offer?: Offer;
  final?: { monthly: number; regime: Regime };
}

/** O que uma etapa devolve quando termina. */
interface StageDone {
  score: number;
  max: number;
  notes: Note[];
  /** Eliminado por um motivo que não é a nota (filtro, evento). */
  eliminated?: string;
  patch?: Partial<Run>;
}

const KEY = "processo-seletivo:v1";
const load = (): Run | null => {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return r?.v === 1 && getCompany(r.company) ? r : null;
  } catch {
    return null;
  }
};
const save = (r: Run | null) => {
  try {
    if (r) localStorage.setItem(KEY, JSON.stringify(r));
    else localStorage.removeItem(KEY);
  } catch {}
};

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;
const pts = (picked: Picked[]) => picked.reduce((s, p) => s + POINTS[p.option.level], 0);
const notesOf = (stage: StageId, picked: Picked[]): Note[] =>
  picked.filter((p) => p.option.note).map((p) => ({ stage, text: p.option.note!, bad: p.option.level !== "pleno" }));

/** Eventos sorteados pela semente: a mesma corrida sempre tem os mesmos. */
function eventsOf(seed: number) {
  const r = rng(seed ^ 0x5eed);
  return { downlevel: r() < 0.5, ghost: r() < 0.4, otherProfile: r() < 0.5 };
}

// ───────────────────────── Componente principal ─────────────────────────

export function HiringSim() {
  const [run, setRun] = useState<Run | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pending, setPending] = useState<StageDone | null>(null);

  useEffect(() => {
    setRun(load());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) save(run);
  }, [run, loaded]);

  if (!loaded) return null;
  if (!run) return <CompanyPicker onPick={(id) => setRun({ v: 1, company: id, seed: Math.floor(Math.random() * 1e9), stage: "triagem", scores: {}, notes: [], askedLow: false, downgraded: false, java: [], ai: [] })} />;

  const c = getCompany(run.company)!;
  const addAi = (stage: StageId) => (question: string, e: AnswerEvaluation) => setRun((r) => r && { ...r, ai: [...r.ai, { stage, question, level: e.level }] });

  function finishStage(d: StageDone) {
    setPending(d);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function advance() {
    if (!run || !pending || run.stage === "fim") return;
    const stage = run.stage;
    const pass = PASS[stage];
    const frac = pending.max ? pending.score / pending.max : 1;
    const failed = pending.eliminated ?? (pass !== undefined && frac < pass ? `Nota abaixo do corte da etapa (${Math.round(frac * 100)}% de ${Math.round(pass * 100)}%).` : undefined);
    const idx = STAGES.findIndex((s) => s.id === stage);
    const next: Run = {
      ...run,
      ...pending.patch,
      scores: pending.max ? { ...run.scores, [stage]: { score: pending.score, max: pending.max } } : run.scores,
      notes: [...run.notes, ...pending.notes],
      eliminated: failed ? { stage, reason: failed } : run.eliminated,
      stage: failed || pending.patch?.declined || idx === STAGES.length - 1 ? "fim" : STAGES[idx + 1]!.id,
    };
    setRun(next);
    setPending(null);
    window.scrollTo({ top: 0 });
  }

  const restart = (same: boolean) => {
    setPending(null);
    setRun(same ? { v: 1, company: run.company, seed: Math.floor(Math.random() * 1e9), stage: "triagem", scores: {}, notes: [], askedLow: false, downgraded: false, java: [], ai: [] } : null);
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 hud-label !text-accent-2">
          <Briefcase size={14} /> Processo seletivo · {c.name}
        </span>
        <button onClick={() => restart(false)} className="text-[11px] text-muted underline hover:text-accent">
          trocar de empresa
        </button>
      </div>
      <Stepper run={run} />

      <div className="mt-6">
        {run.stage === "fim" ? (
          <Report run={run} c={c} onRestart={() => restart(true)} onOther={() => restart(false)} />
        ) : pending ? (
          <StageResult stage={run.stage} d={pending} onNext={advance} />
        ) : (
          <StageView key={`${run.stage}-${run.seed}`} run={run} c={c} onAi={addAi(run.stage)} onDone={finishStage} />
        )}
      </div>
    </div>
  );
}

function Stepper({ run }: { run: Run }) {
  const elim = run.eliminated ? STAGES.findIndex((s) => s.id === run.eliminated!.stage) : -1;
  const at = elim >= 0 ? elim : run.stage === "fim" ? STAGES.length : STAGES.findIndex((s) => s.id === run.stage);
  return (
    <ol className="mt-4 grid grid-cols-7 gap-1">
      {STAGES.map((s, k) => {
        const out = run.eliminated?.stage === s.id;
        const state = out ? "out" : k < at ? "done" : k === at && run.stage !== "fim" ? "now" : "todo";
        return (
          <li key={s.id} className="flex flex-col items-center gap-1 text-center">
            <span
              className={`h-1.5 w-full rounded ${state === "done" ? "bg-ok" : state === "now" ? "bg-accent-2 shadow-[0_0_8px_var(--accent-2)]" : state === "out" ? "bg-down" : "bg-border"}`}
            />
            <span className={`font-mono text-[9px] uppercase tracking-wider sm:text-[10px] ${state === "now" ? "text-accent-2" : state === "out" ? "text-down" : "text-muted"}`}>{s.short}</span>
          </li>
        );
      })}
    </ol>
  );
}

function CompanyPicker({ onPick }: { onPick(id: CompanyId): void }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-accent-2">
        <Briefcase size={14} /> Processo seletivo
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Do RH à <span className="text-accent-2 glow">contratação.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Você se candidata a uma vaga de Dev Java Pleno e passa por todas as etapas de um processo real: triagem, RH, teste técnico, entrevista técnica,
        gestor, proposta e admissão. Em cada uma pode ser eliminado, e no fim recebe o feedback que a empresa nunca dá, com o nível que você mostrou.
        Responda falando quando quiser: o navegador transcreve e a IA avalia.
      </p>
      <p className="mt-2 text-[12px] text-muted">Empresas fictícias, montadas a partir de relatos reais de processos (Glassdoor) e das vagas Java lidas no seu guia de estudo.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {COMPANIES.map((c) => (
          <button key={c.id} onClick={() => onPick(c.id)} className="panel group flex flex-col gap-2 p-5 text-left transition-shadow hover:border-accent-2 hover:shadow-[0_0_24px_rgba(255,60,172,0.3)]">
            <Building2 size={28} className="text-accent-2" />
            <div className="font-display text-[12px] leading-relaxed text-accent-2">{c.name}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted">{c.kind}</div>
            <p className="text-sm text-muted">{c.pattern}</p>
            <div className="mt-auto pt-2 font-mono text-[11px] text-muted">
              {c.city} · {brl(c.band[0])} a {brl(c.band[1])} · {c.regimes.join(" ou ")}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StageHeader({ c, stage }: { c: Company; stage: StageId }) {
  const s = STAGES.find((x) => x.id === stage)!;
  return (
    <div className="mb-4">
      <h2 className="font-display text-sm leading-relaxed text-accent glow">{s.title}</h2>
      {stage !== "admissao" && (
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
          <UserRound size={12} /> {c.who[stage]}
        </div>
      )}
    </div>
  );
}

function StageView({ run, c, onAi, onDone }: { run: Run; c: Company; onAi(q: string, e: AnswerEvaluation): void; onDone(d: StageDone): void }) {
  const stage = run.stage as StageId;
  return (
    <div>
      <StageHeader c={c} stage={stage} />
      {stage === "triagem" && <Triagem c={c} onDone={onDone} />}
      {stage === "rh" && <Rh c={c} onAi={onAi} onDone={onDone} />}
      {stage === "teste" && <Teste c={c} onAi={onAi} onDone={onDone} />}
      {stage === "tecnica" && <Tecnica run={run} c={c} onAi={onAi} onDone={onDone} />}
      {stage === "gestor" && <Gestor run={run} c={c} onAi={onAi} onDone={onDone} />}
      {stage === "proposta" && <Proposta run={run} c={c} onDone={onDone} />}
      {stage === "admissao" && <Admissao run={run} onDone={onDone} />}
    </div>
  );
}

function StageResult({ stage, d, onNext }: { stage: StageId; d: StageDone; onNext(): void }) {
  const pass = PASS[stage];
  const frac = d.max ? d.score / d.max : 1;
  const failed = !!d.eliminated || (pass !== undefined && frac < pass);
  const title = STAGES.find((s) => s.id === stage)!.title;
  return (
    <div className="flex flex-col gap-3">
      <div className={`panel pop-in flex flex-col items-center gap-2 p-5 text-center ${failed ? "border-down" : "border-ok"}`}>
        {failed ? <CircleX size={30} className="text-down" /> : <CheckCircle2 size={30} className="text-ok" />}
        <div className={`font-display text-[12px] glow ${failed ? "text-down" : "text-ok"}`}>{failed ? "Eliminado nesta etapa" : `${title}: aprovado`}</div>
        {d.max > 0 && (
          <div className="font-mono text-sm text-muted">
            {d.score} de {d.max} pontos {pass !== undefined && `· corte ${Math.round(pass * 100)}%`}
          </div>
        )}
        {d.eliminated && <p className="max-w-md text-sm">{d.eliminated}</p>}
      </div>
      {d.notes.length > 0 && (
        <div className="panel flex flex-col gap-1 p-3 text-[13px]">
          <div className="hud-label">O que ficou anotado sobre você</div>
          {d.notes.map((n) => (
            <div key={n.text} className={n.bad ? "text-warn" : "text-ok"}>
              {n.bad ? "▲ " : "✓ "}
              {n.text}
            </div>
          ))}
        </div>
      )}
      <button onClick={onNext} className="btn-neon self-start px-4 py-2 text-xs">
        {failed ? "Ver o feedback completo ▶" : "Próxima etapa ▶"}
      </button>
    </div>
  );
}

/** Comentário de cada resposta, mostrado no fim de uma etapa em conversa. */
function Review({ picked }: { picked: Picked[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="hud-label">Comentário de cada resposta</div>
      {picked.map((p) => (
        <Verdict key={p.q} picked={p.option} options={p.options} title={p.q.length > 60 ? p.q.slice(0, 57) + "…" : p.q} />
      ))}
    </div>
  );
}

// ───────────────────────── Etapas ─────────────────────────

function Triagem({ c, onDone }: { c: Company; onDone(d: StageDone): void }) {
  const form = useMemo(() => triagemForm(c), [c]);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const ready = form.every((_, k) => answers[k] !== undefined);

  function submit() {
    const chosen = form.map((f, k) => f.options[answers[k]!]!);
    const ko = chosen.find((o) => o.knockout);
    const notes: Note[] = chosen.filter((o) => o.note).map((o) => ({ stage: "triagem", text: o.note!, bad: true }));
    onDone({
      score: 0,
      max: 0,
      notes,
      eliminated: ko ? `Filtro automático da vaga: ${ko.why}` : undefined,
      patch: { askedLow: chosen[1]?.level === "livro" },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="panel flex flex-col gap-2 p-4 text-sm">
        <div className="font-semibold text-accent">{c.jobAd.title}</div>
        <div className="text-[12px] text-muted">
          {c.name} · {c.city} · {c.model}
        </div>
        <p>{c.jobAd.about}</p>
        <div>
          <b>Requisitos:</b> {c.jobAd.must.join(" · ")}
        </div>
        <div className="text-muted">
          <b className="text-text">Diferenciais:</b> {c.jobAd.nice.join(" · ")}
        </div>
        <div className="text-muted">
          <b className="text-text">Oferecemos:</b> {c.jobAd.offer.join(" · ")}
        </div>
      </div>
      <p className="text-[12px] text-muted">Formulário de candidatura. Algumas respostas eliminam automaticamente, antes de uma pessoa ler o currículo.</p>
      {form.map((f, k) => (
        <fieldset key={f.q} className="panel flex flex-col gap-1.5 p-3 text-[13px]">
          <legend className="px-1 font-semibold">{f.q}</legend>
          {f.options.map((o, j) => (
            <label key={o.text} className="flex cursor-pointer items-center gap-2">
              <input type="radio" name={`f${k}`} checked={answers[k] === j} onChange={() => setAnswers({ ...answers, [k]: j })} />
              {o.text}
            </label>
          ))}
        </fieldset>
      ))}
      <button disabled={!ready} onClick={submit} className="btn-neon self-start px-4 py-2 text-xs disabled:opacity-40">
        Enviar candidatura
      </button>
    </div>
  );
}

function Rh({ c, onAi, onDone }: { c: Company; onAi(q: string, e: AnswerEvaluation): void; onDone(d: StageDone): void }) {
  const steps = useMemo(() => rhQuestions(c), [c]);
  const [picked, setPicked] = useState<Picked[] | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <AskSequence
        steps={steps}
        who={c.who.rh}
        stage="Conversa com o RH"
        hint="Videochamada de 30 minutos. O recrutador anota tudo; o comentário de cada resposta aparece no fim."
        onAi={onAi}
        onFinish={setPicked}
      />
      {picked && (
        <>
          <Bubble who={c.who.rh}>Obrigada pela conversa! Vou passar seu perfil para o time técnico e te retorno nos próximos dias.</Bubble>
          <Review picked={picked} />
          <button
            onClick={() => {
              const low = picked.find((p) => p.q.startsWith("Qual sua pretensão"))?.option.level === "errada";
              onDone({ score: pts(picked), max: picked.length * 2, notes: notesOf("rh", picked), patch: low ? { askedLow: true } : undefined });
            }}
            className="btn-neon self-start px-4 py-2 text-xs"
          >
            Ver resultado da etapa ▶
          </button>
        </>
      )}
    </div>
  );
}

function Teste({ c, onAi, onDone }: { c: Company; onAi(q: string, e: AnswerEvaluation): void; onDone(d: StageDone): void }) {
  const [delivered, setDelivered] = useState(false);
  const [picked, setPicked] = useState<Picked[] | null>(null);

  if (c.testFormat === "revisao")
    return (
      <CodeReviewView
        review={reviewFor(c)}
        onFinish={(score, max) =>
          onDone({
            score,
            max,
            notes: [{ stage: "teste", text: score / max >= 0.6 ? "Boa revisão de código: achou os problemas que importam." : "Revisão de código deixou passar problemas sérios.", bad: score / max < 0.6 }],
          })
        }
      />
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="panel flex flex-col gap-2 p-4 text-sm">
        <div className="font-semibold text-accent">{TAKEHOME.title}</div>
        <ul className="list-disc pl-5">
          {TAKEHOME.brief.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </div>
      {!delivered ? (
        <>
          <p className="text-[12px] text-muted">
            Faça de verdade se quiser (é um ótimo projeto de portfólio). Na simulação, você marca como entregue e vai direto para a conversa sobre as suas
            decisões.
          </p>
          <button onClick={() => setDelivered(true)} className="btn-neon self-start px-4 py-2 text-xs">
            Entreguei o desafio ▶
          </button>
        </>
      ) : (
        <>
          <AskSequence steps={TAKEHOME.defense} who={c.who.tecnica} stage="Teste técnico · defesa do desafio" hint="O tech lead abriu seu repositório e quer entender as decisões." onAi={onAi} onFinish={setPicked} />
          {picked && (
            <>
              <Review picked={picked} />
              <button onClick={() => onDone({ score: pts(picked), max: picked.length * 2, notes: [] })} className="btn-neon self-start px-4 py-2 text-xs">
                Ver resultado da etapa ▶
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Tecnica({ run, c, onAi, onDone }: { run: Run; c: Company; onAi(q: string, e: AnswerEvaluation): void; onDone(d: StageDone): void }) {
  const questions = useMemo(() => drawInterview(run.seed, 6), [run.seed]);
  const race = useMemo(() => RACE_INTERVIEWS[run.seed % RACE_INTERVIEWS.length]!, [run.seed]);
  const raceSteps = useMemo(
    () =>
      [race.diagnose, race.fix].map((q, k) => ({
        q: k === 0 ? `${race.report.replace(/^"|"$/g, "")} ${q.q}` : q.q,
        options: q.choices.map((ch): Option => ({ text: ch.text, level: ch.correct ? "pleno" : "errada", why: ch.why })),
      })),
    [race],
  );
  const [warm, setWarm] = useState<Picked[] | null>(c.softWarmup ? null : []);
  const [java, setJava] = useState<QuestionResult[]>([]);
  const [racePicked, setRacePicked] = useState<Picked[] | null>(c.raceQuestion ? null : []);
  const [downlevel, setDownlevel] = useState<Option | null>(null);

  const javaDone = java.length === questions.length;
  const allDone = warm && javaDone && racePicked;
  const score = (warm ? pts(warm) : 0) + java.reduce((s, r) => s + pointsOf(r), 0) + (racePicked ? pts(racePicked) : 0);
  const max = (warm?.length ?? 0) * 2 + questions.length * 4 + (racePicked?.length ?? 0) * 2;
  const frac = max ? score / max : 0;
  // relato real: com nota média, a empresa oferece júnior em vez de pleno
  const offerJunior = allDone && frac >= 0.6 && frac < 0.75 && eventsOf(run.seed).downlevel;

  function finish(dl?: Option) {
    const notes: Note[] = [{ stage: "tecnica", text: estimateLevel(frac).text, bad: frac < 0.6 }];
    let eliminated: string | undefined;
    let downgraded = false;
    if (dl) {
      notes.push({ stage: "tecnica", text: dl.level === "pleno" ? "Pediu feedback e negociou seguir como pleno com plano de revisão." : dl.level === "livro" ? "Aceitou a vaga de júnior sem negociar revisão." : "Recusou a vaga de júnior sem pedir feedback.", bad: dl.level !== "pleno" });
      if (dl.level === "errada") eliminated = "Você recusou a proposta de seguir como júnior, e o processo foi encerrado.";
      if (dl.level === "livro") downgraded = true;
    }
    onDone({ score, max, notes, eliminated, patch: { java: java.map((r) => ({ id: r.id, pts: pointsOf(r) })), downgraded } });
  }

  return (
    <div className="flex flex-col gap-5">
      {!warm && (
        <AskSequence
          steps={SOFT_WARMUP}
          who={c.who.tecnica}
          stage="Entrevista técnica · soft skills"
          hint="Como no relato do banco digital: os primeiros 30 minutos são de soft skills."
          instant
          onAi={onAi}
          onFinish={setWarm}
        />
      )}
      {warm && !javaDone && (
        <>
          <div className="font-mono text-xs text-muted">
            Pergunta técnica {java.length + 1} de {questions.length}
          </div>
          <JavaQuestionView key={questions[java.length]!.id} q={questions[java.length]!} who={c.who.tecnica} onDone={(r) => (setJava([...java, r]), window.scrollTo({ top: 0, behavior: "smooth" }))} />
        </>
      )}
      {warm && javaDone && !racePicked && (
        <AskSequence steps={raceSteps} who={c.who.tecnica} stage="Entrevista técnica · concorrência" hint="Para fechar, um bug de produção (o mesmo tipo da área Concorrência e dados)." instant voice={false} onFinish={setRacePicked} />
      )}
      {allDone && !offerJunior && (
        <button onClick={() => finish()} className="btn-neon self-start px-4 py-2 text-xs">
          Encerrar entrevista técnica ▶
        </button>
      )}
      {offerJunior && (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-muted">Dois dias depois, a recrutadora liga:</p>
          <Bubble who={c.who.rh}>{DOWNLEVEL.q}</Bubble>
          {!downlevel ? (
            <Choices options={DOWNLEVEL.options} onPick={setDownlevel} />
          ) : (
            <>
              <Bubble me>{downlevel.text}</Bubble>
              <Verdict picked={downlevel} options={DOWNLEVEL.options} />
              <button onClick={() => finish(downlevel)} className="btn-neon self-start px-4 py-2 text-xs">
                Seguir ▶
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Gestor({ run, c, onAi, onDone }: { run: Run; c: Company; onAi(q: string, e: AnswerEvaluation): void; onDone(d: StageDone): void }) {
  const ev = eventsOf(run.seed);
  const [ghost, setGhost] = useState<Option | null>(ev.ghost ? null : GHOSTING.options[0]!);
  const [picked, setPicked] = useState<Picked[] | null>(null);

  function finish() {
    const score = pts(picked!);
    const max = picked!.length * 2;
    const frac = score / max;
    const notes = notesOf("gestor", picked!);
    if (ev.ghost) notes.push({ stage: "gestor", text: ghost!.level === "pleno" ? "Fez um follow-up educado quando o processo parou." : ghost!.level === "errada" ? "Cobrou o gestor direto no LinkedIn, passando por cima do RH." : "Esperou sem dar sinal quando o processo parou.", bad: ghost!.level !== "pleno" });
    // relato real: "o gestor preferiu seguir com outro perfil", mesmo com técnica boa
    const other = frac >= 0.6 && frac < 0.75 && ev.otherProfile;
    onDone({
      score,
      max,
      notes,
      eliminated: other ? "\"O gestor preferiu seguir com outro perfil no momento.\" O motivo real: as respostas comportamentais ficaram genéricas, sem situação e resultado concretos, e outro candidato mostrou isso melhor." : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {!ghost && (
        <div className="flex flex-col gap-3">
          <Bubble who="Sistema">{GHOSTING.q}</Bubble>
          <Choices options={GHOSTING.options} onPick={setGhost} />
        </div>
      )}
      {ghost && ev.ghost && (
        <>
          <Bubble me>{ghost.text}</Bubble>
          <Verdict picked={ghost} options={GHOSTING.options} />
          <Bubble who={c.who.rh}>Oi! Desculpe a demora, estava fechando outras vagas. Agendei sua conversa com o gestor para amanhã.</Bubble>
        </>
      )}
      {ghost && (
        <AskSequence
          steps={BEHAVIORAL}
          who={c.who.gestor}
          stage="Entrevista com o gestor (comportamental)"
          hint="Conversa de 45 minutos sobre como você trabalha. Responda com casos reais no formato STAR."
          onAi={onAi}
          onFinish={setPicked}
        />
      )}
      {picked && (
        <>
          <Review picked={picked} />
          <button onClick={finish} className="btn-neon self-start px-4 py-2 text-xs">
            Ver resultado da etapa ▶
          </button>
        </>
      )}
    </div>
  );
}

function Proposta({ run, c, onDone }: { run: Run; c: Company; onDone(d: StageDone): void }) {
  const perf = useMemo(() => {
    const fr = (["rh", "teste", "tecnica", "gestor"] as const).map((s) => run.scores[s]).filter(Boolean).map((x) => x!.score / x!.max);
    return fr.length ? fr.reduce((a, b) => a + b, 0) / fr.length : 0.5;
  }, [run.scores]);
  const offer = useMemo(() => {
    const o = makeOffer(c, perf, run.askedLow);
    return run.downgraded ? { ...o, monthly: Math.round((o.monthly * 0.7) / 100) * 100 } : o;
  }, [c, perf, run.askedLow, run.downgraded]);
  const benefits = 1200;
  const pjOffer = Math.round((offer.monthly * 1.25) / 100) * 100;
  const [regime, setRegime] = useState<Regime>("CLT");
  const [mode, setMode] = useState<"carta" | "contra" | "resposta">("carta");
  const [asked, setAsked] = useState(Math.round((offer.monthly * 1.1) / 100) * 100);
  const [answer, setAnswer] = useState<ReturnType<typeof counterOffer> | null>(null);
  const current = regime === "PJ" ? pjOffer : offer.monthly;
  const calc = cltVsPj(regime === "PJ" ? offer.monthly : current, benefits);

  function close(accepted: boolean, monthly: number, extra: Note[]) {
    onDone({
      score: 0,
      max: 0,
      notes: extra,
      patch: accepted ? { offer: { regime, monthly: current }, final: { monthly, regime } } : { offer: { regime, monthly: current }, declined: true },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Bubble who={c.who.proposta}>
        Tenho uma ótima notícia: você foi aprovado{run.downgraded ? " para a vaga de júnior" : ""}! Segue a proposta. Fique à vontade para analisar com calma.
      </Bubble>
      <div className="panel flex flex-col gap-2 p-4 text-sm">
        <div className="hud-label">Proposta · {c.name}</div>
        {c.regimes.length > 1 && (
          <div className="flex gap-2">
            {(["CLT", "PJ"] as const).map((r) => (
              <button key={r} onClick={() => setRegime(r)} className={`btn-ghost px-3 py-1 text-xs ${regime === r ? "border-accent text-accent" : ""}`}>
                {r}
              </button>
            ))}
          </div>
        )}
        <div className="font-display text-lg text-accent glow">{brl(current)}/mês</div>
        <div className="text-muted">
          {regime === "CLT" ? `CLT · ${c.jobAd.offer.filter((x) => x !== "CLT" && x !== "CLT ou PJ").join(" · ")}` : "PJ · sem benefícios, nota fiscal mensal, 30 dias de aviso"}
        </div>
        <div className="text-[12px] text-muted">Faixa da vaga (CLT): {brl(c.band[0])} a {brl(c.band[1])}. Referência de mercado em BH, Back-End Pleno: {brl(9950)} a {brl(16700)} (Robert Half).</div>
      </div>

      <div className="panel flex flex-col gap-1 p-3 text-[13px]">
        <div className="hud-label">CLT x PJ · conta de bolso</div>
        <div>
          CLT de {brl(regime === "PJ" ? offer.monthly : current)} com {brl(benefits)} de benefícios = pacote de {brl(calc.packageYear)} por ano (13º, férias com 1/3 e FGTS).
        </div>
        <div>
          Para o PJ empatar: cerca de <b>{brl(calc.pjMonthly)}/mês</b> ({Math.round((calc.ratio - 1) * 100)}% a mais), contando 11 notas por ano, ~6% de imposto (Simples Nacional) e contador.
        </div>
        {regime === "PJ" && <div className={pjOffer < calc.pjMonthly ? "text-warn" : "text-ok"}>{pjOffer < calc.pjMonthly ? `A proposta PJ fica ${brl(calc.pjMonthly - pjOffer)} abaixo do equivalente: vale contrapropor.` : "A proposta PJ cobre o pacote CLT."}</div>}
        <div className="text-[11px] text-muted">Aproximado: INSS, IR e plano de saúde mudam o resultado. Para decidir de verdade, peça a um contador.</div>
      </div>

      {mode === "carta" && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => close(true, current, [{ stage: "proposta", text: "Aceitou a primeira proposta na hora, sem negociar.", bad: true }])} className="btn-neon px-3 py-1.5 text-xs">
            Aceitar agora
          </button>
          <button onClick={() => setMode("contra")} className="btn-ghost px-3 py-1.5 text-xs">
            Pedir 1 dia e contrapropor
          </button>
          <button onClick={() => close(false, 0, [{ stage: "proposta", text: "Recusou a proposta.", bad: false }])} className="btn-ghost px-3 py-1.5 text-xs text-down">
            Recusar
          </button>
        </div>
      )}
      {mode === "contra" && (
        <div className="panel flex flex-col gap-2 p-3 text-[13px]">
          <div>No dia seguinte, você liga para a recrutadora. Quanto você pede?</div>
          <label className="flex items-center gap-2">
            R$ <input type="number" step={100} value={asked} onChange={(e) => setAsked(Number(e.target.value))} className="w-32" />
            <span className="text-muted">/mês {regime}</span>
          </label>
          <p className="text-[12px] text-muted">Dica: peça um valor justificado pela pesquisa de mercado e pelo pacote, sem citar outra proposta que você não aceitaria.</p>
          <button
            onClick={() => {
              setAnswer(counterOffer(c, { regime, monthly: current }, asked));
              setMode("resposta");
            }}
            className="btn-neon self-start px-3 py-1.5 text-xs"
          >
            Fazer contraproposta
          </button>
        </div>
      )}
      {mode === "resposta" && answer && (
        <>
          <Bubble me>Agradeço muito a proposta. Pela pesquisa de mercado e considerando o pacote, eu esperava {brl(asked)}. Conseguimos chegar nesse valor?</Bubble>
          <Bubble who={c.who.proposta}>{answer.text}</Bubble>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                close(true, answer.monthly, [
                  {
                    stage: "proposta",
                    text: answer.kind === "aceita" ? `Negociou e conseguiu ${brl(answer.monthly - current)} a mais por mês.` : answer.kind === "meio-termo" ? `Negociou e chegou num meio-termo: +${brl(answer.monthly - current)}/mês.` : "Pediu acima da faixa; ficou com +3% e revisão em 6 meses.",
                    bad: answer.kind === "sem-orcamento",
                  },
                ])
              }
              className="btn-neon px-3 py-1.5 text-xs"
            >
              Aceitar {brl(answer.monthly)}
            </button>
            <button onClick={() => close(false, 0, [{ stage: "proposta", text: "Recusou depois da negociação.", bad: false }])} className="btn-ghost px-3 py-1.5 text-xs text-down">
              Recusar
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function Admissao({ run, onDone }: { run: Run; onDone(d: StageDone): void }) {
  const items = ADMISSAO[run.final?.regime ?? "CLT"];
  const [done, setDone] = useState<Set<number>>(new Set());
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">Antes de pedir demissão do emprego atual, confira:</p>
      <div className="panel flex flex-col gap-1.5 p-3 text-[13px]">
        {items.map((it, k) => (
          <label key={it} className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={done.has(k)} onChange={() => setDone((s) => (s.has(k) ? new Set([...s].filter((x) => x !== k)) : new Set(s).add(k)))} />
            {it}
          </label>
        ))}
      </div>
      <button
        disabled={done.size < items.length}
        onClick={() => onDone({ score: 0, max: 0, notes: [] })}
        className="btn-neon self-start px-4 py-2 text-xs disabled:opacity-40"
      >
        Primeiro dia de trabalho ▶
      </button>
    </div>
  );
}

// ───────────────────────── Relatório final ─────────────────────────

function Report({ run, c, onRestart, onOther }: { run: Run; c: Company; onRestart(): void; onOther(): void }) {
  const hired = !!run.final && !run.eliminated;
  const tec = run.scores.tecnica;
  const level = tec ? estimateLevel(tec.score / tec.max) : null;
  const overall = Object.values(run.scores).filter(Boolean);
  const overallFrac = overall.length ? overall.reduce((s, x) => s + x!.score / x!.max, 0) / overall.length : 0;
  const weakJava = run.java.filter((j) => j.pts < 3).map((j) => getQuestion(j.id)!);
  const elimStage = run.eliminated ? STAGES.find((s) => s.id === run.eliminated!.stage)!.title : null;

  return (
    <div className="flex flex-col gap-5">
      <div className={`panel pop-in flex flex-col items-center gap-2 p-6 text-center ${hired ? "border-ok" : "border-down"}`}>
        <Flag size={30} className={hired ? "text-ok" : run.declined ? "text-warn" : "text-down"} />
        <div className={`font-display text-sm glow ${hired ? "text-ok" : run.declined ? "text-warn" : "text-down"}`}>
          {hired ? "Contratado!" : run.declined ? "Você recusou a proposta" : `Eliminado em: ${elimStage}`}
        </div>
        {hired && run.final && (
          <div className="font-mono text-sm">
            {run.final.regime} · {brl(run.final.monthly)}/mês {run.downgraded ? "· vaga de júnior" : ""}
          </div>
        )}
        {run.eliminated && <p className="max-w-lg text-sm text-muted">{run.eliminated.reason}</p>}
      </div>

      <div className="panel flex flex-col gap-2 p-4">
        <div className="hud-label">Seu nível neste processo</div>
        {level ? (
          <>
            <div className={`font-display text-[12px] uppercase glow ${level.level.startsWith("pleno") ? "text-ok" : level.level === "júnior" ? "text-warn" : "text-down"}`}>{level.level}</div>
            <p className="text-sm text-muted">{level.text}</p>
          </>
        ) : (
          <p className="text-sm text-muted">O processo parou antes da entrevista técnica, então não deu para medir o nível técnico.</p>
        )}
        {run.ai.length > 0 && (
          <div className="mt-1 flex flex-col gap-1 text-[13px]">
            <div className="hud-label !text-muted">Respostas faladas avaliadas pela IA</div>
            {run.ai.map((a) => (
              <div key={a.stage + a.question} className="flex justify-between gap-3">
                <span className="text-muted">{a.question}</span>
                <span className="shrink-0 font-semibold">{a.level}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {overall.length > 0 && (
        <div className="panel flex flex-col gap-2 p-4">
          <div className="hud-label">Nota por etapa</div>
          {STAGES.filter((s) => run.scores[s.id]).map((s) => {
            const x = run.scores[s.id]!;
            const f = x.score / x.max;
            return (
              <div key={s.id} className="grid grid-cols-[170px_1fr_6ch] items-center gap-3 text-sm">
                <span>{s.title}</span>
                <span className="h-2 overflow-hidden rounded bg-border">
                  <span className={`block h-full ${f >= (PASS[s.id] ?? 0) ? "bg-ok" : "bg-down"}`} style={{ width: `${f * 100}%` }} />
                </span>
                <span className="font-mono text-xs text-muted">{Math.round(f * 100)}%</span>
              </div>
            );
          })}
          <div className="text-[12px] text-muted">Média: {Math.round(overallFrac * 100)}%.</div>
        </div>
      )}

      {run.notes.length > 0 && (
        <div className="panel flex flex-col gap-1 p-4 text-[13px]">
          <div className="hud-label">O feedback que a empresa não te daria</div>
          {run.notes.map((n, k) => (
            <div key={k} className={n.bad ? "text-warn" : "text-ok"}>
              {n.bad ? "▲ " : "✓ "}
              <span className="text-muted">{STAGES.find((s) => s.id === n.stage)!.short}:</span> {n.text}
            </div>
          ))}
        </div>
      )}

      {weakJava.length > 0 && (
        <div className="panel flex flex-col gap-1 p-4 text-[13px]">
          <div className="hud-label">Perguntas técnicas para treinar</div>
          {weakJava.map((q) => (
            <Link key={q.id} href={`/entrevista/java/pleno/${q.block}`} className="text-accent hover:underline">
              {q.prompt}
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={onRestart} className="btn-neon flex items-center gap-1.5 px-3 py-1.5 text-xs">
          <RotateCcw size={13} /> De novo na {c.name}
        </button>
        <button onClick={onOther} className="btn-ghost px-3 py-1.5 text-xs">
          Outra empresa
        </button>
      </div>
    </div>
  );
}
