"use client";

import { useRouter } from "next/navigation";
import { Dices } from "lucide-react";

/** Botão que sorteia um item da lista. */
export function RandomButton({ hrefs, label }: { hrefs: string[]; label: string }) {
  const router = useRouter();
  return (
    <button onClick={() => router.push(hrefs[Math.floor(Math.random() * hrefs.length)]!)} className="btn-neon flex items-center gap-2 px-4 py-2 text-xs">
      <Dices size={14} /> {label}
    </button>
  );
}
