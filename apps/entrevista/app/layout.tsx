import type { Metadata } from "next";
import "@sdp/ui/fonts";
import "./globals.css";
import { AppHeader } from "@sdp/ui";
import { getSession } from "@sdp/auth";

export const metadata: Metadata = {
  title: "Entrevista · System Design Lab",
  description: "Processo seletivo do RH à contratação e treino por stack, com feedback da IA.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // as páginas do app aparecem no menu só para quem entrou
  const logged = await getSession().then(Boolean).catch(() => false);
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <AppHeader current="entrevista" nav={!logged ? [] : [{ href: "/", label: "Início" }, { href: "/processo-seletivo", label: "Processo seletivo" }, { href: "/java", label: "Treino Java" }, { href: "/historico", label: "Histórico" }]} />
        {children}
      </body>
    </html>
  );
}
