import { emit, parseEvent, recentEvents, type AppId } from "@sdp/events";
import { NextResponse } from "next/server";
import { getSession } from "../index";

/**
 * /api/eventos, em todos os apps.
 * POST { type, ref?, payload? }: grava o evento na outbox com a conta e o perfil
 *   de quem está usando. Sem conta: 200 com { saved: false } (nada conta para a meta).
 * GET: os últimos eventos do perfil ativo.
 */
export function eventosHandlers(source: AppId) {
  async function POST(req: Request) {
    const ev = parseEvent(await req.json().catch(() => null));
    if (typeof ev === "string") return NextResponse.json({ error: ev }, { status: 400 });
    const s = await getSession().catch(() => null);
    if (!s?.profile) return NextResponse.json({ saved: false, reason: "sem conta ou perfil ativo" });
    return NextResponse.json({ saved: await emit(source, { userId: s.user.id, profileId: s.profile.id }, ev) });
  }
  async function GET() {
    const s = await getSession().catch(() => null);
    if (!s?.profile) return NextResponse.json({ events: [] });
    return NextResponse.json({ events: await recentEvents(s.profile.id, 50) });
  }
  return { GET, POST };
}
