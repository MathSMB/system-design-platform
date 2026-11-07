import { createProvider, loadPairPersona } from "@sdp/ai";
import { dayInBrazil } from "@sdp/habit";
import { emit } from "@sdp/events";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, pairChats, pairMessages } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { aiMessages, chatMessages, chatView, cleanSetup, messageView, ownChat, pending, setupFor } from "@/lib/pair";

export const runtime = "nodejs";
export const maxDuration = 420;

/**
 * Manda uma mensagem para o mentor e espera a resposta da IA: { chatId, text, retry? }.
 * A mensagem dele entra no banco antes de chamar a IA e a resposta entra quando chega,
 * mesmo que a janela tenha fechado. Para a IA vai só o resumo + as últimas mensagens.
 */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession().catch(() => null);
  if (!s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const text = typeof b?.text === "string" ? b.text.trim().slice(0, 8000) : "";
  const chat = await ownChat(db, s.profile.id, b?.chatId);
  if (!chat) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  if (pending(chat.pendingSince)) return NextResponse.json({ error: "O mentor ainda está respondendo a mensagem anterior." }, { status: 409 });

  if (!b?.retry) {
    if (!text) return NextResponse.json({ error: "Escreva uma mensagem." }, { status: 400 });
    await db.insert(pairMessages).values({ chatId: chat.id, role: "user", text });
  }
  const msgs = await chatMessages(db, chat.id);
  if (msgs[msgs.length - 1]?.role !== "user") return NextResponse.json({ error: "Nada para responder." }, { status: 400 });
  await db.update(pairChats).set({ pendingSince: new Date(), updatedAt: new Date() }).where(eq(pairChats.id, chat.id));

  const plan = Array.isArray(chat.plan) ? (chat.plan as string[]) : [];
  try {
    const setup = await setupFor(db, s, cleanSetup(chat.setup));
    const input = aiMessages(chat.summary, msgs);
    const out = await createProvider().pairChat({ persona: loadPairPersona(), setup, plan, step: chat.step, summary: input.summary, messages: input.messages });
    const nextPlan = out.plan.length ? out.plan : plan;
    const [msg] = await db.insert(pairMessages).values({ chatId: chat.id, role: "assistant", text: out.reply, data: { step: out.step, waiting: out.waiting } }).returning();
    const [row] = await db
      .update(pairChats)
      .set({ pendingSince: null, updatedAt: new Date(), plan: nextPlan, step: out.step, ...(out.summary ? { summary: out.summary } : {}) })
      .where(eq(pairChats.id, chat.id))
      .returning();
    // cada passo que ficou para trás conta como avanço no projeto (Hábito)
    if (out.plan.length === 0 || out.plan.length === plan.length) {
      for (let i = chat.step; i < out.step; i++) {
        const step = nextPlan[i];
        if (step) await emit("pair", { userId: s.user.id, profileId: s.profile.id }, { type: "pair.passo-concluido", ref: `${chat.id}:${i}`, payload: { step, title: chat.title, day: dayInBrazil() } }).catch(() => false);
      }
    }
    return NextResponse.json({ chat: chatView(row!), message: messageView(msg!) });
  } catch (e) {
    await db.update(pairChats).set({ pendingSince: null }).where(eq(pairChats.id, chat.id));
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
