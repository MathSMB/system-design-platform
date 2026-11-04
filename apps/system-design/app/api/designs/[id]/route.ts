import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { designs } from "@sdp/db";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const db = getDb();
  if (!db) return NextResponse.json({ error: "Banco fora do ar: rode pnpm db:up." }, { status: 503 });
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "id inválido" }, { status: 400 });
  const [row] = await db.select().from(designs).where(eq(designs.id, id));
  return row ? NextResponse.json(row) : NextResponse.json({ error: "não encontrado" }, { status: 404 });
}
