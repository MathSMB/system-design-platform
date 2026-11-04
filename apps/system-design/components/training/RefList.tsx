import type { Ref } from "@/lib/training/types";

export function RefList({ refs }: { refs: Ref[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {refs.map((r) => (
        <li key={r.title} className="leading-snug">
          {r.url ? (
            <a href={r.url} target="_blank" rel="noreferrer" className="text-text hover:text-accent">
              {r.title}
            </a>
          ) : (
            <span className="text-text">{r.title}</span>
          )}
          {r.by && <span className="text-muted"> · {r.by}</span>}
          {r.note && <div className="text-xs text-muted">{r.note}</div>}
        </li>
      ))}
    </ul>
  );
}
