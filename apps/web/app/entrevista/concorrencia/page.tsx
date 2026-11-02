import { Database } from "lucide-react";
import { LessonList } from "@/components/home/LessonList";
import { RandomButton } from "@/components/home/Random";
import { RACE_INTERVIEWS } from "@/lib/concurrency/interviews";

export default function EntrevistaRace() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-accent-2">
        <Database size={14} /> Entrevista técnica · Concorrência e dados
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Um bug em produção. <span className="text-accent-2 glow">Explique e corrija.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        O entrevistador conta o que aconteceu. Você pode reproduzir no laboratório, diz qual é a corrida, escolhe a correção e prova testando todas as
        ordens possíveis.
      </p>
      <div className="mt-6">
        <RandomButton hrefs={RACE_INTERVIEWS.map((c) => `/entrevista/concorrencia/${c.id}`)} label="Sortear um bug" />
      </div>
      <LessonList
        tag="BUG"
        tone="accent-2"
        items={RACE_INTERVIEWS.map((c) => ({ href: `/entrevista/concorrencia/${c.id}`, title: c.title, summary: c.report.replace(/^"|"$/g, "") }))}
      />
    </main>
  );
}
