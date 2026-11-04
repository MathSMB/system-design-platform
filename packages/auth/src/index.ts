import { getDb, profiles, users, type Profile, type User } from "@sdp/db";
import { emit, type AppId, type NewEvent } from "@sdp/events";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { COOKIE_OPTIONS, SESSION_COOKIE, readToken, signToken } from "./token";

export { SESSION_COOKIE } from "./token";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (x: unknown): x is string => typeof x === "string" && UUID.test(x);

export interface Session {
  user: User;
  profiles: Profile[];
  /** Perfil ativo (o primeiro, se o cookie não apontar para nenhum). */
  profile: Profile | null;
}

/**
 * Quem está usando, em qualquer app. Por enquanto a entrada é com um clique,
 * sem senha (uso pessoal). Google e GitHub podem entrar depois só aqui.
 */
export async function getSession(): Promise<Session | null> {
  const claims = await readToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!claims || !isUuid(claims.uid)) return null;
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, claims.uid));
  if (!user) return null;
  const list = await db.select().from(profiles).where(eq(profiles.userId, user.id)).orderBy(profiles.createdAt);
  return { user, profiles: list, profile: list.find((p) => p.id === claims.pid) ?? list[0] ?? null };
}

export async function signIn(userId: string, profileId?: string | null) {
  (await cookies()).set(SESSION_COOKIE, await signToken({ uid: userId, pid: profileId ?? null }), COOKIE_OPTIONS);
}

export async function setActiveProfile(userId: string, profileId: string) {
  await signIn(userId, profileId);
}

export async function signOut() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Dono do perfil? (para não mexer no perfil de outra conta). */
export async function ownProfile(userId: string, profileId: unknown) {
  if (!isUuid(profileId)) return null;
  const [p] = await getDb()
    .select()
    .from(profiles)
    .where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  return p ?? null;
}

/**
 * Grava um evento em nome de quem está usando (conta e perfil ativo).
 * Sem conta, não grava (nada conta para a meta). Nunca lança erro.
 */
export async function emitAsUser(source: AppId, ev: NewEvent): Promise<boolean> {
  try {
    const s = await getSession();
    if (!s?.profile) return false;
    return await emit(source, { userId: s.user.id, profileId: s.profile.id }, ev);
  } catch {
    return false;
  }
}
