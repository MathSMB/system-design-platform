"use client";

import type { AnswerEvaluation, SessionFeedback } from "@sdp/ai";
import { History as HistoryIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AnswerFeedback, LEVEL_COLOR, SessionFeedbackView } from "@/components/answer/VoiceAnswer";
import { profileTitle, type ProfileRow } from "@/components/conta/Account";

interface Item {
  id: string;
  kind: string;
  title: string;
  outcome: string | null;
  levelShown: string | null;
  score: number | null;
  level: string;
  feedback: SessionFeedback | null;
  profileId: string | null;
  createdAt: string;
}

/** Respostas guardadas: processo seletivo (convs) ou treino (results). */
function answersOf(state: any): { question: string; evals: AnswerEvaluation[] }[] {
  const convs = state?.convs ?? state?.results?.map((r: any) => ({ r: r.conv })) ?? [];
  return convs.map((c: any) => ({ question: c.title ?? c.r?.question ?? "", evals: c.r?.evals ?? [] })).filter((x: any) => x.evals.length);
}

const TARGET: Record<string, string> = { junior: "júnior", pleno: "pleno", senior: "sênior" };

export function History() {
  const [data, setData] = useState<{ db: boolean; items: Item[]; profiles?: ProfileRow[]; signedIn?: boolean } | null>(null);
  const [filter, setFilter] = useState<string>("todos");
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Record<string, any>>({});

  useEffect(() => {
    fetch("/api/historico")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ db: false, items: [] }));
  }, []);

  async function toggle(id: string) {
    setOpen(open === id ? null : id);
    if (!detail[id]) {
      const r = await fetch(`/api/historico/${id}`).catch(() => null);
      const body = r?.ok ? await r.json() : null;
      setDetail((d) => ({ ...d, [id]: body }));
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-bad">
        <HistoryIcon size={14} /> Histórico
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Suas <span className="text-bad glow">entrevistas.</span>
      </h1>
      <p className="mt-3 text-muted">Cada processo seletivo e treino terminado fica guardado aqui, com o feedback geral e o de cada resposta.</p>

      {data && !data.db && (
        <div className="panel mt-6 p-4 text-sm text-muted">
          O banco de dados não está configurado. Coloque a <code className="text-text">DATABASE_URL</code> do Neon no arquivo <code className="text-text">apps/web/.env.local</code>, rode{" "}
          <code className="text-text">pnpm --filter web db:push</code> e reinicie o <code className="text-text">pnpm dev</code>.
        </div>
      )}
      {data?.db && !data.signedIn && (
        <p className="mt-4 text-[12px] text-muted">
          Mostrando as entrevistas feitas sem conta. <a href="/conta" className="underline hover:text-ok">Entre</a> para ver as do seu perfil.
        </p>
      )}
      {!!data?.profiles?.length && (
        <div className="mt-5 flex flex-wrap gap-2 text-xs">
          {[{ id: "todos", label: "Todos os perfis" }, ...data.profiles.map((p) => ({ id: p.id, label: profileTitle(p) }))].map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={`btn-ghost px-3 py-1 ${filter === f.id ? "border-accent text-accent" : ""}`}>
              {f.label}
            </button>
          ))}
        </div>
      )}
      {data?.db && data.items.length === 0 && <p className="mt-6 text-sm text-muted">Nenhuma entrevista terminada ainda.</p>}

      <div className="mt-6 flex flex-col gap-2">
        {data?.items.filter((it) => filter === "todos" || it.profileId === filter).map((it) => (
          <div key={it.id} className="panel p-3 text-[13px]">
            <button onClick={() => toggle(it.id)} className="flex w-full items-start justify-between gap-3 text-left">
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{it.title}</span>
                <span className="text-muted">
                  {new Date(it.createdAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {it.kind === "treino" ? "treino" : "processo seletivo"}
                  {it.outcome ? ` · ${it.outcome}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-right">
                {it.levelShown && <span className={`block font-semibold ${LEVEL_COLOR[it.levelShown] ?? ""}`}>{it.levelShown}</span>}
                {it.score != null && <span className="font-mono text-xs text-muted">{it.score}/10</span>}
              </span>
            </button>
            {open === it.id && (
              <div className="mt-3 flex flex-col gap-3">
                {it.feedback ? <SessionFeedbackView f={it.feedback} target={TARGET[it.level] ?? it.level} /> : <p className="text-muted">Sem feedback geral salvo.</p>}
                {detail[it.id] === undefined && <p className="text-muted">Carregando respostas…</p>}
                {detail[it.id] &&
                  answersOf(detail[it.id].state).map((a, k) => (
                    <details key={k} className="panel p-2.5">
                      <summary className="cursor-pointer">{a.question}</summary>
                      <div className="mt-2 flex flex-col gap-2">
                        {a.evals.map((e, j) => (
                          <AnswerFeedback key={j} e={e} target={TARGET[it.level] ?? it.level} />
                        ))}
                      </div>
                    </details>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
