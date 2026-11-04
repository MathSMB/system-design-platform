import Link from "next/link";
import { Coffee, Lock } from "lucide-react";
import { JAVA_PLENO } from "@sdp/hiring";

const LEVELS = [
  { id: "junior", title: "Júnior", body: "Fundamentos de Java, orientação a objetos, SQL e primeiros passos com Spring.", ready: false },
  { id: "pleno", title: "Pleno", body: `${JAVA_PLENO.length} perguntas em 7 blocos, com o peso do que as vagas mais pedem. Responda falando, compare com a resposta de pleno e veja seu nível.`, ready: true },
  { id: "senior", title: "Sênior", body: "Arquitetura, escala, decisões de time e operação em produção.", ready: false },
];

export default function EntrevistaJava() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-accent-2">
        <Coffee size={14} /> Entrevista técnica · Java
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Qual <span className="text-accent-2 glow">nível?</span>
      </h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {LEVELS.map((l) =>
          l.ready ? (
            <Link key={l.id} href={`/java/${l.id}`} className="panel group flex flex-col gap-3 p-6 transition-shadow hover:border-accent-2 hover:shadow-[0_0_24px_rgba(255,60,172,0.3)]">
              <div className="font-display text-sm text-accent-2 glow">{l.title}</div>
              <p className="text-sm text-muted">{l.body}</p>
              <span className="mt-auto font-mono text-xs text-muted">Começar →</span>
            </Link>
          ) : (
            <div key={l.id} className="panel flex flex-col gap-3 p-6 opacity-50">
              <div className="flex items-center gap-2 font-display text-sm text-muted">
                <Lock size={14} /> {l.title}
              </div>
              <p className="text-sm text-muted">{l.body}</p>
              <span className="mt-auto font-mono text-xs text-muted">Em breve</span>
            </div>
          ),
        )}
      </div>
    </main>
  );
}
