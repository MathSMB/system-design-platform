import type { ServiceDistribution } from "./types";

/** Gerador pseudoaleatório determinístico (mulberry32): mesma seed, mesmo resultado. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleExponential(rng: () => number, mean: number): number {
  return -Math.log(1 - rng()) * mean;
}

function sampleStandardNormal(rng: () => number): number {
  // Box-Muller
  const u = 1 - rng();
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Lognormal parametrizada pela média e pelo coeficiente de variação. */
export function sampleLognormal(rng: () => number, mean: number, cv: number): number {
  const sigma2 = Math.log(1 + cv * cv);
  const mu = Math.log(mean) - sigma2 / 2;
  return Math.exp(mu + Math.sqrt(sigma2) * sampleStandardNormal(rng));
}

export function sampleService(
  rng: () => number,
  mean: number,
  dist: ServiceDistribution = "lognormal",
  cv = 1,
): number {
  if (dist === "constant") return mean;
  if (dist === "exponential") return sampleExponential(rng, mean);
  return sampleLognormal(rng, mean, cv);
}
