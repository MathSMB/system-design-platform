import { addDays, dayInBrazil, planOf } from "@sdp/habit";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { checkins } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

/**
 * Marca (done: true) ou desmarca um item manual da meta no perfil ativo.
 * Vale para hoje ou ontem (para quem esqueceu de marcar antes de dormir).
 */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const today = dayInBrazil();
  const day = b?.day ?? today;
  if (day !== today && day !== addDays(today, -1)) return NextResponse.json({ error: "Só dá para marcar hoje ou ontem." }, { status: 400 });
  const plan = planOf(s.profile.goal, s.profile.plan);
  const item = plan.items.find((i) => i.id === b?.itemId);
  if (!item || item.kind !== "manual") return NextResponse.json({ error: "Item da meta não encontrado." }, { status: 400 });
  const key = and(eq(checkins.profileId, s.profile.id), eq(checkins.day, day), eq(checkins.itemId, item.id));
  if (b.done === false) await db.delete(checkins).where(key);
  else await db.insert(checkins).values({ profileId: s.profile.id, day, itemId: item.id }).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
