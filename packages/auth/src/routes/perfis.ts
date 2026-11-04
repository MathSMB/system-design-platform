import { cleanHistory, cleanPlan, dayInBrazil, isGoal, planOf, withChange } from "@sdp/habit";
import { LEVELS, getStack } from "@sdp/hiring";
import { getDb, profiles } from "@sdp/db";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession, ownProfile, setActiveProfile } from "../index";

/** Um plano personalizado é salvo; um modelo pronto usa o plano do próprio modelo. */
function goalAndPlan(b: { goal?: unknown; plan?: unknown }) {
  if (!isGoal(b.goal)) return null;
  if (b.goal !== "personalizada") return { goal: b.goal, plan: null };
  const plan = cleanPlan(b.plan);
  return plan ? { goal: b.goal, plan } : null;
}

/** /api/perfis, igual em todos os apps (cada app só reexporta). */

/** Cria um perfil (stack + senioridade + meta) e já deixa ativo. */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Entre na sua conta primeiro." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!getStack(b?.stack)) return NextResponse.json({ error: "Escolha a stack." }, { status: 400 });
  if (!LEVELS.some((l) => l.id === b?.level)) return NextResponse.json({ error: "Escolha a senioridade." }, { status: 400 });
  const g = goalAndPlan(b ?? {});
  if (!g) return NextResponse.json({ error: "Escolha a meta diária (com pelo menos um item)." }, { status: 400 });
  if (s.profiles.some((p) => p.stack === b.stack && p.level === b.level))
    return NextResponse.json({ error: "Você já tem esse perfil." }, { status: 409 });
  const [p] = await db.insert(profiles).values({ userId: s.user.id, stack: b.stack, level: b.level, ...g, startDay: dayInBrazil() }).returning();
  await setActiveProfile(s.user.id, p!.id);
  return NextResponse.json(p);
}

/** Troca o perfil ativo ({ id, active: true }) ou a meta ({ id, goal, plan? }). */
export async function PATCH(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!s) return NextResponse.json({ error: "Entre na sua conta primeiro." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const p = await ownProfile(s.user.id, b?.id);
  if (!p) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  if (b.goal !== undefined) {
    const g = goalAndPlan(b);
    if (!g) return NextResponse.json({ error: "Meta inválida (precisa de pelo menos um item)." }, { status: 400 });
    const planHistory = withChange(cleanHistory(p.planHistory), planOf(p.goal, p.plan), dayInBrazil());
    await db.update(profiles).set({ ...g, planHistory }).where(eq(profiles.id, p.id));
  }
  if (b.active) await setActiveProfile(s.user.id, p.id);
  return NextResponse.json({ ok: true });
}
