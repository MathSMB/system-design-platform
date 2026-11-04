import { Radio } from "lucide-react";
import { getSession } from "@sdp/auth";
import { EVENT_TYPES, recentEvents } from "@sdp/events";
import { EventList } from "@/components/EventList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Eventos · System Design Lab" };

export default async function Eventos() {
  const session = await getSession().catch(() => null);
  const events = session?.profile ? await recentEvents(session.profile.id, 100) : [];
  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label">
        <Radio size={14} /> Eventos
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        O que <span className="text-accent glow">aconteceu.</span>
      </h1>
      <p className="mt-3 text-muted">
        Cada app grava aqui o que você fez (tabela outbox no Postgres). Quem precisa lê no seu ritmo: o Hábito, por exemplo, transforma estes eventos em atividades da meta do dia. Os apps não precisam estar abertos ao mesmo tempo.
      </p>

      <section className="panel mt-6 px-4 py-2">{session?.profile ? <EventList events={events} /> : <p className="py-2 text-sm text-muted">Entre e escolha um perfil para ver os seus eventos.</p>}</section>

      <section className="mt-10">
        <h2 className="hud-label">API</h2>
        <div className="panel mt-3 flex flex-col gap-3 p-4 text-sm">
          <p className="text-muted">
            Todo app tem <code className="text-text">POST /api/eventos</code> com JSON <code className="text-text">{"{ type, ref?, payload? }"}</code>. O evento é gravado em nome da conta e do perfil ativo (cookie do login único). O <code className="text-text">ref</code> evita gravar o mesmo fato duas vezes.
          </p>
          <pre className="overflow-x-auto rounded-md border border-border bg-[#0a0e1a] p-3 font-mono text-[12px] text-ink">{`fetch("/api/eventos", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ type: "etapa.concluida", ref: "<id do processo>:tecnica" }),
})`}</pre>
          <ul className="flex flex-col gap-1">
            {Object.entries(EVENT_TYPES).map(([k, v]) => (
              <li key={k} className="flex flex-wrap gap-x-3">
                <code className="w-44 shrink-0 font-mono text-[12px] text-accent">{k}</code>
                <span className="text-muted">{v}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
