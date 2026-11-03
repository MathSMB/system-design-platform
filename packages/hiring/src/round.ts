import { BLOCKS, JAVA_PLENO } from "./java-pleno";
import { pickWeighted, rng } from "./rng";
import type { JavaQuestion } from "./types";

const weightOf = (q: JavaQuestion) => {
  const b = BLOCKS.find((x) => x.id === q.block)!;
  // divide pelo número de perguntas do bloco: o peso é do bloco, não de cada pergunta
  return b.weight / JAVA_PLENO.filter((x) => x.block === q.block).length;
};

/**
 * Sorteia as perguntas de uma entrevista técnica pelos pesos do guia.
 * Sempre tem pelo menos uma de Java core e uma de Spring Boot, como em toda entrevista real.
 */
export function drawInterview(seed: number, n = 8): JavaQuestion[] {
  const rand = rng(seed);
  const java = pickWeighted(JAVA_PLENO.filter((q) => q.block === "java"), () => 1, 1, rand);
  const spring = pickWeighted(JAVA_PLENO.filter((q) => q.block === "spring"), () => 1, 1, rand);
  const rest = pickWeighted(JAVA_PLENO.filter((q) => q !== java[0] && q !== spring[0]), weightOf, n - 2, rand);
  // na ordem dos blocos, do básico ao operacional
  const order = BLOCKS.map((b) => b.id);
  return [...java, ...spring, ...rest].sort((a, b) => order.indexOf(a.block) - order.indexOf(b.block));
}

export interface LevelEstimate {
  level: "abaixo de júnior" | "júnior" | "pleno" | "pleno forte";
  text: string;
}

/** Nível que as respostas demonstram, pela fração de pontos (resposta de pleno vale 2, de livro 1). */
export function estimateLevel(fraction: number): LevelEstimate {
  if (fraction >= 0.85) return { level: "pleno forte", text: "Respostas com mecanismo e trade-off na maior parte: pleno sólido, com base para mirar sênior." };
  if (fraction >= 0.6) return { level: "pleno", text: "Nível de pleno: explica o porquê na maioria das perguntas, com alguns pontos rasos." };
  if (fraction >= 0.4) return { level: "júnior", text: "Conhece as definições, mas falta explicar o mecanismo e dar exemplos: o entrevistador leria como júnior." };
  return { level: "abaixo de júnior", text: "Muitas respostas erradas: vale voltar ao guia antes de novas entrevistas." };
}
