import type { Metadata } from "next";
import "@sdp/ui/fonts";
import "./globals.css";
import { AppHeader } from "@sdp/ui";
import { getSession } from "@sdp/auth";

export const metadata: Metadata = {
  title: "Painel · System Design Lab",
  description: "Entrar, perfis, meta do dia e o que aconteceu em cada app.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // sem conta, o Painel é só a tela de entrar
  const logged = await getSession().then(Boolean).catch(() => false);
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <AppHeader current="painel" nav={logged ? [{ href: "/", label: "Visão geral" }, { href: "/conta", label: "Conta e perfis" }, { href: "/eventos", label: "Eventos" }] : []} />
        {children}
      </body>
    </html>
  );
}
