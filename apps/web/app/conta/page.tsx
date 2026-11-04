import { UserRound } from "lucide-react";
import { Account } from "@/components/conta/Account";

export const metadata = { title: "Conta · System Design Lab" };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center gap-2 hud-label !text-ok">
        <UserRound size={14} /> Conta
      </div>
      <h1 className="mt-3 font-display text-xl leading-relaxed">
        Seus <span className="text-ok glow">perfis.</span>
      </h1>
      <p className="mt-3 mb-6 text-muted">A plataforma continua aberta sem conta. Com conta, cada perfil (a vaga que você treina) tem a sua máquina de hábito (a placa-mãe), a sua meta diária e o seu histórico.</p>
      <Account />
    </main>
  );
}
