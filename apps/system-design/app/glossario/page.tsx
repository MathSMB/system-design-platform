import { BookA } from "lucide-react";
import { EntryList } from "@/components/glossary/Glossary";
import { GLOSSARY } from "@/lib/glossary";

export const metadata = { title: "Glossário · System Design Lab" };

export default function Glossario() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label">
        <BookA size={14} /> Glossário
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        O que é <span className="text-accent glow">cada coisa</span>
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        {GLOSSARY.length} termos explicados do zero: o que é, exemplo real, como falar na entrevista e como o simulador representa. Nas aulas, os
        termos sublinhados abrem a explicação sem sair da tela; o botão Saber mais, no topo, abre esta lista de qualquer lugar.
      </p>
      <div className="mt-8">
        <EntryList inPage />
      </div>
    </main>
  );
}
