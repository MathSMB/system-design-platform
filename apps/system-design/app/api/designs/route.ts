import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { designs } from "@sdp/db";

const noDb = () => NextResponse.json({ error: "Banco fora do ar: rode pnpm db:up." }, { status: 503 });

/** Lista os desenhos. Sem banco, responde db: false para o app salvar no navegador. */
export async function GET() {
  const db = getDb();
  if (!db) return NextResponse.json({ db: false, items: [] });
  const items = await db.select({ id: designs.id, name: designs.name }).from(designs).orderBy(desc(designs.updatedAt)).limit(50);
  return NextResponse.json({ db: true, items });
}

export async function POST(req: Request) {
  const db = getDb();
  if (!db) return noDb();
  const body = await req.json();
  if (typeof body?.name !== "string" || !body.document) {
    return NextResponse.json({ error: "Envie name e document." }, { status: 400 });
  }
  const [row] = await db
    .insert(designs)
    .values({ name: body.name.slice(0, 200), problem: body.problem ?? null, document: body.document })
    .returning({ id: designs.id });
  return NextResponse.json(row, { status: 201 });
}
