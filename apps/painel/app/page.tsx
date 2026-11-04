import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, Compass, Cpu, LayoutDashboard, Network, UserRound, type LucideIcon } from "lucide-react";
import { getSession, type Session } from "@sdp/auth";
import { recentEvents } from "@sdp/events";
import { APP_LIST, appUrl, profileTitle } from "@sdp/ui";
import { EventList } from "@/components/EventList";

export const dynamic = "force-dynamic";

/** Um ícone para cada app, o mesmo do topo da página dele. */
const ICON: Record<string, LucideIcon> = { "system-design": Network, entrevista: Briefcase, estudos: Compass, habito: Cpu };

/** Classes fixas por cor (o Tailwind só gera classes que aparecem inteiras no código). */
const TONE: Record<string, { text: string; hover: string }> = {
  accent: { text: "text-accent", hover: "hover:border-accent hover:shadow-[0_0_24px_rgba(34,228,255,0.3)]" },
  "accent-2": { text: "text-accent-2", hover: "hover:border-accent-2 hover:shadow-[0_0_24px_rgba(255,60,172,0.3)]" },
  bad: { text: "text-bad", hover: "hover:border-bad hover:shadow-[0_0_24px_rgba(255,154,60,0.35)]" },
  ok: { text: "text-ok", hover: "hover:border-ok hover:shadow-[0_0_24px_rgba(57,255,143,0.3)]" },
};

export default async function Painel() {
  let session: Session | null = null;
  let events: Awaited<ReturnType<typeof recentEvents>> = [];
  let dbUp = true;
  try {
    session = await getSession();
    if (session?.profile) events = await recentEvents(session.profile.id, 8);
  } catch {
    dbUp = false;
  }
  // o Painel é a área de quem entrou: sem conta, vai para o login
  if (dbUp && !session) redirect("/conta");
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label">
        <LayoutDashboard size={14} /> Painel
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Escolha o <span className="text-accent glow">app.</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">Cada parte da plataforma é um app separado, na sua porta. A conta é uma só: entrando aqui, você já está dentro de todos.</p>

      <section className="mt-6">
        {!dbUp ? (
          <div className="panel p-4 text-sm text-muted">
            O banco não respondeu. Abra o Docker Desktop, rode <code className="text-text">pnpm db:up</code> na raiz do projeto e reinicie o <code className="text-text">pnpm dev</code>.
          </div>
        ) : session ? (
          <div className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
            <UserRound size={16} className="text-ok" />
            <span>
              Olá, <span className="font-semibold text-ok">{session.user.name}</span>
              {session.profile ? <span className="text-muted"> · perfil ativo: {profileTitle(session.profile)}</span> : <span className="text-muted"> · sem perfil ainda</span>}
            </span>
            <Link href="/conta" className="btn-ghost ml-auto px-3 py-1 text-xs">
              Conta e perfis
            </Link>
          </div>
        ) : (
          <div className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
            <span className="text-muted">A plataforma funciona sem conta. Com conta, cada perfil tem a sua meta do dia, a sua placa-mãe e o seu histórico.</span>
            <Link href="/conta" className="btn-neon ml-auto px-4 py-2 text-xs">
              Entrar ▶
            </Link>
          </div>
        )}
      </section>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {APP_LIST.filter((a) => a.id !== "painel").map((a) => (
          <a key={a.id} href={appUrl(a.id)} className={`panel group flex flex-col gap-3 p-6 transition-shadow ${TONE[a.color]!.hover}`}>
            <div className="flex items-start justify-between gap-3">
              {(() => {
                const Icon = ICON[a.id]!;
                return <Icon size={40} strokeWidth={1.75} className={`${TONE[a.color]!.text} transition-transform group-hover:scale-110`} style={{ filter: `drop-shadow(0 0 10px var(--${a.color}))` }} />;
              })()}
              <span className="font-mono text-[11px] text-muted">:{a.port}</span>
            </div>
            <span className={`font-display text-sm leading-relaxed ${TONE[a.color]!.text} glow`}>{a.title}</span>
            <p className="text-sm text-muted">{a.body}</p>
            <span className="mt-auto font-mono text-xs text-muted">Abrir →</span>
          </a>
        ))}
      </div>

      {session?.profile && (
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="hud-label">Últimos eventos</h2>
            <Link href="/eventos" className="text-[12px] text-muted underline hover:text-accent">
              ver todos
            </Link>
          </div>
          <div className="panel mt-3 px-4 py-2">
            <EventList events={events} />
          </div>
        </section>
      )}
    </main>
  );
}
