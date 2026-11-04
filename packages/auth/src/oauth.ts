/**
 * Entrar com GitHub e com Google (OAuth 2.0, sem biblioteca). As chaves ficam no
 * .env da raiz; sem elas, o botão aparece desligado com a dica de como configurar.
 * O retorno é sempre no Painel: http://localhost:3000/api/entrar/<provedor>/callback
 */

export type Provider = "github" | "google";
export const isProvider = (x: unknown): x is Provider => x === "github" || x === "google";

const ENV = {
  github: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
} as const;

const keys = (p: Provider) => ({ id: process.env[ENV[p][0]] ?? "", secret: process.env[ENV[p][1]] ?? "" });

/** Quais logins estão configurados (para mostrar os botões ligados). */
export const providers = (): Record<Provider, boolean> => ({
  github: !!(keys("github").id && keys("github").secret),
  google: !!(keys("google").id && keys("google").secret),
});

export const callbackUrl = (origin: string, p: Provider) => `${origin}/api/entrar/${p}/callback`;

/** Para onde mandar a pessoa autorizar. */
export function authorizeUrl(p: Provider, origin: string, state: string) {
  const { id } = keys(p);
  const redirect = callbackUrl(origin, p);
  if (p === "github") {
    const q = new URLSearchParams({ client_id: id, redirect_uri: redirect, scope: "read:user user:email", state, allow_signup: "true" });
    return `https://github.com/login/oauth/authorize?${q}`;
  }
  const q = new URLSearchParams({ client_id: id, redirect_uri: redirect, response_type: "code", scope: "openid email profile", state, prompt: "select_account" });
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`;
}

/** Quem entrou, do jeito que cada provedor conta. */
export interface OAuthUser {
  id: string;
  name: string;
  email: string | null;
  avatarUrl: string | null;
  login: string | null;
}

/** Troca o código pelo token e lê quem é a pessoa. */
export async function fetchUser(p: Provider, code: string, origin: string): Promise<OAuthUser> {
  const { id, secret } = keys(p);
  const redirect = callbackUrl(origin, p);
  if (p === "github") {
    const t = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify({ client_id: id, client_secret: secret, code, redirect_uri: redirect }),
    }).then((r) => r.json());
    if (!t.access_token) throw new Error(t.error_description ?? "O GitHub não devolveu o token.");
    const h = { authorization: `Bearer ${t.access_token}`, accept: "application/vnd.github+json", "user-agent": "system-design-lab" };
    const u = await fetch("https://api.github.com/user", { headers: h }).then((r) => r.json());
    let email: string | null = u.email ?? null;
    if (!email) {
      const list = await fetch("https://api.github.com/user/emails", { headers: h })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []);
      email = (Array.isArray(list) ? list.find((e: { primary?: boolean; verified?: boolean }) => e.primary && e.verified)?.email : null) ?? null;
    }
    return { id: String(u.id), name: u.name || u.login, email, avatarUrl: u.avatar_url ?? null, login: u.login ?? null };
  }
  const t = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, code, redirect_uri: redirect, grant_type: "authorization_code" }),
  }).then((r) => r.json());
  if (!t.access_token) throw new Error(t.error_description ?? "O Google não devolveu o token.");
  const u = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${t.access_token}` } }).then((r) => r.json());
  if (!u.sub) throw new Error("O Google não disse quem é a conta.");
  return { id: String(u.sub), name: u.name || u.email, email: u.email_verified ? u.email : null, avatarUrl: u.picture ?? null, login: null };
}
