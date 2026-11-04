import type { Metadata } from "next";
import "@sdp/ui/fonts";
import "./globals.css";
import { AppHeader } from "@sdp/ui";

export const metadata: Metadata = {
  title: "Central de estudos · System Design Lab",
  description: "Do anúncio da vaga à meta de hoje: pesquisa, trilhas, projetos e cronograma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <AppHeader current="estudos" />
        {children}
      </body>
    </html>
  );
}
