import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { designs } from "@/lib/db/schema";

const noDb = () => NextResponse.json({ error: "DATABASE_URL não configurada." }, { status: 503 });

export async function GET() {
  const db = getDb();
  if (!db) return noDb();
  const rows = await db.select({ id: designs.id, name: designs.name }).from(designs).orderBy(desc(designs.updatedAt)).limit(50);
  return NextResponse.json(rows);
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
