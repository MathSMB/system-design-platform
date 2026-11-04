import { createProvider, type ChatMessage } from "@sdp/ai";
import { addDays, dayInBrazil } from "@sdp/habit";
import { cleanTrail, type RoleResearch } from "@sdp/study";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { contextOf, loadCenter, loadResearch, saveCenter, scheduleChecks } from "@/lib/study";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Conversa com a IA para adicionar pós, certificação, livro… ou mudar o cronograma. */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const messages: ChatMessage[] = (Array.isArray(b?.messages) ? b.messages : [])
    .slice(-20)
    .map((m: any) => ({ role: m?.role === "assistant" ? "assistant" : "user", text: String(m?.text ?? "").slice(0, 2000) }))
    .filter((m: ChatMessage) => m.text.trim());
  if (!messages.length || messages[messages.length - 1]!.role !== "user") return NextResponse.json({ error: "Escreva uma mensagem." }, { status: 400 });
  const p = s.profile;
  const c = await loadCenter(db, p);
  const r = await loadResearch(db, c.role, p.level);
  const checks = await scheduleChecks(db, p.id, addDays(dayInBrazil(), -30));
  try {
    const ctx = await contextOf(db, p, c, r?.status === "done" ? (r.data as RoleResearch) : null, checks);
    const out = await createProvider().studyChat({ context: ctx, messages });
    if (out.note) {
      // os combinados entram no próximo cronograma (guarda os mais recentes)
      const notes = [...c.availability.notes.split("\n").filter(Boolean), `${dayInBrazil()}: ${out.note}`].slice(-6).join("\n");
      await saveCenter(db, p.id, { availability: { ...c.availability, notes } });
    }
    const trail = out.action === "add_trail" ? cleanTrail(out.trail, "tnovo") : null;
    return NextResponse.json({ reply: out.reply, action: trail ? "add_trail" : out.action === "replan" ? "replan" : "none", trail, note: out.note });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
