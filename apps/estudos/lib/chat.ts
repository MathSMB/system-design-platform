import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { ChatAttachment, ChatMessage } from "@sdp/ai";
import { CHAT_RECENT } from "@sdp/study";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@sdp/db";
import { studyAttachments, studyChatMessages, studyChats, type StudyAttachment, type StudyChatMessage } from "@sdp/db";

/** Pasta dos anexos: fica na máquina, fora do git (apps/estudos/.data/anexos). */
export const ATTACH_DIR = resolve(process.env.SDP_ANEXOS_DIR || join(process.cwd(), ".data", "anexos"));

export async function saveFile(rel: string, bytes: Buffer) {
  const full = join(ATTACH_DIR, rel);
  await mkdir(join(full, ".."), { recursive: true });
  await writeFile(full, bytes);
}
export const readAttachment = (a: Pick<StudyAttachment, "path">) => readFile(join(ATTACH_DIR, a.path));

export async function ownChat(db: Db, profileId: string, id: unknown) {
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const [c] = await db.select().from(studyChats).where(and(eq(studyChats.id, id), eq(studyChats.profileId, profileId)));
  return c ?? null;
}

export const chatMessages = (db: Db, chatId: string) => db.select().from(studyChatMessages).where(eq(studyChatMessages.chatId, chatId)).orderBy(asc(studyChatMessages.id));

export async function chatList(db: Db, profileId: string) {
  return db
    .select({ id: studyChats.id, title: studyChats.title, updatedAt: studyChats.updatedAt, pendingSince: studyChats.pendingSince })
    .from(studyChats)
    .where(eq(studyChats.profileId, profileId))
    .orderBy(desc(studyChats.updatedAt))
    .limit(50);
}

export const attachmentIds = (m: Pick<StudyChatMessage, "data">) => {
  const a = (m.data as { attachments?: unknown })?.attachments;
  return Array.isArray(a) ? a.filter((x): x is string => typeof x === "string") : [];
};

export async function attachmentsOf(db: Db, profileId: string, ids: string[]): Promise<StudyAttachment[]> {
  const ok = ids.filter((id) => /^[0-9a-f-]{36}$/.test(id));
  if (!ok.length) return [];
  return db.select().from(studyAttachments).where(and(inArray(studyAttachments.id, ok), eq(studyAttachments.profileId, profileId)));
}

/**
 * O que vai para a IA: o resumo (quando a conversa é longa) e só as mensagens recentes.
 * Anexos já lidos entram como o texto que a IA tirou deles; os novos vão como arquivo (uma vez só).
 */
export async function aiInput(db: Db, profileId: string, summary: string, msgs: StudyChatMessage[]) {
  const recent = msgs.slice(-CHAT_RECENT);
  const ids = recent.flatMap(attachmentIds);
  const files = await attachmentsOf(db, profileId, ids);
  const byId = new Map(files.map((f) => [f.id, f]));
  const fresh: StudyAttachment[] = [];
  const messages: ChatMessage[] = recent.map((m) => {
    const parts = [m.text];
    for (const id of attachmentIds(m)) {
      const f = byId.get(id);
      if (!f) continue;
      if (f.extracted) parts.push(`[Anexo "${f.name}" — o que você leu dele: ${f.extracted}]`);
      else {
        parts.push(`[Anexo "${f.name}" enviado junto]`);
        fresh.push(f);
      }
    }
    return { role: m.role === "assistant" ? "assistant" : "user", text: parts.join("\n") };
  });
  const attachments: (ChatAttachment & { id: string })[] = [];
  for (const f of fresh) {
    try {
      attachments.push({ id: f.id, name: f.name, mime: f.mime, data: (await readAttachment(f)).toString("base64") });
    } catch {
      // o arquivo sumiu da pasta: segue sem ele
    }
  }
  return { summary: msgs.length > CHAT_RECENT ? summary : "", messages, attachments };
}
