import { describeEvent } from "@sdp/events";
import type { EventRow } from "@sdp/db";
import { getApp, type AppId } from "@sdp/ui";

const COLOR: Record<string, string> = { text: "text-text", accent: "text-accent", "accent-2": "text-accent-2", bad: "text-bad", ok: "text-ok" };

const when = (d: Date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);

/** Lista de eventos: quando, de qual app (na cor dele) e o que aconteceu. */
export function EventList({ events }: { events: EventRow[] }) {
  if (!events.length) return <p className="text-sm text-muted">Nada ainda. Responda uma pergunta na Entrevista ou avalie um desenho no System Design e o evento aparece aqui.</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {events.map((e) => {
        let app: ReturnType<typeof getApp> | null = null;
        try {
          app = getApp(e.source as AppId);
        } catch {}
        return (
          <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 text-sm">
            <span className="w-24 shrink-0 font-mono text-[11px] text-muted">{when(e.createdAt)}</span>
            <span className={`w-28 shrink-0 font-mono text-[11px] uppercase tracking-wider ${app ? COLOR[app.color] : "text-muted"}`}>{app?.title ?? e.source}</span>
            <span className="min-w-0 flex-1">{describeEvent(e.type, e.payload)}</span>
            <code className="font-mono text-[11px] text-muted">{e.type}</code>
          </li>
        );
      })}
    </ul>
  );
}
