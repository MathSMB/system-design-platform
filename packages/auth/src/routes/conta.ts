import { getDb, profiles, users } from "@sdp/db";
import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession, isUuid, signIn, signOut } from "../index";

/**
 * /api/conta, igual em todos os apps (cada app só reexporta).
 * GET: quem está usando. Sem conta, lista as contas para entrar com um clique.
 */
export async function GET() {
  try {
    const session = await getSession();
    const list = session ? [] : await getDb().select({ id: users.id, name: users.name }).from(users).orderBy(desc(users.createdAt)).limit(20);
    return NextResponse.json({ db: true, session, users: list });
  } catch (e) {
    console.error("[conta] banco fora do ar:", e);
    return NextResponse.json({ db: false, session: null, users: [] });
  }
}

/** Cria uma conta ({ name }) ou entra numa existente ({ userId }). */
export async function POST(req: Request) {
  const db = getDb();
  const b = await req.json().catch(() => ({}));
  if (isUuid(b?.userId)) {
    const [u] = await db.select().from(users).where(eq(users.id, b.userId));
    if (!u) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id)).orderBy(profiles.createdAt).limit(1);
    await signIn(u.id, p?.id);
    return NextResponse.json({ ok: true });
  }
  const name = String(b?.name ?? "").trim().slice(0, 60);
  if (name.length < 2) return NextResponse.json({ error: "Digite seu nome." }, { status: 400 });
  const [u] = await db.insert(users).values({ name }).returning();
  await signIn(u!.id);
  return NextResponse.json({ ok: true });
}

/** Sair. */
export async function DELETE() {
  await signOut();
  return NextResponse.json({ ok: true });
}
