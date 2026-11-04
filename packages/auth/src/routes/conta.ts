import { dayInBrazil } from "@sdp/habit";
import { LEVELS, getStack, isExperience, isObjective } from "@sdp/hiring";
import { getDb, profiles, users } from "@sdp/db";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession, isUuid, signIn, signOut } from "../index";
import { providers } from "../oauth";

/**
 * /api/conta, igual em todos os apps (cada app só reexporta).
 * GET: quem está usando. Sem conta, lista as contas para entrar com um clique
 * e diz quais logins (GitHub, Google) estão configurados.
 */
export async function GET() {
  try {
    const session = await getSession();
    // entrar com um clique só nas contas locais; quem conectou GitHub ou Google entra por eles
    const local = and(isNull(users.githubId), isNull(users.googleId));
    const list = session ? [] : await getDb().select({ id: users.id, name: users.name }).from(users).where(local).orderBy(desc(users.createdAt)).limit(20);
    return NextResponse.json({ db: true, session, users: list, providers: providers() });
  } catch (e) {
    console.error("[conta] banco fora do ar:", e);
    return NextResponse.json({ db: false, session: null, users: [], providers: providers() });
  }
}

const str = (x: unknown, max: number) => String(x ?? "").trim().slice(0, max);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Os dados do cadastro que vieram no corpo (só os válidos). */
function details(b: Record<string, unknown>) {
  const email = str(b.email, 120).toLowerCase();
  return {
    email: EMAIL.test(email) ? email : null,
    jobTitle: str(b.jobTitle, 80) || null,
    experience: isExperience(b.experience) ? b.experience : null,
    objective: isObjective(b.objective) ? b.objective : null,
  };
}

/**
 * Entra numa conta existente ({ userId }) ou cria uma ({ name, email?, jobTitle?,
 * experience?, objective?, stack?, level? }). Com stack e senioridade, o primeiro
 * perfil (a vaga) já nasce junto, com a meta sugerida.
 */
export async function POST(req: Request) {
  const db = getDb();
  const b = await req.json().catch(() => ({}));
  if (isUuid(b?.userId)) {
    const [u] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, b.userId), isNull(users.githubId), isNull(users.googleId)));
    if (!u) return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
    const [p] = await db.select().from(profiles).where(eq(profiles.userId, u.id)).orderBy(profiles.createdAt).limit(1);
    await signIn(u.id, p?.id);
    return NextResponse.json({ ok: true });
  }
  const name = str(b?.name, 60);
  if (name.length < 2) return NextResponse.json({ error: "Digite seu nome." }, { status: 400 });
  const [u] = await db.insert(users).values({ name, ...details(b ?? {}) }).returning();
  let pid: string | undefined;
  if (getStack(b?.stack) && LEVELS.some((l) => l.id === b?.level)) {
    const [p] = await db.insert(profiles).values({ userId: u!.id, stack: b.stack, level: b.level, goal: "sugerida", plan: null, startDay: dayInBrazil() }).returning();
    pid = p!.id;
  }
  await signIn(u!.id, pid);
  return NextResponse.json({ ok: true });
}

/** Atualiza os dados da conta (nome, e-mail, cargo, experiência, objetivo). */
export async function PATCH(req: Request) {
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Entre na sua conta primeiro." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const name = str(b?.name, 60);
  if (name.length < 2) return NextResponse.json({ error: "Digite seu nome." }, { status: 400 });
  await getDb().update(users).set({ name, ...details(b ?? {}) }).where(eq(users.id, s.user.id));
  return NextResponse.json({ ok: true });
}

/** Sair. */
export async function DELETE() {
  await signOut();
  return NextResponse.json({ ok: true });
}
