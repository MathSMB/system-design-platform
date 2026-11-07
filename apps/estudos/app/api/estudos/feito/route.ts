import { addDays, dayInBrazil } from "@sdp/habit";
import { itemKey } from "@sdp/study";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { checkins } from "@sdp/db";
import { emitAsUser, getSession } from "@sdp/auth";
import { loadCenter, saveCenter } from "@/lib/study";

/** Marca um bloco do cronograma como feito (hoje ou ontem). Se o bloco é de uma unidade de trilha, ela fica concluída. */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const p = s.profile;
  const c = await loadCenter(db, p);
  const item = c.schedule?.items.find((i) => i.id === b?.itemId);
  if (!item) return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
  const today = dayInBrazil();
  if (item.day !== today && item.day !== addDays(today, -1)) return NextResponse.json({ error: "Só dá para marcar hoje ou ontem." }, { status: 400 });
  const key = and(eq(checkins.profileId, p.id), eq(checkins.day, item.day), eq(checkins.itemId, itemKey(item.id)));
  const done = b.done !== false;
  if (done) await db.insert(checkins).values({ profileId: p.id, day: item.day, itemId: itemKey(item.id) }).onConflictDoNothing();
  else await db.delete(checkins).where(key);
  if (item.trailId && item.unitId) {
    const trails = c.trails.map((t) => (t.id !== item.trailId ? t : { ...t, units: t.units.map((u) => (u.id === item.unitId && !u.issue ? { ...u, done } : u)) }));
    await saveCenter(db, p.id, { trails });
  }
  if (done) await emitAsUser("estudos", { type: "estudo.item-feito", ref: `${item.day}:${itemKey(item.id)}`, payload: { day: item.day, title: item.title.slice(0, 120) } });
  return NextResponse.json({ ok: true });
}
