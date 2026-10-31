import Link from "next/link";
import { PRESETS } from "@sdp/sim-engine";
import { SCENARIOS } from "@sdp/race-sim";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-hand text-4xl">Desenhe. Simule. Veja onde quebra.</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Monte a arquitetura no canvas, jogue carga de verdade (1 milhão de usuários, pico, falhas) e veja o gargalo.
        No modo concorrência, veja duas requisições se cruzando e o dado ficando errado.
      </p>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted">Trilha: de 0 a 1 milhão de usuários</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(PRESETS).map(([id, p]) => (
            <Link key={id} href={`/canvas?preset=${id}`} className="rounded-lg border border-border bg-panel p-4 hover:border-accent">
              <div className="font-medium">{p.title}</div>
              <div className="mt-1 text-sm text-muted">{p.description}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-mono text-xs uppercase tracking-wider text-muted">Concorrência e race conditions</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {SCENARIOS.map((s) => (
            <Link key={s.id} href={`/concorrencia?c=${s.id}`} className="rounded-lg border border-border bg-panel p-4 hover:border-accent">
              <div className="font-medium">{s.title}</div>
              <div className="mt-1 text-sm text-muted">{s.description}</div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
