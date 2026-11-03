"use client";

import type { SessionFeedback } from "@sdp/ai";
import {
  ADMISSAO,
  BEHAVIORAL,
  COMPANIES,
  DOWNLEVEL,
  GHOSTING,
  MARKET,
  PASS,
  SOFT_WARMUP,
  STAGES,
  TAKEHOME,
  cltVsPj,
  counterOffer,
  drawInterview,
  getCompany,
  getQuestion,
  makeOffer,
  reviewFor,
  rhQuestions,
  rng,
  screenApplication,
  type Company,
  type CompanyId,
  type Offer,
  type Regime,
  type StageId,
} from "@sdp/hiring";
import { Briefcase, Building2, CheckCircle2, CircleX, Flag, RotateCcw, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AiConversation, SessionFeedbackPanel, answersOf, levelOf, type ConvResult } from "@/components/answer/AiConversation";
import { Bubble } from "@/components/answer/Chat";
import { AnswerFeedback, LEVEL_COLOR } from "@/components/answer/VoiceAnswer";
import { javaCtx } from "@/components/java/JavaQuestionView";
import { RACE_INTERVIEWS } from "@/lib/concurrency/interviews";
import { ConvSequence, fromReview, fromStep, type ConvItem } from "./parts";

// ───────────────────────── Estado ─────────────────────────

interface Note {
  stage: StageId;
  text: string;
  bad: boolean;
}

/** Uma conversa da etapa, guardada para o feedback do fim da etapa e o relatório. */
interface StageConv {
  stage: StageId;
  title?: string;
  r: ConvResult;
  /** Evento do processo (ligação do RH, sumiço): aparece no feedback mas não entra na nota. */
  unscored?: boolean;
}

interface Run {
  v: 2;
  company: CompanyId;
  seed: number;
  stage: StageId | "fim";
  scores: Partial<Record<StageId, { score: number; max: number }>>;
  notes: Note[];
  /** Primeira etapa em que você seria eliminado num processo real. */
  eliminated?: { stage: StageId; reason: string };
  /** Todas as etapas em que você reprovou (no treino, você segue mesmo assim). */
  failed: StageId[];
  declined?: boolean;
  askedLow: boolean;
  downgraded: boolean;
  java: { id: string; score: number }[];
  convs: StageConv[];
  offer?: Offer;
  final?: { monthly: number; regime: Regime };
  general?: SessionFeedback;
}

/** O que uma etapa devolve quando termina. */
interface StageDone {
  score: number;
  max: number;
  notes: Note[];
  convs: StageConv[];
  /** Eliminado por um motivo que não é a nota (filtro, evento). */
  eliminated?: string;
  patch?: Partial<Run>;
}

const KEY = "processo-seletivo:v2";
const load = (): Run | null => {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return r?.v === 2 && getCompany(r.company) ? r : null;
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
const newRun = (company: CompanyId): Run => ({ v: 2, company, seed: Math.floor(Math.random() * 1e9), stage: "triagem", scores: {}, notes: [], failed: [], askedLow: false, downgraded: false, java: [], convs: [] });

const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

/** Nota da etapa: soma das notas da IA (0 a 10) das conversas avaliadas. */
function scoreOf(convs: StageConv[]) {
  const rated = convs.filter((c) => !c.unscored && !c.r.skipped);
  return { score: Math.round(rated.reduce((s, c) => s + c.r.score, 0) * 10) / 10, max: rated.length * 10 };
}

/** Texto da vaga para a IA ligar o feedback à vaga. */
const jobText = (c: Company) =>
  `${c.jobAd.title} na ${c.name} (${c.kind}, ${c.city}, ${c.model}). ${c.jobAd.about} Requisitos: ${c.jobAd.must.join(", ")}. Diferenciais: ${c.jobAd.nice.join(", ")}. Faixa salarial CLT da vaga (o candidato não sabe): ${brl(c.band[0])} a ${brl(c.band[1])}.`;

/** Eventos sorteados pela semente: a mesma corrida sempre tem os mesmos. */
function eventsOf(seed: number) {
  const r = rng(seed ^ 0x5eed);
  return { downlevel: r() < 0.5, ghost: r() < 0.4, otherProfile: r() < 0.5 };
}

/** Só a referência e os sinais de alerta de uma pergunta com alternativas. */
const aiRef = (step: Parameters<typeof fromStep>[0]) => {
  const { reference, avoid } = fromStep(step);
  return { reference, avoid };
};

const stageTitle = (s: StageId) => STAGES.find((x) => x.id === s)!.title;

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
  if (!run) return <CompanyPicker onPick={(id) => setRun(newRun(id))} />;

  const c = getCompany(run.company)!;

  function finishStage(d: StageDone) {
    setPending(d);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function advance() {
    if (!run || !pending || run.stage === "fim") return;
    const stage = run.stage;
    const reason = failReason(stage, pending);
    const idx = STAGES.findIndex((s) => s.id === stage);
    const next: Run = {
      ...run,
      ...pending.patch,
      scores: pending.max ? { ...run.scores, [stage]: { score: pending.score, max: pending.max } } : run.scores,
      notes: [...run.notes, ...pending.notes],
      convs: [...run.convs, ...pending.convs],
      failed: reason ? [...run.failed, stage] : run.failed,
      eliminated: run.eliminated ?? (reason ? { stage, reason } : undefined),
      // modo treino: mesmo reprovando, segue para a próxima etapa
      stage: pending.patch?.declined || idx === STAGES.length - 1 ? "fim" : STAGES[idx + 1]!.id,
    };
    setRun(next);
    setPending(null);
    window.scrollTo({ top: 0 });
  }

  const restart = (same: boolean) => {
    setPending(null);
    setRun(same ? newRun(run.company) : null);
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
      {run.eliminated && run.stage !== "fim" && (
        <p className="mt-3 text-[12px] text-warn">
          Modo treino: num processo real você teria parado em {stageTitle(run.eliminated.stage)}. Você segue treinando as próximas etapas.
        </p>
      )}

      <div className="mt-6">
        {run.stage === "fim" ? (
          <Report run={run} c={c} onGeneral={(general) => setRun((r) => r && { ...r, general })} onRestart={() => restart(true)} onOther={() => restart(false)} />
        ) : pending ? (
          <StageResult stage={run.stage} d={pending} onNext={advance} />
        ) : (
          <StageView key={`${run.stage}-${run.seed}`} run={run} c={c} onDone={finishStage} />
        )}
      </div>
    </div>
  );
}

/** Motivo de reprovação na etapa, ou undefined se passou. */
function failReason(stage: StageId, d: StageDone): string | undefined {
  if (d.eliminated) return d.eliminated;
  const pass = PASS[stage];
  if (pass === undefined || !d.max) return undefined;
  const frac = d.score / d.max;
  return frac < pass ? `Nota abaixo do corte da etapa (${Math.round(frac * 100)}% de ${Math.round(pass * 100)}%).` : undefined;
}

function Stepper({ run }: { run: Run }) {
  const at = run.stage === "fim" ? STAGES.length : STAGES.findIndex((s) => s.id === run.stage);
  return (
    <ol className="mt-4 grid grid-cols-7 gap-1">
      {STAGES.map((s, k) => {
        const state = run.failed.includes(s.id) ? "out" : k < at ? "done" : k === at ? "now" : "todo";
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
        gestor, proposta e admissão. Cada etapa é uma conversa com a IA no papel de quem entrevista: você responde falando ou digitando, ela reage e
        aprofunda. No fim de cada etapa vem o feedback de cada resposta e, no fim do processo, um feedback geral.
      </p>
      <p className="mt-2 text-[12px] text-muted">
        Modo treino: se reprovar numa etapa, você vê onde teria parado e segue para a próxima. Empresas fictícias, montadas a partir de relatos reais
        de processos (Glassdoor) e das vagas Java do seu guia de estudo. Faixas salariais pesquisadas em {MARKET.updated}.
      </p>
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
  return (
    <div className="mb-4">
      <h2 className="font-display text-sm leading-relaxed text-accent glow">{stageTitle(stage)}</h2>
      {stage !== "admissao" && (
        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
          <UserRound size={12} /> {c.who[stage]}
        </div>
      )}
    </div>
  );
}

function StageView({ run, c, onDone }: { run: Run; c: Company; onDone(d: StageDone): void }) {
  const stage = run.stage as StageId;
  return (
    <div>
      <StageHeader c={c} stage={stage} />
      {stage === "triagem" && <Triagem c={c} onDone={onDone} />}
      {stage === "rh" && <Rh c={c} onDone={onDone} />}
      {stage === "teste" && <Teste c={c} onDone={onDone} />}
      {stage === "tecnica" && <Tecnica run={run} c={c} onDone={onDone} />}
      {stage === "gestor" && <Gestor run={run} c={c} onDone={onDone} />}
      {stage === "proposta" && <Proposta run={run} c={c} onDone={onDone} />}
      {stage === "admissao" && <Admissao run={run} onDone={onDone} />}
    </div>
  );
}

function StageResult({ stage, d, onNext }: { stage: StageId; d: StageDone; onNext(): void }) {
  const reason = failReason(stage, d);
  const failed = !!reason;
  const pass = PASS[stage];
  const last = stage === STAGES[STAGES.length - 1]!.id || !!d.patch?.declined;
  return (
    <div className="flex flex-col gap-3">
      <div className={`panel pop-in flex flex-col items-center gap-2 p-5 text-center ${failed ? "border-down" : "border-ok"}`}>
        {failed ? <CircleX size={30} className="text-down" /> : <CheckCircle2 size={30} className="text-ok" />}
        <div className={`font-display text-[12px] glow ${failed ? "text-down" : "text-ok"}`}>{failed ? "Reprovado nesta etapa" : `${stageTitle(stage)}: aprovado`}</div>
        {d.max > 0 && (
          <div className="font-mono text-sm text-muted">
            nota {((d.score / d.max) * 10).toFixed(1)}/10 {pass !== undefined && `· corte ${(pass * 10).toFixed(0)}`}
          </div>
        )}
        {reason && <p className="max-w-md text-sm">{reason}</p>}
        {failed && !last && <p className="max-w-md text-[12px] text-muted">Num processo real, você seria eliminado aqui. No treino, você segue para a próxima etapa.</p>}
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
      {d.convs.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="hud-label">Feedback de cada resposta</div>
          {d.convs.map((cv) => (
            <div key={cv.r.question} className="flex flex-col gap-2">
              <div className="text-[13px] font-semibold">{cv.title ?? cv.r.question}</div>
              {cv.r.skipped && <p className="text-[12px] text-muted">Pulada sem avaliação.</p>}
              {cv.r.evals.map((e, k) => (
                <AnswerFeedback key={k} e={e} target="pleno" title={cv.r.evals.length > 1 ? (k === 0 ? "Resposta principal" : "Aprofundamento") : undefined} />
              ))}
            </div>
          ))}
        </div>
      )}
      <button onClick={onNext} className="btn-neon self-start px-4 py-2 text-xs">
        {last ? "Ver o relatório final ▶" : failed ? "Seguir treinando: próxima etapa ▶" : "Próxima etapa ▶"}
      </button>
    </div>
  );
}

// ───────────────────────── Etapas ─────────────────────────

function Triagem({ c, onDone }: { c: Company; onDone(d: StageDone): void }) {
  const [years, setYears] = useState("");
  const [salary, setSalary] = useState("");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [techs, setTechs] = useState("");
  const ready = years !== "" && Number(salary) > 0 && available !== null && techs.trim().length > 2;

  function submit() {
    const s = screenApplication(c, { years: Number(years), salary: Number(salary), available: !!available, techs });
    onDone({
      score: 0,
      max: 0,
      convs: [],
      notes: s.notes.map((n) => ({ stage: "triagem", ...n })),
      eliminated: s.knockout ? `Filtro automático da vaga: ${s.knockout}` : undefined,
      patch: { askedLow: s.askedLow },
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
      <p className="text-[12px] text-muted">Formulário de candidatura. O sistema aplica filtros automáticos antes de uma pessoa ler o currículo.</p>
      <div className="panel flex flex-col gap-3 p-4 text-[13px]">
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Há quantos anos você trabalha com Java?</span>
          <input type="number" min={0} max={40} value={years} onChange={(e) => setYears(e.target.value)} className="w-28" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Pretensão salarial mensal (CLT, bruto)</span>
          <span className="flex items-center gap-2">
            R$ <input type="number" min={0} step={100} value={salary} onChange={(e) => setSalary(e.target.value)} className="w-36" />
          </span>
        </label>
        <div className="flex flex-col gap-1">
          <span className="font-semibold">O trabalho é: {c.model}. Você tem disponibilidade?</span>
          <div className="flex gap-2">
            {[true, false].map((v) => (
              <button key={String(v)} onClick={() => setAvailable(v)} className={`btn-ghost px-3 py-1 text-xs ${available === v ? "border-accent text-accent" : ""}`}>
                {v ? "Sim" : "Não"}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-semibold">Quais tecnologias você já usou em projeto real?</span>
          <textarea rows={2} value={techs} onChange={(e) => setTechs(e.target.value)} placeholder="Ex.: Java 17, Spring Boot, JPA, PostgreSQL, Kafka, JUnit, Docker" />
        </label>
      </div>
      <button disabled={!ready} onClick={submit} className="btn-neon self-start px-4 py-2 text-xs disabled:opacity-40">
        Enviar candidatura
      </button>
    </div>
  );
}

/** Etapa feita só de perguntas em conversa. */
function ConvStage({ stage, c, who, label, items, hint, onDone }: { stage: StageId; c: Company; who: string; label: string; items: ConvItem[]; hint?: string; onDone(d: StageDone): void }) {
  return (
    <ConvSequence
      items={items}
      who={who}
      hint={hint}
      ctx={{ stage: label, target: "pleno", job: jobText(c), interviewer: who }}
      onFinish={(rs) => {
        const convs = rs.map((r) => ({ stage, r }));
        onDone({ ...scoreOf(convs), notes: [], convs });
      }}
    />
  );
}

function Rh({ c, onDone }: { c: Company; onDone(d: StageDone): void }) {
  const items = useMemo(() => rhQuestions(c).map(fromStep), [c]);
  return <ConvStage stage="rh" c={c} who={c.who.rh} label="Conversa com o RH" items={items} hint="Videochamada de 30 minutos. O recrutador anota tudo; o feedback de cada resposta aparece no fim da etapa." onDone={onDone} />;
}

function Teste({ c, onDone }: { c: Company; onDone(d: StageDone): void }) {
  const [delivered, setDelivered] = useState(false);
  const review = useMemo(() => [fromReview(reviewFor(c))], [c]);
  const defense = useMemo(() => TAKEHOME.defense.map(fromStep), []);

  if (c.testFormat === "revisao")
    return <ConvStage stage="teste" c={c} who={c.who.teste} label="Teste técnico · revisão de código" items={review} hint="Revisão ao vivo: leia o código e comente como num pull request. Pode citar os números das linhas." onDone={onDone} />;

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
        <ConvStage stage="teste" c={c} who={c.who.tecnica} label="Teste técnico · defesa do desafio" items={defense} hint="O tech lead abriu seu repositório e quer entender as decisões." onDone={onDone} />
      )}
    </div>
  );
}

function Tecnica({ run, c, onDone }: { run: Run; c: Company; onDone(d: StageDone): void }) {
  const questions = useMemo(() => drawInterview(run.seed, 6), [run.seed]);
  const items = useMemo(() => {
    const warm = c.softWarmup ? SOFT_WARMUP.map(fromStep) : [];
    const java = questions.map((q): ConvItem => {
      const x = javaCtx(q, "", jobText(c));
      return { q: q.prompt, code: q.code, expected: x.expected, reference: x.reference, avoid: x.avoid };
    });
    const race = RACE_INTERVIEWS[run.seed % RACE_INTERVIEWS.length]!;
    const right = (rq: typeof race.diagnose) => rq.choices.filter((ch) => ch.correct).map((ch) => ch.text);
    const raceItem: ConvItem[] = c.raceQuestion
      ? [
          {
            q: `Para fechar, um bug de produção: ${race.report.replace(/^"|"$/g, "")} ${race.diagnose.q}`,
            expected: [...right(race.diagnose).map((t) => `Diagnóstico: ${t}`), ...right(race.fix).map((t) => `Correção: ${t}`)],
            avoid: [...race.diagnose.choices, ...race.fix.choices].filter((ch) => !ch.correct).map((ch) => `${ch.text} (${ch.why})`),
            reference: `Pergunta de correção que o entrevistador pode fazer em seguida: ${race.fix.q}`,
          },
        ]
      : [];
    return { all: [...warm, ...java, ...raceItem], javaFrom: warm.length };
  }, [c, questions, run.seed]);
  const [convs, setConvs] = useState<StageConv[] | null>(null);
  const [downlevel, setDownlevel] = useState<ConvResult | null>(null);

  const sc = convs ? scoreOf(convs) : { score: 0, max: 0 };
  const frac = sc.max ? sc.score / sc.max : 0;
  // relato real: com nota média, a empresa oferece júnior em vez de pleno
  const offerJunior = !!convs && frac >= 0.6 && frac < 0.75 && eventsOf(run.seed).downlevel;

  function finish(all: StageConv[], dl?: ConvResult) {
    const s = scoreOf(all);
    const notes: Note[] = [];
    let downgraded = false;
    const extra: StageConv[] = [];
    if (dl) {
      const ok = !dl.skipped && dl.score >= 6;
      notes.push({ stage: "tecnica", text: ok ? "Na ligação sobre júnior, pediu feedback e negociou seguir como pleno com plano de revisão." : "Na ligação sobre júnior, não negociou: segue como júnior.", bad: !ok });
      downgraded = !ok;
      extra.push({ stage: "tecnica", title: "Ligação do RH: oferta de júnior", r: dl, unscored: true });
    }
    const java = all.slice(items.javaFrom, items.javaFrom + questions.length).map((cv, k) => ({ id: questions[k]!.id, score: cv.r.skipped ? 0 : cv.r.score }));
    onDone({ ...s, notes, convs: [...all, ...extra], patch: { java, downgraded } });
  }

  if (!convs)
    return (
      <ConvSequence
        items={items.all}
        who={c.who.tecnica}
        hint={c.softWarmup ? "Como no relato do banco digital: começa com soft skills, depois Java e Spring." : "Perguntas de Java e Spring com contexto de trabalho. Explique o mecanismo, não a definição."}
        ctx={{ stage: "Entrevista técnica · Java Pleno", target: "pleno", job: jobText(c), interviewer: c.who.tecnica }}
        onFinish={(rs) => {
          const all = rs.map((r) => ({ stage: "tecnica" as const, r }));
          const s = scoreOf(all);
          const f = s.max ? s.score / s.max : 0;
          if (f >= 0.6 && f < 0.75 && eventsOf(run.seed).downlevel) setConvs(all);
          else finish(all);
        }}
      />
    );

  if (!offerJunior) return null;
  return (
    (
      <div className="flex flex-col gap-3">
        <p className="text-[12px] text-muted">Dois dias depois, a recrutadora liga:</p>
        {!downlevel ? (
          <AiConversation
            question={DOWNLEVEL.q}
            who={c.who.rh}
            ctx={{ stage: "Ligação do RH depois da técnica", target: "pleno", job: jobText(c), interviewer: c.who.rh, ...aiRef(DOWNLEVEL) }}
            maxFollowUps={0}
            nextLabel="Encerrar a etapa ▶"
            onDone={(r) => {
              setDownlevel(r);
              finish(convs, r);
            }}
          />
        ) : null}
      </div>
    )
  );
}

function Gestor({ run, c, onDone }: { run: Run; c: Company; onDone(d: StageDone): void }) {
  const ev = eventsOf(run.seed);
  const [ghost, setGhost] = useState<ConvResult | null>(null);
  const items = useMemo(() => BEHAVIORAL.map(fromStep), []);
  const needGhost = ev.ghost && !ghost;

  function finish(rs: ConvResult[]) {
    const convs: StageConv[] = rs.map((r) => ({ stage: "gestor", r }));
    const s = scoreOf(convs);
    const frac = s.max ? s.score / s.max : 0;
    const notes: Note[] = [];
    if (ghost) {
      convs.unshift({ stage: "gestor", title: "Uma semana sem resposta", r: ghost, unscored: true });
      const ok = !ghost.skipped && ghost.score >= 6;
      notes.push({ stage: "gestor", text: ok ? "Fez um follow-up adequado quando o processo parou." : "A reação ao processo parado não ajudou (esperar sem sinal ou cobrar fora do canal).", bad: !ok });
    }
    // relato real: "o gestor preferiu seguir com outro perfil", mesmo com técnica boa
    const other = frac >= 0.6 && frac < 0.75 && ev.otherProfile;
    onDone({
      ...s,
      notes,
      convs,
      eliminated: other ? "\"O gestor preferiu seguir com outro perfil no momento.\" O motivo real: as respostas comportamentais ficaram genéricas, sem situação e resultado concretos, e outro candidato mostrou isso melhor." : undefined,
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {needGhost ? (
        <AiConversation
          question={GHOSTING.q}
          who="Situação"
          ctx={{ stage: "Processo parado depois da técnica", target: "pleno", job: jobText(c), interviewer: "narrador da simulação; responda como o candidato reagiria", ...aiRef(GHOSTING) }}
          maxFollowUps={0}
          nextLabel="Seguir ▶"
          onDone={setGhost}
        />
      ) : (
        <>
          {ghost && <Bubble who={c.who.rh}>Oi! Desculpe a demora, estava fechando outras vagas. Agendei sua conversa com o gestor para amanhã.</Bubble>}
          <ConvSequence
            items={items}
            who={c.who.gestor}
            hint="Conversa de 45 minutos sobre como você trabalha. Responda com casos reais no formato STAR."
            ctx={{ stage: "Entrevista com o gestor (comportamental)", target: "pleno", job: jobText(c), interviewer: c.who.gestor }}
            onFinish={finish}
          />
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
      convs: [],
      notes: extra,
      patch: accepted ? { offer: { regime, monthly: current }, final: { monthly, regime } } : { offer: { regime, monthly: current }, declined: true },
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {run.eliminated && (
        <p className="text-[12px] text-warn">Num processo real você teria parado antes desta etapa. Aqui você treina a negociação mesmo assim, com uma proposta como se tivesse passado.</p>
      )}
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
        <div className="text-[12px] text-muted">Faixa da vaga (CLT): {brl(c.band[0])} a {brl(c.band[1])}.</div>
        <details className="text-[12px] text-muted">
          <summary className="cursor-pointer">Referência de mercado para Java Pleno ({MARKET.updated})</summary>
          <ul className="mt-1 list-disc pl-4">
            {MARKET.sources.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noopener" className="text-accent underline">
                  {s.label}
                </a>
                : {s.value}
              </li>
            ))}
          </ul>
        </details>
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
          {run.eliminated && (
        <p className="text-[12px] text-warn">Num processo real você teria parado antes desta etapa. Aqui você treina a negociação mesmo assim, com uma proposta como se tivesse passado.</p>
      )}
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
        onClick={() => onDone({ score: 0, max: 0, notes: [], convs: [] })}
        className="btn-neon self-start px-4 py-2 text-xs disabled:opacity-40"
      >
        Primeiro dia de trabalho ▶
      </button>
    </div>
  );
}


// ───────────────────────── Relatório final ─────────────────────────

function Report({ run, c, onGeneral, onRestart, onOther }: { run: Run; c: Company; onGeneral(f: SessionFeedback): void; onRestart(): void; onOther(): void }) {
  const hired = !!run.final && !run.eliminated;
  const rated = run.convs.filter((x) => !x.unscored && !x.r.skipped);
  const tech = rated.filter((x) => x.stage === "tecnica" || x.stage === "teste");
  const level = levelOf((tech.length ? tech : rated).map((x) => x.r.level));
  const overall = STAGES.filter((s) => run.scores[s.id]);
  const weakJava = run.java.filter((j) => j.score < 6).map((j) => getQuestion(j.id)!);
  const elimStage = run.eliminated ? stageTitle(run.eliminated.stage) : null;
  const outcome = hired
    ? `Contratado: ${run.final!.regime} ${brl(run.final!.monthly)}/mês${run.downgraded ? " (como júnior)" : ""}.`
    : run.declined
      ? "Recusou a proposta."
      : elimStage
        ? `Num processo real, seria eliminado em ${elimStage} (${run.eliminated!.reason}). Reprovou em: ${run.failed.map(stageTitle).join(", ")}.`
        : "Processo concluído.";

  return (
    <div className="flex flex-col gap-5">
      <div className={`panel pop-in flex flex-col items-center gap-2 p-6 text-center ${hired ? "border-ok" : "border-down"}`}>
        <Flag size={30} className={hired ? "text-ok" : run.declined ? "text-warn" : "text-down"} />
        <div className={`font-display text-sm glow ${hired ? "text-ok" : run.declined ? "text-warn" : "text-down"}`}>
          {hired ? "Contratado!" : run.declined ? "Você recusou a proposta" : `Num processo real: eliminado em ${elimStage}`}
        </div>
        {run.final && (
          <div className="font-mono text-sm">
            {run.final.regime} · {brl(run.final.monthly)}/mês {run.downgraded ? "· vaga de júnior" : ""} {run.eliminated ? "(no treino)" : ""}
          </div>
        )}
        {run.eliminated && <p className="max-w-lg text-sm text-muted">{run.eliminated.reason}</p>}
        {run.failed.length > 0 && <p className="max-w-lg text-[12px] text-muted">Você seguiu treinando e passou por todas as etapas. Reprovou em: {run.failed.map(stageTitle).join(", ")}.</p>}
        {rated.length > 0 && (
          <div className="mt-1 text-sm">
            Nível mostrado: <b className={LEVEL_COLOR[level]}>{level}</b>
          </div>
        )}
      </div>

      <SessionFeedbackPanel
        cached={run.general}
        onReady={onGeneral}
        input={{
          title: `Processo seletivo completo · ${c.name} · Java Pleno`,
          target: "pleno",
          job: jobText(c),
          outcome,
          eliminatedAt: elimStage ?? undefined,
          stages: STAGES.map((s) => {
            const sc = run.scores[s.id];
            return {
              stage: s.title,
              result: sc ? `${((sc.score / sc.max) * 10).toFixed(1)}/10${run.failed.includes(s.id) ? ", reprovado" : ""}` : run.failed.includes(s.id) ? "reprovado" : undefined,
              items: run.convs
                .filter((x) => x.stage === s.id && !x.r.skipped)
                .map((x) => ({ question: x.title ? `${x.title}: ${x.r.question}` : x.r.question, answer: answersOf(x.r), level: x.r.level, score: x.r.score, gaps: x.r.evals.flatMap((e) => e.gaps).slice(0, 4) })),
            };
          }).filter((s) => s.items.length),
        }}
      />

      {overall.length > 0 && (
        <div className="panel flex flex-col gap-2 p-4">
          <div className="hud-label">Nota por etapa</div>
          {overall.map((s) => {
            const x = run.scores[s.id]!;
            const f = x.score / x.max;
            return (
              <div key={s.id} className="grid grid-cols-[170px_1fr_6ch] items-center gap-3 text-sm">
                <span>{s.title}</span>
                <span className="h-2 overflow-hidden rounded bg-border">
                  <span className={`block h-full ${f >= (PASS[s.id] ?? 0) ? "bg-ok" : "bg-down"}`} style={{ width: `${f * 100}%` }} />
                </span>
                <span className="font-mono text-xs text-muted">{(f * 10).toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      )}

      {run.notes.length > 0 && (
        <div className="panel flex flex-col gap-1 p-4 text-[13px]">
          <div className="hud-label">O que ficou anotado sobre você</div>
          {run.notes.map((n, k) => (
            <div key={k} className={n.bad ? "text-warn" : "text-ok"}>
              {n.bad ? "▲ " : "✓ "}
              <span className="text-muted">{STAGES.find((s) => s.id === n.stage)!.short}:</span> {n.text}
            </div>
          ))}
        </div>
      )}

      {run.convs.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="hud-label">Todas as respostas · clique para rever o feedback</div>
          {run.convs.map((x, k) => (
            <details key={k} className="panel p-2.5 text-[13px]">
              <summary className="flex cursor-pointer items-start justify-between gap-3">
                <span>
                  <span className="text-muted">{STAGES.find((s) => s.id === x.stage)!.short}:</span> {x.title ?? x.r.question}
                </span>
                <span className={`shrink-0 font-mono text-xs ${x.r.skipped ? "text-muted" : x.r.score >= 7 ? "text-ok" : x.r.score >= 5 ? "text-warn" : "text-down"}`}>
                  {x.r.skipped ? "pulada" : `${x.r.score}/10`}
                </span>
              </summary>
              <div className="mt-2 flex flex-col gap-2">
                {x.r.evals.map((e, j) => (
                  <AnswerFeedback key={j} e={e} target="pleno" />
                ))}
              </div>
            </details>
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
