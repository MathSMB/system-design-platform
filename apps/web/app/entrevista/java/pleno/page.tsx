import Link from "next/link";
import { Coffee, Timer } from "lucide-react";
import { BLOCKS, questionsOf } from "@sdp/hiring";
import { LessonList } from "@/components/home/LessonList";

export default function JavaPleno() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-accent-2">
        <Coffee size={14} /> Entrevista técnica · Java Pleno
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Explique o mecanismo. <span className="text-accent-2 glow">Não a definição.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        O entrevistador pergunta com contexto de trabalho. Responda falando (o navegador transcreve e a IA diz em que nível sua resposta ficou) ou só
        escolha a alternativa mais próxima da sua: a de pleno, a de livro ou a errada comum. Depois vem o aprofundamento e o que ele queria ouvir.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/entrevista/java/pleno/completa" className="btn-neon flex items-center gap-2 px-4 py-2 text-xs">
          <Timer size={14} /> Entrevista completa · 8 perguntas
        </Link>
      </div>
      <LessonList
        tag="BLOCO"
        tone="accent-2"
        items={BLOCKS.map((b) => ({
          href: `/entrevista/java/pleno/${b.id}`,
          title: b.title,
          summary: b.summary,
          meta: `${questionsOf(b.id).length} perguntas · aparece em ${b.vagas}`,
        }))}
      />
    </main>
  );
}
