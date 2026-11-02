import { Network } from "lucide-react";
import { LessonList } from "@/components/home/LessonList";
import { RandomButton } from "@/components/home/Random";
import { CHALLENGES } from "@/lib/training/challenges";

const fmt = (x: number) => x.toLocaleString("pt-BR");

export default function EntrevistaSD() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-accent-2">
        <Network size={14} /> Entrevista técnica · System Design
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Sem mentor. <span className="text-accent-2 glow">Só o entrevistador.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Você recebe o enunciado curto, faz as perguntas de requisito, estima o pico, desenha e simula até cumprir o SLO, e responde o aprofundamento. As
        respostas só são comentadas no fim, com a nota.
      </p>
      <div className="mt-6">
        <RandomButton hrefs={CHALLENGES.map((c) => `/entrevista/system-design/${c.id}`)} label="Sortear uma entrevista" />
      </div>
      <LessonList
        tag="PROBLEMA"
        tone="accent-2"
        items={CHALLENGES.map((c) => ({
          href: `/entrevista/system-design/${c.id}`,
          title: c.title,
          summary: c.brief,
          meta: `${fmt(c.load.dailyActiveUsers)} usuários/dia · p99 ≤ ${fmt(c.slo.p99Ms)} ms`,
        }))}
      />
    </main>
  );
}
