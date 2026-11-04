import type { Metadata } from "next";
import "@sdp/ui/fonts";
import "./globals.css";
import { AppHeader } from "@sdp/ui";
import { GlossaryButton, GlossaryDrawer } from "@/components/glossary/Glossary";

export const metadata: Metadata = {
  title: "System Design Lab",
  description: "Treino de system design: desenhe, simule carga e concorrência, receba avaliação.",
};

const NAV = [
  { href: "/estudo", label: "Estudo", tour: "nav-estudo" },
  { href: "/entrevista", label: "Entrevista técnica", tone: "accent-2" as const },
  { href: "/canvas", label: "Canvas livre" },
  { href: "/concorrencia", label: "Lab. concorrência", tone: "accent-2" as const },
  { href: "/glossario", label: "Glossário" },
  { href: "/bibliografia", label: "Bibliografia" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <AppHeader
          current="system-design"
          nav={NAV}
          extra={
            <GlossaryButton className="flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent">
              <span className="font-semibold uppercase tracking-[0.14em]"><span className="sm:hidden">?</span><span className="hidden sm:inline">Saber mais</span></span>
            </GlossaryButton>
          }
        />
        {children}
        <GlossaryDrawer />
      </body>
    </html>
  );
}
