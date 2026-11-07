import { cleanTrails, trailProgress } from "@sdp/study";
import { appUrl } from "@sdp/ui";
import { FolderGit2 } from "lucide-react";

/** "há 5 min", "há 3 h", "há 2 dias". */
function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  if (min < 60) return min < 1 ? "agora" : `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}

const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim().slice(0, 180);

/** Os projetos de portfólio do perfil (trilhas do tipo projeto da Central de estudos). Só lê o banco. */
export function Projects({ trails }: { trails: unknown }) {
  const projects = cleanTrails(trails).filter((t) => t.kind === "projeto");
  if (!projects.length)
    return (
      <div className="panel flex flex-wrap items-center gap-3 p-4 text-sm">
        <span className="text-muted">Nenhum projeto de portfólio ainda. Escolha um projeto sugerido ou crie o seu em Estudos e ligue ao GitHub para acompanhar aqui.</span>
        <a href={appUrl("estudos", "/#projetos")} className="btn-ghost ml-auto px-3 py-1 text-xs">
          Abrir Estudos →
        </a>
      </div>
    );
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {projects.map((t) => {
        const p = trailProgress(t);
        const g = t.github;
        const a = g?.analyses[0];
        return (
          <a key={t.id} href={appUrl("estudos", "/#trilhas")} className="panel flex flex-col gap-2 p-4 text-sm transition-shadow hover:border-ok">
            <div className="flex items-start justify-between gap-2">
              <span className="font-semibold">{t.title}</span>
              <span className="font-mono text-[12px] text-ok">{p.pct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 flex-1 rounded-full bg-panel-2" role="progressbar" aria-valuenow={p.pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Conclusão de ${t.title}`}>
                <span className="block h-full rounded-full bg-ok" style={{ width: `${p.pct}%` }} />
              </span>
              <span className="font-mono text-[11px] text-muted">
                {p.done}/{p.total} passos
              </span>
            </div>
            {g ? (
              <span className="flex flex-wrap items-center gap-x-2 font-mono text-[11px] text-muted">
                <FolderGit2 size={12} /> {g.repo}
                {g.commits[0] && <span>· último commit {ago(g.commits[0].date)}</span>}
              </span>
            ) : (
              <span className="text-[11px] text-muted">Passos marcados à mão (sem GitHub)</span>
            )}
            {a && <p className="text-[12px] text-muted">IA: {firstSentence(a.summary)}</p>}
            <span className="mt-auto font-mono text-[11px] text-muted">Abrir em Estudos →</span>
          </a>
        );
      })}
    </div>
  );
}
