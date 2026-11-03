import "server-only";
import { dayInBrazil, type ActivityKind } from "@sdp/habit";
import { and, eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db/client";
import { activities, profiles, users, type Profile, type User } from "@/lib/db/schema";

/**
 * Sessão simples: dois cookies com o id da conta e do perfil ativo.
 * Serve para uso pessoal no seu computador. Login de verdade
 * (Google e GitHub com Auth.js) está nas pendências.
 */
export const USER_COOKIE = "sdl_uid";
export const PROFILE_COOKIE = "sdl_pid";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (x: unknown): x is string => typeof x === "string" && UUID.test(x);

const COOKIE = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };

export interface Session {
  user: User;
  profiles: Profile[];
  /** Perfil ativo (o primeiro, se o cookie não apontar para nenhum). */
  profile: Profile | null;
}

export async function getSession(): Promise<Session | null> {
  const db = getDb();
  if (!db) return null;
  const jar = await cookies();
  const uid = jar.get(USER_COOKIE)?.value;
  if (!isUuid(uid)) return null;
  const [user] = await db.select().from(users).where(eq(users.id, uid));
  if (!user) return null;
  const list = await db.select().from(profiles).where(eq(profiles.userId, user.id)).orderBy(profiles.createdAt);
  const pid = jar.get(PROFILE_COOKIE)?.value;
  return { user, profiles: list, profile: list.find((p) => p.id === pid) ?? list[0] ?? null };
}

export async function signIn(userId: string, profileId?: string | null) {
  const jar = await cookies();
  jar.set(USER_COOKIE, userId, COOKIE);
  if (profileId) jar.set(PROFILE_COOKIE, profileId, COOKIE);
  else jar.delete(PROFILE_COOKIE);
}

export async function setActiveProfile(profileId: string) {
  (await cookies()).set(PROFILE_COOKIE, profileId, COOKIE);
}

export async function signOut() {
  const jar = await cookies();
  jar.delete(USER_COOKIE);
  jar.delete(PROFILE_COOKIE);
}

/**
 * Marca uma atividade no perfil ativo (conta para a meta do dia).
 * Sem banco ou sem perfil, não faz nada; um erro aqui nunca derruba a avaliação.
 */
export async function logActivity(kind: ActivityKind, ref?: string): Promise<boolean> {
  try {
    const db = getDb();
    const s = db && (await getSession());
    if (!db || !s?.profile) return false;
    await db
      .insert(activities)
      .values({ profileId: s.profile.id, kind, day: dayInBrazil(), ref: ref?.slice(0, 120) ?? null })
      .onConflictDoNothing();
    return true;
  } catch {
    return false;
  }
}

/** Dono do perfil? (para não mexer no perfil de outra conta). */
export async function ownProfile(userId: string, profileId: string) {
  const db = getDb();
  if (!db || !isUuid(profileId)) return null;
  const [p] = await db.select().from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, userId)));
  return p ?? null;
}
