import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "System Design Lab",
  description: "Treino de system design: desenhe, simule carga e concorrência, receba avaliação.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <header className="flex h-12 items-center gap-6 border-b border-border px-4 text-sm">
          <Link href="/" className="font-hand text-lg text-text">
            system design lab
          </Link>
          <nav className="flex gap-4 text-muted">
            <Link href="/canvas" className="hover:text-text">Canvas de carga</Link>
            <Link href="/concorrencia" className="hover:text-text">Concorrência</Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
