import type { Metadata } from "next";
import "@sdp/ui/fonts";
import "./globals.css";
import { AppHeader } from "@sdp/ui";

export const metadata: Metadata = {
  title: "Entrevista · System Design Lab",
  description: "Processo seletivo do RH à contratação e treino por stack, com feedback da IA.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <AppHeader current="entrevista" nav={[{ href: "/", label: "Início" }, { href: "/processo-seletivo", label: "Processo seletivo" }, { href: "/java", label: "Treino Java" }, { href: "/historico", label: "Histórico" }]} />
        {children}
      </body>
    </html>
  );
}
