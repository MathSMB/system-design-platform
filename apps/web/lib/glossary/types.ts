import type { Ref } from "@/lib/training/types";

export type GlossaryCategory = "Componentes" | "Ajustes do simulador" | "Métricas e gráfico" | "Escala e desempenho" | "Resiliência" | "Dados e consistência" | "Concorrência";

export const CATEGORIES: GlossaryCategory[] = [
  "Componentes",
  "Ajustes do simulador",
  "Métricas e gráfico",
  "Escala e desempenho",
  "Resiliência",
  "Dados e consistência",
  "Concorrência",
];

export interface GlossaryEntry {
  id: string;
  term: string;
  /** Outras formas de escrever o termo; usadas na busca e para criar links no texto das aulas. */
  aliases?: string[];
  category: GlossaryCategory;
  /** Uma ou duas frases: o que é. */
  short: string;
  /** Explicação em parágrafos. */
  body: string[];
  /** Exemplo do mundo real. */
  example?: string;
  /** Como isso aparece numa entrevista. */
  interview?: string;
  /** Como o simulador desta plataforma representa isso (e o que ele simplifica). */
  sim?: string;
  related?: string[];
  refs?: Ref[];
}
