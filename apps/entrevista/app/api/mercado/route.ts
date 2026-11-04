import { eq } from "drizzle-orm";
import { MARKET_PROFILES, type Level } from "@sdp/hiring";
import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { marketProfiles } from "@sdp/db";

/**
 * Pesquisa de mercado de uma stack e senioridade. Lê do banco; se ainda não
 * estiver lá, grava a pesquisa que veio no código (feita uma vez) e devolve.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = `${url.searchParams.get("stack") ?? "java"}:${url.searchParams.get("level") ?? "pleno"}`;
  const fromCode = MARKET_PROFILES[id];
  const db = getDb();
  if (!db) return fromCode ? NextResponse.json({ db: false, profile: fromCode }) : NextResponse.json({ error: "Pesquisa pendente para esta vaga." }, { status: 404 });
  const [row] = await db.select().from(marketProfiles).where(eq(marketProfiles.id, id));
  if (row) return NextResponse.json({ db: true, profile: row.data });
  if (!fromCode) return NextResponse.json({ error: "Pesquisa pendente para esta vaga." }, { status: 404 });
  await db
    .insert(marketProfiles)
    .values({ id, stack: fromCode.stack, level: fromCode.level as Level, data: fromCode, researchedAt: fromCode.researchedAt })
    .onConflictDoNothing();
  return NextResponse.json({ db: true, profile: fromCode });
}
