/** Gerador pseudoaleatório com semente (mulberry32): o mesmo processo seletivo se repete igual ao recarregar. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Embaralha uma cópia da lista. */
export function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/** Sorteia `n` itens sem repetir, com chance proporcional ao peso. */
export function pickWeighted<T>(items: readonly T[], weight: (t: T) => number, n: number, rand: () => number): T[] {
  const pool = [...items];
  const out: T[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, t) => s + weight(t), 0);
    let r = rand() * total;
    let k = 0;
    for (; k < pool.length - 1; k++) {
      r -= weight(pool[k]!);
      if (r < 0) break;
    }
    out.push(pool.splice(k, 1)[0]!);
  }
  return out;
}
