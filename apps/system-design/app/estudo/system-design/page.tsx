import { Network } from "lucide-react";
import { LessonList } from "@sdp/ui";
import { CASES } from "@/lib/training/cases";

export default function EstudoSD() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label">
        <Network size={14} /> Estudo · System Design
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Aprenda com o mentor. <span className="text-accent glow">Depois, sem ajuda.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        Cada aula começa com uma história e um sistema que já está quebrando. O mentor pergunta o que você faria, confere no canvas e explica no nível de
        entrevista. No fim: como falar na entrevista, tecnologias usadas hoje e o que estudar. O roteiro segue o método do Renato Augusto (requisitos,
        estimativas, desenho incremental, gargalos e trade-offs).
      </p>
      <LessonList
        tag="AULA"
        items={CASES.map((c) => ({
          href: `/estudo/system-design/${c.id}`,
          title: c.title,
          summary: c.summary,
          level: c.level,
          meta: `${c.steps.length} etapas`,
          video: c.video?.title,
        }))}
      />
    </main>
  );
}
