import { Suspense } from "react";
import { Canvas } from "@/components/canvas/Canvas";

export default function CanvasPage() {
  return (
    <Suspense>
      <Canvas />
    </Suspense>
  );
}
