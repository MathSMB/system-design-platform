import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { interviewRuns } from "@/lib/db/schema";
import { getSession } from "@/lib/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cut = (x: unknown, n: number) => (x == null ? null : String(x).slice(0, n));

/** Uma entrevista do histórico, com todas as respostas. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db) return NextResponse.json({ error: "DATABASE_URL não configurada." }, { status: 503 });
  if (!UUID.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const [row] = await db.select().from(interviewRuns).where(eq(interviewRuns.id, id));
  return row ? NextResponse.json(row) : NextResponse.json({ error: "não encontrada" }, { status: 404 });
}

/** Salva (ou atualiza) uma entrevista terminada. O id vem do navegador, então salvar de novo não duplica. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  if (!db) return NextResponse.json({ db: false }, { status: 200 });
  if (!UUID.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const b = await req.json();
  if (!b?.state || typeof b.title !== "string") return NextResponse.json({ error: "Envie title e state." }, { status: 400 });
  const session = await getSession();
  const values = {
    userId: session?.user.id ?? null,
    profileId: session?.profile?.id ?? null,
    kind: b.kind === "treino" ? "treino" : "processo",
    stack: cut(b.stack, 40) ?? "java",
    level: cut(b.level, 20) ?? "pleno",
    company: cut(b.company, 60),
    title: b.title.slice(0, 200),
    outcome: cut(b.outcome, 500),
    levelShown: cut(b.levelShown, 30),
    score: Number.isFinite(Number(b.score)) ? Number(b.score) : null,
    state: b.state,
    feedback: b.feedback ?? null,
    updatedAt: new Date(),
  };
  // dois salvamentos podem chegar fora de ordem: o que vem sem feedback não apaga o que já tem
  await db
    .insert(interviewRuns)
    .values({ id, ...values })
    .onConflictDoUpdate({ target: interviewRuns.id, set: { ...values, feedback: sql`coalesce(excluded.feedback, ${interviewRuns.feedback})` } });
  return NextResponse.json({ db: true, id });
}
