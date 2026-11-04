"use client";

import { AppIntro } from "@sdp/ui";
import { Cpu, Fan, HardDrive, MemoryStick, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";

const DAYS = ["seg", "ter", "qua", "qui", "sex"];
/** Por quadro: resultado de cada dia até ali (true = cumpriu, false = perdeu). */
const RESULTS = [[false], [false, true], [false, true, false], [false, true, false, false], [false, true, false, false, true]];
const PARTS = [
  { Icon: Cpu, label: "CPU" },
  { Icon: MemoryStick, label: "RAM" },
  { Icon: HardDrive, label: "SSD" },
  { Icon: Fan, label: "FAN" },
  { Icon: Zap, label: "PSU" },
  { Icon: Sparkles, label: "RGB" },
];

function Demo({ f }: { f: number }) {
  const days = RESULTS[f]!;
  const installed = f >= 1 ? 1 : 0;
  const worn = f === 3;
  const failovers = f >= 2 ? 0 : 1;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-1.5">
        {DAYS.map((d, i) => {
          const r = days[i];
          return (
            <div key={d} className={`flex flex-1 flex-col items-center rounded-md border py-1 font-mono text-[10px] transition-colors ${r === undefined ? "border-border text-muted" : r ? "border-ok/60 text-ok" : "border-down/60 text-down"}`}>
              <span className="uppercase">{d}</span>
              <span>{r === undefined ? "·" : r ? "✓" : "✗"}</span>
            </div>
          );
        })}
      </div>
      <div
        className={`relative grid flex-1 grid-cols-3 gap-2 rounded-lg border-2 p-3 transition-all duration-500 ${worn ? "border-warn/60 bg-[#1a1608]" : "border-[#2a3a6a] bg-[#0a1230]"}`}
        style={{ backgroundImage: "linear-gradient(90deg, rgba(57,255,143,0.06) 1px, transparent 1px), linear-gradient(rgba(57,255,143,0.06) 1px, transparent 1px)", backgroundSize: "14px 14px" }}
      >
        {PARTS.map(({ Icon, label }, i) => {
          const on = i < installed;
          return (
            <div
              key={label}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-md border transition-all duration-500 ${on ? "border-ok text-ok" : "border-dashed border-[#2a3a6a] text-[#2a3a6a]"} ${on && i === installed - 1 ? "pop-in" : ""}`}
              style={on ? { boxShadow: "0 0 10px rgba(57,255,143,0.35)" } : undefined}
            >
              <Icon size={16} className={on && label === "FAN" ? "animate-spin" : ""} />
              <span className="font-mono text-[8px]">{label}</span>
            </div>
          );
        })}
        {worn && <div className="pop-in absolute inset-x-3 bottom-2 rounded bg-warn/15 px-2 py-0.5 text-center font-mono text-[10px] text-warn">desgaste 1/6: poeira</div>}
      </div>
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="flex items-center gap-1 text-warn">
          <ShieldCheck size={12} /> failovers: {failovers} de 2
        </span>
        <span className="flex items-center gap-1 text-muted">
          <Wrench size={12} /> peças: {installed} de 15
        </span>
      </div>
    </div>
  );
}

export function HabitIntro() {
  return (
    <AppIntro
      id="habito"
      tone="ok"
      name="o Hábito"
      headline={
        <>
          Constância vira <span className="text-ok glow">uma máquina montada</span>, peça por peça.
        </>
      }
      lead="O difícil não é estudar um dia, é estudar todo dia sem perder o fio. O Hábito transforma a sua meta diária numa placa-mãe neon: cada dia cumprido instala uma peça, e dia perdido tem consequência, mas sem jogar tudo fora por um tropeço."
      points={[
        { Icon: Cpu, title: "Progresso que dá para ver", body: "15 peças, do processador ao RGB. Com a placa completa, cada dia vira overclock." },
        { Icon: ShieldCheck, title: "Tropeçar não zera", body: "2 failovers por semana. Sem eles, a máquina se desgasta, e o próximo dia cumprido conserta um nível." },
        { Icon: Zap, title: "Conta sozinho", body: "Respostas avaliadas, etapas do processo seletivo, desenhos de system design e os blocos da Central de estudos entram na meta sem você marcar." },
      ]}
      steps={[
        { title: "Crie o perfil", body: "No Painel: a vaga que você treina e a meta do dia." },
        { title: "Treine nos outros apps", body: "O que conta para a meta é marcado sozinho; o seu estudo livre você marca aqui." },
        { title: "Abra a placa-mãe", body: "A tela anima o que mudou desde a última visita: peça nova, conserto ou desgaste." },
        { title: "Não deixe queimar", body: "No 6º nível de desgaste a máquina queima e a montagem recomeça do zero." },
      ]}
      captions={[
        "Segunda perdida: um failover da semana segura, nada quebra.",
        "Terça cumprida: o processador é instalado.",
        "Quarta perdida: vai o segundo failover. Ainda nada quebra.",
        "Quinta perdida sem failover: a máquina pega poeira (desgaste 1).",
        "Sexta cumprida: conserta o desgaste. A próxima peça vem no dia seguinte.",
      ]}
      demo={(f) => <Demo f={f} />}
    />
  );
}
