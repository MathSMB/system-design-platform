import { SignJWT, jwtVerify } from "jose";

/**
 * Login único: um JWT assinado num cookie que todos os apps leem.
 * No navegador, cookies de `localhost` valem para todas as portas, então
 * entrar no Painel (3000) já vale no System Design (3001), na Entrevista (3002) etc.
 */
export const SESSION_COOKIE = "sdl_session";
const MAX_AGE = 60 * 60 * 24 * 365;

export interface Claims {
  /** Id da conta. */
  uid: string;
  /** Perfil ativo (a vaga que a pessoa treina). */
  pid: string | null;
}

/** Segredo para assinar. Todos os apps precisam do mesmo (AUTH_SECRET no .env da raiz). */
function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    console.warn("[login] AUTH_SECRET não definido: usando o segredo de desenvolvimento.");
  }
  return new TextEncoder().encode(s || "sdp-segredo-local-de-desenvolvimento-troque-no-env");
}

export async function signToken(c: Claims): Promise<string> {
  return new SignJWT({ pid: c.pid })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(c.uid)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function readToken(token: string | undefined | null): Promise<Claims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return { uid: payload.sub, pid: typeof payload.pid === "string" ? payload.pid : null };
  } catch {
    return null;
  }
}

export const COOKIE_OPTIONS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: MAX_AGE };
