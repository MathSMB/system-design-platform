import { redirect } from "next/navigation";

/** Endereço antigo: o desafio sorteado virou Entrevista técnica. */
export default async function Desafio({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  redirect(c ? `/entrevista/system-design/${c}` : "/entrevista/system-design");
}
