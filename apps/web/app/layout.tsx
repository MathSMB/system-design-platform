import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/press-start-2p/400.css";
import "@fontsource/chakra-petch/400.css";
import "@fontsource/chakra-petch/500.css";
import "@fontsource/chakra-petch/600.css";
import "@fontsource/chakra-petch/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";
import "./globals.css";
import { GlossaryButton, GlossaryDrawer } from "@/components/glossary/Glossary";

export const metadata: Metadata = {
  title: "System Design Lab",
  description: "Treino de system design: desenhe, simule carga e concorrência, receba avaliação.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <header className="relative flex h-12 items-center gap-8 border-b border-border bg-bg/80 px-4 backdrop-blur">
          <Link href="/" className="flex items-center gap-2 font-display text-[11px] text-accent glow">
            <span className="text-accent-2">&gt;</span>
            SYSTEM_DESIGN_LAB
            <span className="cursor-blink">_</span>
          </Link>
          <nav className="flex gap-5 text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            <Link href="/estudo" className="transition-colors hover:text-accent" data-tour="nav-estudo">Estudo</Link>
            <Link href="/entrevista" className="transition-colors hover:text-accent-2">Entrevista</Link>
            <Link href="/processo-seletivo" className="transition-colors hover:text-accent">Processo seletivo</Link>
            <Link href="/canvas" className="transition-colors hover:text-accent">Canvas livre</Link>
            <Link href="/concorrencia" className="transition-colors hover:text-accent-2">Lab. concorrência</Link>
            <Link href="/glossario" className="transition-colors hover:text-accent">Glossário</Link>
            <Link href="/bibliografia" className="transition-colors hover:text-accent">Bibliografia</Link>
          </nav>
          <GlossaryButton className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted transition-colors hover:border-accent hover:text-accent">
            <span className="font-semibold uppercase tracking-[0.14em]">Saber mais</span>
          </GlossaryButton>
          {/* linha neon sob o cabeçalho */}
          <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-[linear-gradient(90deg,transparent,var(--accent)_30%,var(--accent-2)_70%,transparent)] opacity-60" />
        </header>
        {children}
        <GlossaryDrawer />
      </body>
    </html>
  );
}
