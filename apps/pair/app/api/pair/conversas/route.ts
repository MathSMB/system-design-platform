import { dayInBrazil } from "@sdp/habit";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, pairChats, pairMessages } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { chatList, chatMessages, chatTitle, chatView, cleanSetup, messageView, ownChat } from "@/lib/pair";

export const runtime = "nodejs";

const noUser = () => NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });

/** Sem id: as conversas (a tela agrupa por dia). Com ?id=: a conversa inteira. */
export async function GET(req: Request) {
  const db = getDb();
  const s = await getSession().catch(() => null);
  if (!s?.profile) return noUser();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ chats: await chatList(db, s.profile.id) });
  const chat = await ownChat(db, s.profile.id, id);
  if (!chat) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  return NextResponse.json({ chat: chatView(chat), messages: (await chatMessages(db, chat.id)).map(messageView) });
}

/** Abre uma conversa nova: { goal, stack, trailId?, folder? }. A primeira mensagem vai pelo /conversa. */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession().catch(() => null);
  if (!s?.profile) return noUser();
  const setup = cleanSetup(await req.json().catch(() => ({})));
  if (!setup.goal) return NextResponse.json({ error: "Conte o que você quer construir ou aprender." }, { status: 400 });
  const [chat] = await db.insert(pairChats).values({ profileId: s.profile.id, title: chatTitle(setup.goal), day: dayInBrazil(), setup }).returning();
  return NextResponse.json({ chat: chatView(chat!) });
}

/** Muda a pasta, a trilha ligada ou o título: { id, folder?, trailId?, title? }. */
export async function PATCH(req: Request) {
  const db = getDb();
  const s = await getSession().catch(() => null);
  if (!s?.profile) return noUser();
  const b = await req.json().catch(() => ({}));
  const chat = await ownChat(db, s.profile.id, b?.id);
  if (!chat) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  const cur = cleanSetup(chat.setup);
  const next = cleanSetup({ ...cur, ...("folder" in b ? { folder: b.folder } : {}), ...("trailId" in b ? { trailId: b.trailId } : {}) });
  if ("folder" in b && !next.folder) delete next.folder;
  if ("trailId" in b && !next.trailId) delete next.trailId;
  const title = typeof b.title === "string" && b.title.trim() ? b.title.trim().slice(0, 80) : chat.title;
  const [row] = await db.update(pairChats).set({ setup: next, title }).where(eq(pairChats.id, chat.id)).returning();
  return NextResponse.json({ chat: chatView(row!) });
}

/** Apaga uma conversa (?id=) com as mensagens. */
export async function DELETE(req: Request) {
  const db = getDb();
  const s = await getSession().catch(() => null);
  if (!s?.profile) return noUser();
  const chat = await ownChat(db, s.profile.id, new URL(req.url).searchParams.get("id"));
  if (!chat) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });
  await db.delete(pairMessages).where(eq(pairMessages.chatId, chat.id));
  await db.delete(pairChats).where(eq(pairChats.id, chat.id));
  return NextResponse.json({ ok: true });
}
