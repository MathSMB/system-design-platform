"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import { Canvas } from "@/components/canvas/Canvas";
import { useCanvas } from "@/components/canvas/store";
import { CHALLENGES, randomChallenge } from "@/lib/training/challenges";
import { ChallengePanel, challengeGraph } from "./ChallengePanel";

export function ChallengeCanvas() {
  const params = useSearchParams();
  const router = useRouter();
  const c = CHALLENGES.find((x) => x.id === params.get("c"));

  // sem desafio na URL: sorteia e grava na URL (recarregar mantém o mesmo)
  useEffect(() => {
    if (!c) router.replace(`/desafio?c=${randomChallenge().id}`);
  }, [c, router]);

  const setup = useCallback(() => {
    if (c) useCanvas.getState().loadGraph(challengeGraph(c));
  }, [c]);

  if (!c) return <div className="p-6 font-mono text-sm text-accent">Sorteando<span className="cursor-blink">_</span></div>;
  return <Canvas coach={<ChallengePanel c={c} onReroll={() => router.replace(`/desafio?c=${randomChallenge(c.id).id}`)} />} setup={setup} />;
}
