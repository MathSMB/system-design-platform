import Link from "next/link";
import { PRESETS } from "@sdp/sim-engine";
import { SCENARIOS } from "@sdp/race-sim";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-14">
      <div className="hud-label">// modo treino · entrevistas de system design</div>
      <h1 className="mt-4 font-display text-2xl leading-[1.6] text-text sm:text-3xl sm:leading-[1.5]">
        Desenhe. Simule.
        <br />
        <span className="text-accent glow">Veja onde quebra.</span>
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted">
        Monte a arquitetura no canvas, jogue carga de verdade (1 milhão de usuários, pico, falhas) e veja o gargalo.
        No modo concorrência, veja duas requisições se cruzando e o dado ficando errado.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/canvas" className="btn-neon px-4 py-2 text-sm">▶ Abrir o canvas</Link>
        <Link href="/concorrencia" className="btn-ghost px-4 py-2 text-sm font-semibold uppercase tracking-wider">Race conditions</Link>
      </div>

      <section className="mt-14">
        <h2 className="hud-label">Trilha · de 0 a 1 milhão de usuários</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(PRESETS).map(([id, p], i) => (
            <Link key={id} href={`/canvas?preset=${id}`} className="panel group p-4 transition-shadow hover:border-accent hover:shadow-[0_0_18px_rgba(34,228,255,0.25)]">
              <div className="flex items-baseline gap-3">
                <span className="font-display text-[10px] text-accent-2">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-semibold group-hover:text-accent">{p.title.replace(/^\d+\.\s*/, "")}</span>
              </div>
              <div className="mt-1 text-sm text-muted">{p.description}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="hud-label">Concorrência e race conditions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
            <Link key={s.id} href={`/concorrencia?c=${s.id}`} className="panel group p-4 transition-shadow hover:border-accent-2 hover:shadow-[0_0_18px_rgba(255,60,172,0.25)]">
              <div className="font-semibold group-hover:text-accent-2">{s.title}</div>
              <div className="mt-1 text-sm text-muted">{s.description}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
