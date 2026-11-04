import { Database, Flame, Network, Server, Users, type LucideIcon } from "lucide-react";

const NODES: { x: number; label: string; Icon: LucideIcon; color: string; hot?: boolean }[] = [
  { x: 30, label: "USUÁRIOS", Icon: Users, color: "#e6f1ff" },
  { x: 140, label: "LB", Icon: Network, color: "#39ff8f" },
  { x: 250, label: "APP", Icon: Server, color: "#39ff8f" },
  { x: 360, label: "BANCO", Icon: Database, color: "#ff9a3c", hot: true },
];
const Y = 70;
const ARROW = "M -5 -3.5 L 4 0 L -5 3.5 L -2.5 0 Z";

/** Mini diagrama animado da home: requisições andando até o banco, que está pegando fogo. */
export function HeroFlow() {
  return (
    <div className="relative h-[150px] w-[400px] max-w-full">
      <svg viewBox="0 0 400 150" className="absolute inset-0 h-full w-full overflow-visible">
        {NODES.slice(0, -1).map((n, i) => {
          const path = `M ${n.x + 22} ${Y} L ${NODES[i + 1]!.x - 22} ${Y}`;
          const last = i === NODES.length - 2;
          return (
            <g key={n.x}>
              <path d={path} stroke={last ? "var(--bad)" : "rgba(34,228,255,0.5)"} strokeWidth={1.6} strokeDasharray="4 6" className="react-flow__edge-path" />
              {Array.from({ length: 3 }, (_, k) => {
                const red = last && k === 0;
                const color = red ? "var(--down)" : "var(--accent)";
                const begin = `${-k * 0.4}s`;
                return (
                  <path key={k} d={ARROW} fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
                    <animateMotion dur="1.2s" begin={begin} repeatCount="indefinite" rotate="auto" path={path} {...(red ? { keyPoints: "0;0.8", keyTimes: "0;1", calcMode: "linear" } : {})} />
                    {red && <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.7;1" dur="1.2s" begin={begin} repeatCount="indefinite" />}
                  </path>
                );
              })}
            </g>
          );
        })}
      </svg>
      {NODES.map(({ x, label, Icon, color, hot }) => (
        <div key={label} className="absolute flex w-20 -translate-x-1/2 flex-col items-center" style={{ left: `${(x / 400) * 100}%`, top: Y - 22 }}>
          {hot && <Flame size={20} className="flame absolute -top-6" />}
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-lg border-2 bg-[linear-gradient(160deg,#141a2e,#070a12)] ${hot ? "heat" : ""}`}
            style={{ borderColor: color, color, boxShadow: `0 0 12px color-mix(in srgb, ${color} 45%, transparent)` }}
          >
            <Icon size={20} strokeWidth={1.8} />
          </div>
          <div className="mt-1.5 text-[10px] font-semibold tracking-wider text-text">{label}</div>
        </div>
      ))}
    </div>
  );
}
