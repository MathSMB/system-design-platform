import Link from "next/link";
import { Dices, GraduationCap, PlayCircle } from "lucide-react";
import { CASES } from "@/lib/training/cases";
import { CHALLENGES } from "@/lib/training/challenges";

const LEVEL_COLOR = { básico: "text-ok", intermediário: "text-warn", avançado: "text-accent-2" } as const;

export default function Treinos() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="hud-label">// modo treino</div>
      <h1 className="mt-3 font-display text-xl leading-relaxed text-text">
        Aprenda com o mentor. <span className="text-accent glow">Depois, sem ajuda.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Nos cases guiados o sistema conduz a entrevista no roteiro do Renato Augusto: requisitos, estimativas, desenho incremental,
        gargalos e trade-offs. A cada etapa ele pergunta o que você faria, confere no canvas e explica.
      </p>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 hud-label">
          <GraduationCap size={14} /> Cases guiados
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CASES.map((c, i) => (
            <Link key={c.id} href={`/treinos/${c.id}`} className="panel group flex flex-col gap-2 p-4 transition-shadow hover:border-accent hover:shadow-[0_0_18px_rgba(34,228,255,0.25)]">
              <div className="flex items-center justify-between">
                <span className="font-display text-[10px] text-accent-2">CASE {String(i + 1).padStart(2, "0")}</span>
                <span className={`font-mono text-[10px] uppercase ${LEVEL_COLOR[c.level]}`}>{c.level}</span>
              </div>
              <div className="font-semibold group-hover:text-accent">{c.title}</div>
              <div className="text-sm text-muted">{c.summary}</div>
              <div className="mt-auto flex items-center justify-between pt-1 text-xs text-muted">
                <span>{c.steps.length} etapas</span>
                {c.video && (
                  <span className="flex items-center gap-1">
                    <PlayCircle size={12} /> {c.video.title}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 hud-label">
          <Dices size={14} /> Desafio sorteado
        </h2>
        <Link href="/desafio" className="panel group mt-3 flex flex-wrap items-center justify-between gap-4 p-5 transition-shadow hover:border-accent-2 hover:shadow-[0_0_18px_rgba(255,60,172,0.3)]">
          <div>
            <div className="font-semibold group-hover:text-accent-2">Receba um problema e resolva sem dica</div>
            <div className="mt-1 max-w-xl text-sm text-muted">
              O sistema sorteia um de {CHALLENGES.length} problemas (Black Friday, placar da Copa, feed, ingressos, pagamentos…). Você recebe só o
              enunciado e a carga, monta, simula e entrega. A nota vem em estrelas: erros, latência e folga para pico.
            </div>
          </div>
          <span className="btn-neon px-4 py-2 text-xs">🎲 Sortear</span>
        </Link>
      </section>
    </main>
  );
}
