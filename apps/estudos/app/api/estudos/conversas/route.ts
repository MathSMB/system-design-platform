import { CHAT_STUCK_MS, chatTitle, cleanTrail } from "@sdp/study";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, studyChatMessages, studyChats } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { attachmentIds, attachmentsOf, chatList, chatMessages, ownChat } from "@/lib/chat";

export const runtime = "nodejs";

const pending = (d: Date | null) => !!d && Date.now() - d.getTime() < CHAT_STUCK_MS;

/** Sem id: a lista de conversas. Com ?id=: a conversa inteira, com os anexos. */
export async function GET(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ chats: (await chatList(db, s.profile.id)).map((c) => ({ ...c, pending: pending(c.pendingSince) })) });
  const chat = await ownChat(db, s.profile.id, id);
  if (!chat) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  const msgs = await chatMessages(db, chat.id);
  const files = await attachmentsOf(db, s.profile.id, msgs.flatMap(attachmentIds));
  return NextResponse.json({
    chat: { id: chat.id, title: chat.title, updatedAt: chat.updatedAt, pending: pending(chat.pendingSince) },
    messages: msgs.map((m) => ({ id: m.id, role: m.role, text: m.text, createdAt: m.createdAt, ...(m.data as object) })),
    attachments: files.map((f) => ({ id: f.id, name: f.name, mime: f.mime, size: f.size })),
  });
}

/**
 * { op: "used", chatId, messageId } marca a trilha da mensagem como adicionada (ou o cronograma como refeito).
 * { op: "note", chatId, text } guarda uma mensagem da IA (ex. "Pronto, está nas trilhas").
 * { op: "import", messages } traz para o banco a conversa que ficava só no navegador.
 */
export async function PATCH(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (b?.op === "import") {
    const list = (Array.isArray(b.messages) ? b.messages : [])
      .slice(-40)
      .map((m: any) => ({ role: m?.role === "assistant" ? "assistant" : "user", text: String(m?.text ?? "").slice(0, 4000), trail: m?.trail ? cleanTrail(m.trail, "tnovo") : null, used: m?.used === true }))
      .filter((m: { text: string }) => m.text.trim());
    const first = list.find((m: { role: string }) => m.role === "user");
    if (!first) return NextResponse.json({ ok: true });
    const [chat] = await db.insert(studyChats).values({ profileId: s.profile.id, title: chatTitle(first.text) }).returning();
    await db.insert(studyChatMessages).values(list.map((m: any) => ({ chatId: chat!.id, role: m.role, text: m.text, data: m.trail ? { action: "add_trail", trail: m.trail, used: m.used } : {} })));
    return NextResponse.json({ ok: true, chatId: chat!.id });
  }
  const chat = await ownChat(db, s.profile.id, b?.chatId);
  if (!chat) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  if (b.op === "used") {
    const [m] = await db.select().from(studyChatMessages).where(and(eq(studyChatMessages.id, Number(b.messageId)), eq(studyChatMessages.chatId, chat.id)));
    if (!m) return NextResponse.json({ error: "Mensagem não encontrada." }, { status: 404 });
    await db.update(studyChatMessages).set({ data: { ...(m.data as object), used: true } }).where(eq(studyChatMessages.id, m.id));
  } else if (b.op === "note") {
    const text = typeof b.text === "string" ? b.text.slice(0, 2000) : "";
    if (text) await db.insert(studyChatMessages).values({ chatId: chat.id, role: "assistant", text, data: b.action === "replan" ? { action: "replan" } : {} });
  } else return NextResponse.json({ error: "Operação desconhecida." }, { status: 400 });
  await db.update(studyChats).set({ updatedAt: new Date() }).where(eq(studyChats.id, chat.id));
  return NextResponse.json({ ok: true });
}
