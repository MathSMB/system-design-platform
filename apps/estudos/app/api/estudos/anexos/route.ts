import { randomUUID } from "node:crypto";
import { ATTACH_MAX_BYTES, ATTACH_MAX_PER_MESSAGE, ATTACH_TYPES } from "@sdp/study";
import { NextResponse } from "next/server";
import { getDb, studyAttachments } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { attachmentsOf, readAttachment, saveFile } from "@/lib/chat";

export const runtime = "nodejs";

/** Recebe prints e PDFs (campo "file", até 3) e guarda na pasta local de anexos. */
export async function POST(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return NextResponse.json({ error: "Entre na sua conta e escolha um perfil." }, { status: 401 });
  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("file") ?? []).filter((f): f is File => typeof f === "object" && "arrayBuffer" in f);
  if (!files.length) return NextResponse.json({ error: "Nenhum arquivo." }, { status: 400 });
  if (files.length > ATTACH_MAX_PER_MESSAGE) return NextResponse.json({ error: `No máximo ${ATTACH_MAX_PER_MESSAGE} arquivos por mensagem.` }, { status: 400 });
  const out = [];
  for (const f of files) {
    const ext = ATTACH_TYPES[f.type];
    if (!ext) return NextResponse.json({ error: `"${f.name}": só imagens (PNG, JPG, GIF, WebP) e PDF.` }, { status: 400 });
    if (f.size > ATTACH_MAX_BYTES) return NextResponse.json({ error: `"${f.name}" passa de 5 MB.` }, { status: 400 });
    const id = randomUUID();
    const path = `${s.profile.id}/${id}.${ext}`;
    await saveFile(path, Buffer.from(await f.arrayBuffer()));
    const name = (f.name || `anexo.${ext}`).slice(0, 120);
    await db.insert(studyAttachments).values({ id, profileId: s.profile.id, name, mime: f.type, size: f.size, path });
    out.push({ id, name, mime: f.type, size: f.size });
  }
  return NextResponse.json({ attachments: out });
}

/** O arquivo de um anexo (?id=), para a miniatura e para abrir. */
export async function GET(req: Request) {
  const db = getDb();
  const s = await getSession();
  if (!db || !s?.profile) return new NextResponse("Entre na sua conta.", { status: 401 });
  const [a] = await attachmentsOf(db, s.profile.id, [new URL(req.url).searchParams.get("id") ?? ""]);
  if (!a) return new NextResponse("Anexo não encontrado.", { status: 404 });
  try {
    const bytes = await readAttachment(a);
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "content-type": a.mime, "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(a.name)}`, "cache-control": "private, max-age=86400" },
    });
  } catch {
    return new NextResponse("O arquivo não está mais na pasta de anexos.", { status: 410 });
  }
}
