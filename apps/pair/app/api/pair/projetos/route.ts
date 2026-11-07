import { dayInBrazil } from "@sdp/habit";
import { NextResponse } from "next/server";
import { getDb, pairChats } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { attachProject, chatView, cleanSetup } from "@/lib/pair";

export const runtime = "nodejs";

const str = (x: unknown, n: number) => (typeof x === "string" ? x.trim().slice(0, n) : "");

/**
 * Acopla um projeto pelo Pair Programming: { title, goal, steps?, skills?, stack?, repo?, folder? }.
 * Ele vira um projeto nos Estudos (as entregas são os passos) e já abre a conversa ligada a ele.
 */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession().catch(() => null);
  if (!s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const title = str(b?.title, 120);
  const goal = str(b?.goal, 1500);
  if (!title) return NextResponse.json({ error: "Dê um nome ao projeto." }, { status: 400 });
  if (!goal) return NextResponse.json({ error: "Conte o que o projeto precisa ter ou fazer." }, { status: 400 });
  const lines = (x: unknown) => (typeof x === "string" ? x.split("\n") : Array.isArray(x) ? x : []).map((t) => str(String(t ?? "").replace(/^\s*([-*]|\d+[.)])\s*/, ""), 160)).filter(Boolean);
  const trail = await attachProject(db, s.profile.id, { title, why: goal, steps: lines(b.steps).slice(0, 40), skills: lines(b.skills).slice(0, 12) });
  if (!trail) return NextResponse.json({ error: "Os Estudos já têm o máximo de trilhas (20). Arquive uma lá antes de acoplar outro projeto." }, { status: 409 });
  const setup = cleanSetup({ goal: `${title}: ${goal}`, stack: b.stack, trailId: trail.id, folder: b.folder, repo: b.repo });
  const [chat] = await db.insert(pairChats).values({ profileId: s.profile.id, title, day: dayInBrazil(), setup }).returning();
  return NextResponse.json({ chat: chatView(chat!), trailId: trail.id });
}
