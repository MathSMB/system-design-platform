import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { profiles, users } from "@/lib/db/schema";
import { getSession, isUuid, signIn, signOut } from "@/lib/session";

/** Quem está usando. Sem conta, lista as contas para entrar com um clique. */
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ db: false, session: null, users: [] });
  const session = await getSession();
  const list = session ? [] : await db.select({ id: users.id, name: users.name }).from(users).orderBy(desc(users.createdAt)).limit(20);
  return NextResponse.json({ db: true, session, users: list });
}

/** Cria uma conta ({ name }) ou entra numa existente ({ userId }). */
export async function POST(req: Request) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "Configure o banco (DATABASE_URL) para criar contas." }, { status: 503 });
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
