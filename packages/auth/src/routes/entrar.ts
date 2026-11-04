import { getDb, profiles, users } from "@sdp/db";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession, signIn } from "../index";
import { authorizeUrl, fetchUser, isProvider, providers, type OAuthUser, type Provider } from "../oauth";

/**
 * /api/entrar/<provedor> (só no Painel): leva para o GitHub ou o Google.
 * /api/entrar/<provedor>/callback: volta de lá, acha ou cria a conta e entra.
 * Já logado, conecta o provedor na conta de agora.
 */
const STATE = "sdl_oauth_state";
type Ctx = { params: Promise<{ provider: string }> };

export async function start(req: Request, { params }: Ctx) {
  const { provider } = await params;
  const origin = new URL(req.url).origin;
  if (!isProvider(provider) || !providers()[provider]) return NextResponse.redirect(`${origin}/conta?erro=config-${provider}`);
  const state = crypto.randomUUID();
  (await cookies()).set(STATE, state, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 600 });
  return NextResponse.redirect(authorizeUrl(provider, origin, state));
}

export async function callback(req: Request, { params }: Ctx) {
  const { provider } = await params;
  const url = new URL(req.url);
  const back = (erro: string) => NextResponse.redirect(`${url.origin}/conta?erro=${erro}`);
  const jar = await cookies();
  const state = jar.get(STATE)?.value;
  jar.delete(STATE);
  if (!isProvider(provider)) return back("provedor");
  const code = url.searchParams.get("code");
  if (!code || !state || url.searchParams.get("state") !== state) return back("cancelado");
  let who: OAuthUser;
  try {
    who = await fetchUser(provider, code, url.origin);
  } catch (e) {
    console.error(`[entrar] ${provider}:`, e);
    return back(`falhou-${provider}`);
  }
  const userId = await findOrCreate(provider, who);
  if (!userId) return back(`ja-conectado-${provider}`);
  const [p] = await getDb().select().from(profiles).where(eq(profiles.userId, userId)).orderBy(profiles.createdAt).limit(1);
  await signIn(userId, p?.id);
  return NextResponse.redirect(`${url.origin}/`);
}

/** A conta desse login: pelo id do provedor, pela conta aberta agora, pelo e-mail ou nova. */
async function findOrCreate(provider: Provider, who: OAuthUser): Promise<string | null> {
  const db = getDb();
  const col = provider === "github" ? users.githubId : users.googleId;
  const link = provider === "github" ? { githubId: who.id, githubLogin: who.login } : { googleId: who.id };
  const [byId] = await db.select().from(users).where(eq(col, who.id));
  const current = await getSession().catch(() => null);
  if (byId) {
    // conectado a outra conta que não a aberta agora: não mistura
    if (current && current.user.id !== byId.id) return null;
    return byId.id;
  }
  const target = current?.user ?? (who.email ? (await db.select().from(users).where(eq(users.email, who.email)))[0] : undefined);
  if (target) {
    await db
      .update(users)
      .set({ ...link, email: target.email ?? who.email, avatarUrl: target.avatarUrl ?? who.avatarUrl })
      .where(eq(users.id, target.id));
    return target.id;
  }
  const [u] = await db
    .insert(users)
    .values({ name: who.name.slice(0, 60), email: who.email, avatarUrl: who.avatarUrl, ...link })
    .returning();
  return u!.id;
}
