import { COMPONENTS } from "./components";
import { CONCEPTS } from "./concepts";
import { CONCURRENCY } from "./concurrency";
import { METRICS, SIM } from "./sim";
import type { GlossaryEntry } from "./types";

export * from "./types";

export const GLOSSARY: GlossaryEntry[] = [...COMPONENTS, ...SIM, ...METRICS, ...CONCEPTS, ...CONCURRENCY];

const BY_ID = new Map(GLOSSARY.map((e) => [e.id, e]));
export const glossaryEntry = (id: string) => BY_ID.get(id);

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Busca por termo, apelido e texto; termo e apelido pesam mais. */
export function searchGlossary(q: string): GlossaryEntry[] {
  const n = norm(q.trim());
  if (!n) return GLOSSARY;
  const scored = GLOSSARY.map((e) => {
    const names = [e.term, ...(e.aliases ?? [])].map(norm);
    let s = 0;
    if (names.some((x) => x === n)) s += 100;
    if (names.some((x) => x.startsWith(n))) s += 40;
    if (names.some((x) => x.includes(n))) s += 20;
    if (norm(e.short).includes(n)) s += 5;
    if (e.body.some((p) => norm(p).includes(n))) s += 1;
    return { e, s };
  }).filter((x) => x.s > 0);
  return scored.sort((a, b) => b.s - a.s).map((x) => x.e);
}

/** Apelidos que viram link no texto das aulas, do mais longo para o mais curto. */
const LINKABLE = GLOSSARY.flatMap((e) =>
  [e.term.replace(/\s*\(.*\)$/, ""), ...(e.aliases ?? [])]
    // palavras curtas e genéricas demais geram link em todo lugar
    .filter((a) => a.length >= 3 && !["banco", "fila", "pico", "lag", "API", "duração", "Usuários", "erros", "escritas", "réplica", "réplicas", "servidor", "servidores", "isolamento", "corrida", "gráfico", "consumidores", "shard"].includes(a))
    .map((alias) => ({ alias, id: e.id })),
).sort((a, b) => b.alias.length - a.alias.length);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const TERM_RE = new RegExp(`(?<![\\p{L}\\d])(${LINKABLE.map((l) => esc(l.alias)).join("|")})(?![\\p{L}\\d])`, "giu");
const ALIAS_ID = new Map(LINKABLE.map((l) => [l.alias.toLowerCase(), l.id]));

export type Piece = string | { text: string; id: string };

/** Quebra um texto em pedaços, marcando a primeira menção de cada termo do glossário. */
export function splitTerms(text: string, seen = new Set<string>()): Piece[] {
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(TERM_RE)) {
    const id = ALIAS_ID.get(m[0].toLowerCase());
    if (!id || seen.has(id)) continue;
    seen.add(id);
    if (m.index! > last) out.push(text.slice(last, m.index));
    out.push({ text: m[0], id });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
