import { GraduationCap } from "lucide-react";
import { AreaPicker, areaCards } from "@/components/home/AreaPicker";
import { RACE_LESSONS } from "@/lib/concurrency/lessons";
import { CASES } from "@/lib/training/cases";

export default function Estudo() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label">
        <GraduationCap size={14} /> Estudo
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        O que vamos <span className="text-accent glow">estudar?</span>
      </h1>
      <AreaPicker areas={areaCards("estudo", { sd: CASES.length, race: RACE_LESSONS.length })} />
    </main>
  );
}
