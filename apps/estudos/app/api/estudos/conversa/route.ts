import { createProvider } from "@sdp/ai";
import { addDays, dayInBrazil } from "@sdp/habit";
import { ATTACH_MAX_PER_MESSAGE, CHAT_STUCK_MS, chatTitle, cleanTrail } from "@sdp/study";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, studyAttachments, studyChatMessages, studyChats } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { activeResearch, contextOf, loadCenter, saveCenter, scheduleChecks } from "@/lib/study";
import { aiInput, attachmentsOf, chatMessages, ownChat } from "@/lib/chat";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Manda uma mensagem na conversa com a IA (pós, certificação, livro… ou mudar o cronograma).
 * Tudo fica salvo no banco: a mensagem dele entra antes de chamar a IA e a resposta entra quando
 * chega, mesmo que a janela tenha fechado. { chatId?, text, attachments?: ids, retry? }
 */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const p = s.profile;
  const b = await req.json().catch(() => ({}));
  const text = typeof b?.text === "string" ? b.text.trim().slice(0, 4000) : "";
  const ids: string[] = Array.isArray(b?.attachments) ? b.attachments.filter((x: unknown) => typeof x === "string").slice(0, ATTACH_MAX_PER_MESSAGE) : [];

  let chat = b?.chatId ? await ownChat(db, p.id, b.chatId) : null;
  if (b?.chatId && !chat) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  if (chat?.pendingSince && Date.now() - chat.pendingSince.getTime() < CHAT_STUCK_MS) return NextResponse.json({ error: "A IA ainda está respondendo a mensagem anterior.", chatId: chat.id }, { status: 409 });

  if (!b?.retry) {
    if (!text && !ids.length) return NextResponse.json({ error: "Escreva uma mensagem." }, { status: 400 });
    const files = await attachmentsOf(db, p.id, ids);
    if (!chat) chat = (await db.insert(studyChats).values({ profileId: p.id, title: chatTitle(text || files[0]?.name || "Anexo") }).returning())[0] ?? null;
    await db.insert(studyChatMessages).values({ chatId: chat!.id, role: "user", text, data: files.length ? { attachments: files.map((f) => f.id) } : {} });
    if (files.length) for (const f of files) await db.update(studyAttachments).set({ chatId: chat!.id }).where(eq(studyAttachments.id, f.id));
  } else if (!chat) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });

  const id = chat!.id;
  const msgs = await chatMessages(db, id);
  if (msgs[msgs.length - 1]?.role !== "user") return NextResponse.json({ error: "Nada para responder." }, { status: 400 });
  await db.update(studyChats).set({ pendingSince: new Date(), updatedAt: new Date() }).where(eq(studyChats.id, id));

  try {
    const c = await loadCenter(db, p);
    const r = await activeResearch(db, p, c);
    const checks = await scheduleChecks(db, p.id, addDays(dayInBrazil(), -30));
    const ctx = await contextOf(db, p, c, r.data, checks);
    const input = await aiInput(db, p.id, chat!.summary, msgs);
    const out = await createProvider().studyChat({ context: ctx, summary: input.summary, messages: input.messages, attachments: input.attachments });
    // o que a IA leu de cada anexo novo: nas próximas mensagens vai esse texto, não o arquivo
    for (const a of input.attachments) {
      const read = out.attachments.find((x) => x.name === a.name) ?? (input.attachments.length === 1 ? out.attachments[0] : undefined);
      await db.update(studyAttachments).set({ extracted: read?.text?.trim() || "(sem texto relevante)" }).where(eq(studyAttachments.id, a.id));
    }
    if (out.note) {
      // os combinados entram no próximo cronograma (guarda os mais recentes)
      const notes = [...c.availability.notes.split("\n").filter(Boolean), `${dayInBrazil()}: ${out.note}`].slice(-6).join("\n");
      await saveCenter(db, p.id, { availability: { ...c.availability, notes } });
    }
    const trail = out.action === "add_trail" ? cleanTrail(out.trail, "tnovo") : null;
    const action = trail ? "add_trail" : out.action === "replan" ? "replan" : "none";
    const [msg] = await db.insert(studyChatMessages).values({ chatId: id, role: "assistant", text: out.reply, data: { action, trail, note: out.note || undefined } }).returning();
    await db
      .update(studyChats)
      .set({ pendingSince: null, updatedAt: new Date(), ...(out.summary ? { summary: out.summary } : {}) })
      .where(eq(studyChats.id, id));
    return NextResponse.json({ chatId: id, message: msg, note: out.note });
  } catch (e) {
    await db.update(studyChats).set({ pendingSince: null }).where(eq(studyChats.id, id));
    return NextResponse.json({ chatId: id, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
