import { isGoal, dayInBrazil } from "@sdp/habit";
import { LEVELS, getStack } from "@sdp/hiring";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { profiles } from "@/lib/db/schema";
import { getSession, ownProfile, setActiveProfile } from "@/lib/session";

/** Cria um perfil (stack + senioridade + meta) e já deixa ativo. */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s) return NextResponse.json({ error: "Entre na sua conta primeiro." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!getStack(b?.stack)) return NextResponse.json({ error: "Escolha a stack." }, { status: 400 });
  if (!LEVELS.some((l) => l.id === b?.level)) return NextResponse.json({ error: "Escolha a senioridade." }, { status: 400 });
  if (!isGoal(b?.goal)) return NextResponse.json({ error: "Escolha a meta diária." }, { status: 400 });
  if (s.profiles.some((p) => p.stack === b.stack && p.level === b.level))
    return NextResponse.json({ error: "Você já tem esse perfil." }, { status: 409 });
  const [p] = await db.insert(profiles).values({ userId: s.user.id, stack: b.stack, level: b.level, goal: b.goal, startDay: dayInBrazil() }).returning();
  await setActiveProfile(p!.id);
  return NextResponse.json(p);
}

/** Troca o perfil ativo ({ id, active: true }) ou a meta ({ id, goal }). */
export async function PATCH(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s) return NextResponse.json({ error: "Entre na sua conta primeiro." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const p = await ownProfile(s.user.id, b?.id);
  if (!p) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  if (b.goal !== undefined) {
    if (!isGoal(b.goal)) return NextResponse.json({ error: "Meta inválida." }, { status: 400 });
    await db.update(profiles).set({ goal: b.goal }).where(eq(profiles.id, p.id));
  }
  if (b.active) await setActiveProfile(p.id);
  return NextResponse.json({ ok: true });
}
