import { Database } from "lucide-react";
import { LessonList } from "@/components/home/LessonList";
import { RACE_LESSONS } from "@/lib/concurrency/lessons";

export default function EstudoRace() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-accent-2">
        <Database size={14} /> Estudo · Concorrência e dados
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Duas requisições. <span className="text-accent-2 glow">Um dado errado.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Você avança cada transação um passo por vez, como o banco executa. O mentor narra o que acontece, pergunta o que vem antes do clique importante e,
        no fim, testa todas as ordens possíveis. Comece pela primeira: as aulas de lock pessimista e otimista partem dela.
      </p>
      <LessonList
        tag="AULA"
        tone="accent-2"
        items={RACE_LESSONS.map((l) => ({
          href: `/estudo/concorrencia/${l.id}`,
          title: l.title,
          summary: l.summary,
          level: l.level,
          meta: l.parts.length > 1 ? "problema + correção" : "1 parte",
        }))}
      />
    </main>
  );
}
