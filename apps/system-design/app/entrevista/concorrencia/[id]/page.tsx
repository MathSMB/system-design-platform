import { notFound } from "next/navigation";
import { RaceInterviewView } from "@/components/interview/RaceInterviewView";
import { RACE_INTERVIEWS, getRaceInterview } from "@sdp/race-sim";

export function generateStaticParams() {
  return RACE_INTERVIEWS.map((c) => ({ id: c.id }));
}

export default async function RaceInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const iv = getRaceInterview(id);
  if (!iv) notFound();
  return <RaceInterviewView key={id} iv={iv} />;
}
