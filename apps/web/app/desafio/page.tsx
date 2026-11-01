import { Suspense } from "react";
import { ChallengeCanvas } from "@/components/training/ChallengeCanvas";

export default function DesafioPage() {
  return (
    <Suspense>
      <ChallengeCanvas />
    </Suspense>
  );
}
