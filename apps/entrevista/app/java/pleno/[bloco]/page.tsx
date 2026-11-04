import { notFound } from "next/navigation";
import { Coffee } from "lucide-react";
import { BLOCKS, getBlock, questionsOf, type BlockId } from "@sdp/hiring";
import { JavaSession } from "@/components/java/JavaSession";

export function generateStaticParams() {
  return [...BLOCKS.map((b) => ({ bloco: b.id })), { bloco: "completa" }];
}

export default async function JavaBlock({ params }: { params: Promise<{ bloco: string }> }) {
  const { bloco } = await params;
  const full = bloco === "completa";
  const block = getBlock(bloco);
  if (!full && !block) notFound();
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center gap-2 hud-label !text-accent-2">
        <Coffee size={14} /> Java Pleno · {full ? "Entrevista completa" : block!.title}
      </div>
      <div className="mt-5">
        <JavaSession key={bloco} full={full} ids={full ? undefined : questionsOf(bloco as BlockId).map((q) => q.id)} />
      </div>
    </main>
  );
}
