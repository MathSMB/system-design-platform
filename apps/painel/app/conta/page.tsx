import { LogIn, UserRound } from "lucide-react";
import { getSession } from "@sdp/auth";
import { Account } from "@sdp/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conta · System Design Lab" };

export default async function Page() {
  const logged = await getSession().then(Boolean).catch(() => false);
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      {logged ? (
        <>
          <div className="flex items-center gap-2 hud-label !text-ok">
            <UserRound size={14} /> Conta
          </div>
          <h1 className="mt-3 font-display text-xl leading-relaxed">
            Seus <span className="text-ok glow">perfis.</span>
          </h1>
          <p className="mt-3 mb-6 text-muted">Cada perfil (a vaga que você treina) tem a sua máquina de hábito (a placa-mãe), a sua meta diária e o seu histórico.</p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 hud-label !text-ok">
            <LogIn size={14} /> Entrar
          </div>
          <h1 className="mt-3 font-display text-xl leading-relaxed">
            Entre na sua <span className="text-ok glow">conta.</span>
          </h1>
          <p className="mt-3 mb-6 text-muted">Uma conta só para os quatro apps: System Design, Entrevista, Estudos e Hábito.</p>
        </>
      )}
      <Account />
    </main>
  );
}
