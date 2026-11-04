import { notFound } from "next/navigation";
import { Suspense } from "react";
import { SdInterviewCanvas } from "@/components/interview/SdInterview";
import { CHALLENGES } from "@/lib/training/challenges";

export function generateStaticParams() {
  return CHALLENGES.map((c) => ({ id: c.id }));
}

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!CHALLENGES.some((c) => c.id === id)) notFound();
  return (
    <Suspense>
      <SdInterviewCanvas key={id} id={id} />
    </Suspense>
  );
}
