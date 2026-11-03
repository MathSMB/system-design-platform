import { UserRound } from "lucide-react";
import { AreaPicker, areaCards } from "@/components/home/AreaPicker";
import { RACE_INTERVIEWS } from "@/lib/concurrency/interviews";
import { CHALLENGES } from "@/lib/training/challenges";
import { JAVA_PLENO } from "@sdp/hiring";

export default function Entrevista() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-accent-2">
        <UserRound size={14} /> Entrevista técnica
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Qual <span className="text-accent-2 glow">entrevista?</span>
      </h1>
      <AreaPicker areas={areaCards("entrevista", { sd: CHALLENGES.length, race: RACE_INTERVIEWS.length, java: JAVA_PLENO.length })} />
    </main>
  );
}
