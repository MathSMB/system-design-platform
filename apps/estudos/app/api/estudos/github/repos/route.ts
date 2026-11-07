import { NextResponse } from "next/server";
import { getDb } from "@sdp/db";
import { getSession } from "@sdp/auth";
import { GithubError, listRepos, loadToken } from "@/lib/github";

export const runtime = "nodejs";

/** Os repositórios que o token enxerga, para escolher qual ligar. */
export async function GET() {
  const db = getDb();
  const s = await getSession();
  if (!db || !s) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401 });
  const token = await loadToken(db, s.user.id);
  if (!token) return NextResponse.json({ error: "Cole o token do GitHub primeiro." }, { status: 400 });
  try {
    return NextResponse.json({ repos: await listRepos(token) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof GithubError ? e.message : "Não consegui falar com o GitHub." }, { status: 502 });
  }
}
