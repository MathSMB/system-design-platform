import { redirect } from "next/navigation";

/** Endereço antigo de uma aula. */
export default async function OldCase({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/estudo/system-design/${id}`);
}
