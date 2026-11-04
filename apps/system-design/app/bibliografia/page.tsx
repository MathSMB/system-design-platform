import { BookOpen } from "lucide-react";
import { RefList } from "@/components/training/Coach";
import { BIBLIOGRAPHY } from "@/lib/bibliography";

export const metadata = { title: "Bibliografia · System Design Platform" };

export default function Bibliografia() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label">
        <BookOpen size={14} /> Bibliografia
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Para ir <span className="text-accent glow">além</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Boa parte desta lista vem do roadmap do Renato Augusto no Miro. Seções marcadas como complemento foram adicionadas pela plataforma.
        Cada aula também traz, no final, as leituras específicas do tema.
      </p>
      <nav className="mt-6 flex flex-wrap gap-2 text-xs">
        {BIBLIOGRAPHY.map((s) => (
          <a key={s.id} href={`#${s.id}`} className="btn-ghost px-2.5 py-1">
            {s.title}
          </a>
        ))}
      </nav>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {BIBLIOGRAPHY.map((s) => (
          <section key={s.id} id={s.id} className="panel flex flex-col gap-3 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="hud-label !text-accent">{s.title}</h2>
              <span className={`rounded border px-1.5 py-0.5 text-[10px] ${s.fromMiro ? "border-accent-2/50 text-accent-2" : "border-border text-muted"}`}>
                {s.fromMiro ? "Miro do Renato" : "Complemento"}
              </span>
            </div>
            <p className="text-xs text-muted">{s.intro}</p>
            <RefList refs={s.items} />
          </section>
        ))}
      </div>
    </main>
  );
}
