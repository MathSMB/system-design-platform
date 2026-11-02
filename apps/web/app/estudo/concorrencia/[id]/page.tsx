import { notFound } from "next/navigation";
import { GuidedRace } from "@/components/race/GuidedRace";
import { RACE_LESSONS, getRaceLesson } from "@/lib/concurrency/lessons";

export function generateStaticParams() {
  return RACE_LESSONS.map((l) => ({ id: l.id }));
}

export default async function RaceLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lesson = getRaceLesson(id);
  if (!lesson) notFound();
  return <GuidedRace key={id} lesson={lesson} />;
}
