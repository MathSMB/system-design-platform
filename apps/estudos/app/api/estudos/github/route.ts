import { checkToken, tokenHint } from "@sdp/study";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, githubTokens } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { GithubError, seal, whoAmI } from "@/lib/github";

export const runtime = "nodejs";

/** Se a conta tem token do GitHub salvo. O token em si nunca sai do servidor. */
export async function GET() {
  const db = getDb();
  const s = await getSession();
  if (!db || !s) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const [row] = await db.select().from(githubTokens).where(eq(githubTokens.userId, s.user.id));
  return NextResponse.json(row ? { connected: true, hint: row.hint, login: row.login, expiresAt: row.expiresAt } : { connected: false });
}

/** Salva o token (fine-grained, só leitura) depois de conferir com o GitHub. */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const c = checkToken(b?.token);
  if ("error" in c) return NextResponse.json({ error: c.error }, { status: 400 });
  try {
    const me = await whoAmI(c.token);
    const row = { userId: s.user.id, tokenEnc: seal(c.token), hint: tokenHint(c.token), login: me.login, expiresAt: me.expiresAt, createdAt: new Date() };
    await db.insert(githubTokens).values(row).onConflictDoUpdate({ target: githubTokens.userId, set: row });
    return NextResponse.json({ connected: true, hint: row.hint, login: row.login, expiresAt: row.expiresAt });
  } catch (e) {
    return NextResponse.json({ error: e instanceof GithubError ? e.message : "Não consegui falar com o GitHub." }, { status: 400 });
  }
}

/** Apaga o token salvo. As trilhas ligadas guardam o que já foi lido. */
export async function DELETE() {
  const db = getDb();
  const s = await getSession();
  if (!db || !s) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  await db.delete(githubTokens).where(eq(githubTokens.userId, s.user.id));
  return NextResponse.json({ connected: false });
}
