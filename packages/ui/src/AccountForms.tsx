"use client";

import { AREAS, EXPERIENCES, LEVELS, OBJECTIVES, STACKS, type AreaId, type Level } from "@sdp/hiring";
import { Check } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { UserRow } from "./profile";

export type Providers = { github: boolean; google: boolean };

/** Marca do GitHub (os ícones de marca saíram do lucide). */
export function GithubMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** O "G" colorido do Google. */
export function GoogleMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const PROVIDERS = [
  { id: "github", label: "GitHub", Mark: GithubMark },
  { id: "google", label: "Google", Mark: GoogleMark },
] as const;

/** "Entrar com GitHub" e "Entrar com Google" (ou conectar, já logado). */
export function SocialButtons({ providers, verb = "Entrar com" }: { providers: Providers; verb?: string }) {
  const missing = PROVIDERS.filter((p) => !providers[p.id]);
  return (
    <div className="flex flex-col gap-2">
      <div className="grid gap-2 sm:grid-cols-2">
        {PROVIDERS.map(({ id, label, Mark }) =>
          providers[id] ? (
            <a key={id} href={`/api/entrar/${id}`} className="flex items-center justify-center gap-2.5 rounded-md border border-border bg-panel px-4 py-3 text-sm font-semibold transition-colors hover:border-text">
              <Mark size={18} /> {verb} {label}
            </a>
          ) : (
            <span key={id} title="Falta configurar as chaves no .env" className="flex cursor-not-allowed items-center justify-center gap-2.5 rounded-md border border-dashed border-border px-4 py-3 text-sm text-muted opacity-60">
              <Mark size={18} /> {verb} {label}
            </span>
          ),
        )}
      </div>
      {missing.length > 0 && (
        <p className="text-[12px] text-muted">
          {missing.map((p) => p.label).join(" e ")} ainda sem chave: siga o passo a passo em <code className="text-text">docs/login-github-google.md</code> e reinicie o <code className="text-text">pnpm dev</code>.
        </p>
      )}
    </div>
  );
}

const ERRORS: Record<string, string> = {
  cancelado: "O login foi cancelado ou expirou. Tente de novo.",
  "falhou-github": "O GitHub não confirmou o login. Confira as chaves no .env e tente de novo.",
  "falhou-google": "O Google não confirmou o login. Confira as chaves no .env e tente de novo.",
  "ja-conectado-github": "Esse GitHub já está conectado a outra conta.",
  "ja-conectado-google": "Esse Google já está conectado a outra conta.",
  "config-github": "Falta configurar as chaves do GitHub no .env.",
  "config-google": "Falta configurar as chaves do Google no .env.",
};
export const loginError = (code: string | null) => (code ? (ERRORS[code] ?? "Não deu para entrar. Tente de novo.") : "");

export interface Details {
  name: string;
  email: string;
  jobTitle: string;
  experience: string;
  objective: string;
}
export const detailsOf = (u?: UserRow | null): Details => ({
  name: u?.name ?? "",
  email: u?.email ?? "",
  jobTitle: u?.jobTitle ?? "",
  experience: u?.experience ?? "",
  objective: u?.objective ?? "",
});

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span>
        {label} {hint && <span className="text-[12px] text-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Nome, e-mail, cargo, experiência e objetivo (cadastro e edição). */
export function DetailsFields({ v, set }: { v: Details; set(v: Details): void }) {
  const on = (k: keyof Details) => (e: { target: { value: string } }) => set({ ...v, [k]: e.target.value });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Seu nome">
        <input value={v.name} onChange={on("name")} placeholder="ex. Matheus" required />
      </Field>
      <Field label="E-mail" hint="(opcional)">
        <input type="email" value={v.email} onChange={on("email")} placeholder="voce@email.com" />
      </Field>
      <Field label="Cargo hoje" hint="(opcional)">
        <input value={v.jobTitle} onChange={on("jobTitle")} placeholder="ex. Desenvolvedor júnior, estudante" />
      </Field>
      <Field label="Experiência na área">
        <select value={v.experience} onChange={on("experience")}>
          <option value="">Escolha</option>
          {EXPERIENCES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="O que você quer agora">
          <select value={v.objective} onChange={on("objective")}>
            <option value="">Escolha</option>
            {OBJECTIVES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  );
}

/** A vaga que a pessoa quer (vira o primeiro perfil). */
export function TargetFields({ v, set }: { v: { stack: string; level: Level }; set(v: { stack: string; level: Level }): void }) {
  const [area, setArea] = useState<AreaId>(STACKS.find((s) => s.id === v.stack)?.area ?? "backend");
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Área">
        <select
          value={area}
          onChange={(e) => {
            const a = e.target.value as AreaId;
            setArea(a);
            set({ ...v, stack: STACKS.find((x) => x.area === a)!.id });
          }}
        >
          {AREAS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Stack">
        <select value={v.stack} onChange={(e) => set({ ...v, stack: e.target.value })}>
          {STACKS.filter((x) => x.area === area).map((x) => (
            <option key={x.id} value={x.id}>
              {x.title}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Senioridade">
        <select value={v.level} onChange={(e) => set({ ...v, level: e.target.value as Level })}>
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </Field>
    </div>
  );
}

/** Cadastro local: dados da pessoa + a vaga que ela quer. */
export function SignupForm({ onSubmit }: { onSubmit(body: Details & { stack: string; level: Level }): void }) {
  const [v, setV] = useState<Details>(detailsOf());
  const [t, setT] = useState<{ stack: string; level: Level }>({ stack: "java", level: "pleno" });
  return (
    <form
      className="panel flex flex-col gap-5 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...v, ...t });
      }}
    >
      <div className="flex flex-col gap-1">
        <div className="hud-label">Criar conta</div>
        <p className="text-[13px] text-muted">Leva 1 minuto. Com isso a plataforma já abre no seu nível e na vaga que você quer.</p>
      </div>
      <DetailsFields v={v} set={setV} />
      <div className="flex flex-col gap-2">
        <span className="text-sm">A vaga que você quer</span>
        <TargetFields v={t} set={setT} />
        <p className="text-[12px] text-muted">Vira o seu primeiro perfil, com a meta diária sugerida. Dá para trocar e criar outros depois.</p>
      </div>
      <button className="btn-neon self-start px-5 py-2.5 text-xs">Criar conta e entrar ▶</button>
    </form>
  );
}

/** Seus dados, editáveis, com "Salvo" quando grava. */
export function DetailsCard({ user, onSave }: { user: UserRow; onSave(v: Details): Promise<boolean> }) {
  const [v, setV] = useState<Details>(detailsOf(user));
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(v) !== JSON.stringify(detailsOf(user));
  return (
    <form
      className="panel flex flex-col gap-4 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await onSave(v)) setSaved(true);
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar user={user} size={44} />
        <div className="hud-label">Seus dados</div>
      </div>
      <DetailsFields
        v={v}
        set={(x) => {
          setV(x);
          setSaved(false);
        }}
      />
      <div className="flex items-center gap-3">
        <button disabled={!dirty} className="btn-neon px-4 py-2 text-xs disabled:opacity-40">
          Salvar
        </button>
        {saved && !dirty && (
          <span className="flex items-center gap-1 text-[12px] text-ok">
            <Check size={13} /> Salvo
          </span>
        )}
      </div>
    </form>
  );
}

/** GitHub e Google conectados (ou o botão para conectar). */
export function ConnectedAccounts({ user, providers }: { user: UserRow; providers: Providers }) {
  const linked = { github: user.githubId ? (user.githubLogin ? `@${user.githubLogin}` : "conectado") : null, google: user.googleId ? (user.email ?? "conectado") : null };
  return (
    <div className="panel flex flex-col gap-3 p-4">
      <div className="hud-label">Contas conectadas</div>
      <p className="text-[12px] text-muted">Conecte para entrar com um clique. O GitHub também vai servir para a Central de estudos ler os seus projetos.</p>
      <ul className="flex flex-col gap-2">
        {PROVIDERS.map(({ id, label, Mark }) => (
          <li key={id} className="flex flex-wrap items-center gap-3 text-sm">
            <Mark size={18} />
            <span className="w-16 font-semibold">{label}</span>
            {linked[id] ? (
              <span className="flex items-center gap-1 text-ok">
                <Check size={14} /> {linked[id]}
              </span>
            ) : providers[id] ? (
              <a href={`/api/entrar/${id}`} className="btn-ghost px-3 py-1 text-xs">
                Conectar
              </a>
            ) : (
              <span className="text-[12px] text-muted">falta configurar a chave no .env</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Foto da conta (GitHub/Google) ou as iniciais. */
export function Avatar({ user, size = 28 }: { user: Pick<UserRow, "name" | "avatarUrl">; size?: number }) {
  if (user.avatarUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" width={size} height={size} className="shrink-0 rounded-full border border-border" />;
  const ini = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return (
    <span className="grid shrink-0 place-items-center rounded-full border border-accent/60 font-mono text-accent" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {ini || "?"}
    </span>
  );
}
