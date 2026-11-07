import type { Metadata } from "next";
import "@sdp/ui/fonts";
import "./globals.css";
import { AppHeader } from "@sdp/ui";

export const metadata: Metadata = {
  title: "Pair Programming · System Design Lab",
  description: "Um mentor de IA que programa do seu lado: ambiente, Git e código linha por linha, um passo de cada vez.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <AppHeader current="pair" />
        {children}
      </body>
    </html>
  );
}
