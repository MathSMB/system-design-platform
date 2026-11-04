import type { Metadata } from "next";
import "@sdp/ui/fonts";
import "./globals.css";
import { AppHeader } from "@sdp/ui";

export const metadata: Metadata = {
  title: "Hábito · System Design Lab",
  description: "A placa-mãe neon do seu hábito de estudo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <AppHeader current="habito" />
        {children}
      </body>
    </html>
  );
}
