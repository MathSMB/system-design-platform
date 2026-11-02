import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CaseCanvas } from "@/components/training/CaseCanvas";
import { CASES, getCase } from "@/lib/training/cases";

export function generateStaticParams() {
  return CASES.map((c) => ({ id: c.id }));
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!getCase(id)) notFound();
  return (
    <Suspense>
      <CaseCanvas id={id} />
    </Suspense>
  );
}
