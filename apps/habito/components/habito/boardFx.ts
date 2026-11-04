import { PARTS, type PartId } from "@sdp/habit";

/**
 * Efeitos da placa-mãe: peças entrando, faíscas, escudo de failover, desgaste,
 * conserto com a ventoinha voltando aos poucos e o fogo quando a máquina queima.
 * Tudo mexe direto no SVG gerado por board.ts.
 */

const NS = "http://www.w3.org/2000/svg";

/** Centro de cada peça (para os efeitos). */
export const PART_AT: Record<PartId, [number, number]> = {
  cpu: [310, 210], ram: [482, 220], power: [576, 225], ssd: [320, 351], pump: [310, 210], radiator: [735, 310], vrm: [300, 75],
  chipset: [530, 450], io: [88, 165], wifi: [24, 120], audio: [120, 345], debug: [580, 78], gpu: [255, 475], cmos: [545, 548], rgb: [330, 310],
};
/** Onde cada nível de desgaste aparece. */
export const WEAR_AT: [number, number][] = [[256, 470], [735, 300], [316, 100], [468, 386], [395, 286], [300, 70]];
export const WEAR_HIT = ["engasgou", "superaquecendo", "curto-circuito!", "cabo rompeu!", "vazamento!", "fora do ar"];
const FAN_AT: Record<string, [number, number]> = { gpu1: [142, 477], gpu2: [256, 477], gpu3: [370, 477], rad1: [735, 150], rad2: [735, 310], rad3: [735, 470], ssd: [410, 351], chip: [531, 451] };
const FAN_PART: Record<string, PartId> = { gpu1: "gpu", gpu2: "gpu", gpu3: "gpu", rad1: "radiator", rad2: "radiator", rad3: "radiator", ssd: "ssd", chip: "chipset" };
/** Ventoinhas que param ou engasgam em cada nível (e voltam no conserto). */
export const LEVEL_FANS: Record<number, string[]> = { 1: ["gpu2"], 2: ["ssd", "rad2", "chip"], 3: ["rad1"], 4: ["gpu1", "gpu2", "gpu3"], 5: ["rad3"] };
const TEMP = [34, 41, 63, 72, 78, 91, 99];
const POST = ["A0", "A0", "9A", "55", "d6", "00", "FF"];

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class BoardFx {
  private timers: number[] = [];
  private tick = 0;
  constructor(private svg: SVGSVGElement) {}

  private later(ms: number, f: () => void) {
    this.timers.push(window.setTimeout(f, ms));
  }
  private el(tag: string, attrs: Record<string, string | number>, parent?: Element) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, String(attrs[k]));
    parent?.appendChild(e);
    return e;
  }
  private fxAt(x: number, y: number) {
    return this.el("g", { class: "fx", transform: `translate(${x} ${y})` }, this.svg.querySelector(".fxlayer")!);
  }
  private q<T extends Element = SVGElement>(sel: string) {
    return this.svg.querySelector<T & SVGElement>(sel);
  }

  dispose() {
    this.timers.forEach(clearTimeout);
    window.clearInterval(this.tick);
  }

  label(x: number, y: number, text: string, color: string) {
    const g = this.fxAt(x, y);
    const t = this.el("text", { class: "t-label", y: -6, fill: color }, g);
    t.textContent = text;
    this.later(1800, () => g.remove());
  }
  sparks(x: number, y: number, color = "#fff6a8", n = 12, len = 28) {
    const g = this.fxAt(x, y);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + rand(0, 0.4);
      this.el("line", { class: "spark", x1: Math.cos(a) * 4, y1: Math.sin(a) * 4, x2: Math.cos(a) * len * rand(0.5, 1), y2: Math.sin(a) * len * rand(0.5, 1), style: `stroke:${color}` }, g);
    }
    this.later(900, () => g.remove());
  }
  pulse(x: number, y: number, color: string, r = 40, times = 3) {
    const g = this.fxAt(x, y);
    for (let i = 0; i < times; i++) this.el("circle", { class: "pulse", r, stroke: color, style: `animation-delay:${i * 0.25}s` }, g);
    this.later(2000, () => g.remove());
  }
  repair(x: number, y: number) {
    const g = this.fxAt(x, y);
    this.el("path", { d: "M-10 10 L4 -4 M4 -4 a7 7 0 1 1 6 -6 l-5 1 l-1 5z", fill: "none", stroke: "#39ff8f", "stroke-width": 3, "stroke-linecap": "round", style: "filter:drop-shadow(0 0 4px #39ff8f)" }, g);
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI * 2 * i) / 10;
      this.el("line", { class: "repair", x1: Math.cos(a) * 14, y1: Math.sin(a) * 14, x2: Math.cos(a) * 30, y2: Math.sin(a) * 30 }, g);
    }
    this.later(1100, () => g.remove());
  }
  fire(x: number, y: number) {
    const g = this.fxAt(x, y);
    g.setAttribute("data-fire", "1");
    this.el("path", { class: "flame", fill: "#ff3b1f", d: "M-18 8 C-24 -10 -10 -18 -8 -36 C0 -24 8 -28 10 -44 C18 -26 24 -12 18 8 Z" }, g);
    this.el("path", { class: "flame f2", fill: "#ff9a1f", d: "M-12 8 C-16 -5 -5 -13 -3 -26 C4 -16 8 -18 9 -29 C14 -16 16 -5 12 8 Z" }, g);
    this.el("path", { class: "flame f3", fill: "#ffe45a", d: "M-5 8 C-8 0 -3 -5 0 -16 C4 -7 7 -4 5 8 Z" }, g);
    for (let i = 0; i < 6; i++) this.el("circle", { class: "smoke", cx: -8 + i * 3, cy: -34, r: 6, style: `animation-delay:${i * 0.37}s` }, g);
    return g;
  }

  /** Mostra as primeiras `n` peças (sem animação) e acende as trilhas entre elas. */
  setParts(n: number) {
    const have = new Set(PARTS.slice(0, n).map((p) => p.id as string));
    this.svg.querySelectorAll<SVGElement>(".comp").forEach((c) => c.classList.toggle("in", have.has(c.dataset.id!)));
    this.svg.querySelectorAll<SVGElement>(".slot").forEach((s) => s.classList.toggle("gone", have.has(s.dataset.s!) || (s.dataset.s === "cpu" && have.has("pump"))));
    this.svg.querySelectorAll<SVGElement>(".flow").forEach((f) => f.classList.toggle("lit", have.has(f.dataset.a!) && have.has(f.dataset.b!)));
  }

  /** Peça nova caindo na placa, com faísca. */
  install(index: number) {
    const p = PARTS[index]!;
    this.setParts(index + 1);
    const c = this.q(`.comp[data-id="${p.id}"]`)!;
    c.classList.add("drop");
    this.later(1000, () => c.classList.remove("drop"));
    const [x, y] = PART_AT[p.id];
    this.sparks(x, y);
    this.label(x, y - 28, `+ ${p.name}`, "#fff6a8");
  }

  /** Overclock deixa as ventoinhas mais rápidas. */
  setOverclock(oc: number) {
    this.svg.style.setProperty("--fan", `${Math.max(0.3, 1.1 - oc * 0.03).toFixed(2)}s`);
  }

  /** Aplica o nível de desgaste: classes d1..d6, telas, gotas e o pisca dos choques. */
  setWear(level: number, parts: number) {
    for (let i = 1; i <= 6; i++) this.svg.classList.toggle(`d${i}`, level >= i);
    const t = this.q('[data-lcd="t"]'), r = this.q('[data-lcd="r"]'), post = this.q("[data-post]");
    if (t) {
      t.textContent = `${TEMP[level]}°`;
      t.style.fill = level >= 4 ? "#ff4d6d" : level >= 2 ? "#ffb020" : "";
      t.classList.toggle("lcdglitch", level >= 5);
    }
    if (r) r.textContent = level >= 6 ? "PUMP 0 RPM" : level >= 5 ? "PUMP 900 RPM" : level >= 2 ? "PUMP 3600 RPM" : "PUMP 2800 RPM";
    if (post) post.textContent = parts < PARTS.length && level < 2 ? (0xb0 + parts).toString(16).toUpperCase() : POST[level]!;
    const red = [level >= 5, level >= 3, level >= 4, false];
    this.svg.querySelectorAll<SVGElement>('[data-id="debug"] circle').forEach((c, i) => {
      c.setAttribute("fill", red[i] ? "#ff4d6d" : i === 3 && level < 3 ? "#39ff8f" : "#2a1a1f");
      c.style.filter = red[i] ? "drop-shadow(0 0 3px #ff4d6d)" : "";
    });
    const drips = this.q(".drips")!;
    drips.innerHTML = "";
    if (level >= 5)
      ([[384, 248, 0], [390, 252, 0.4], [380, 250, 0.75]] as const).forEach(([x, y, d]) => this.el("circle", { class: "drip", cx: x, cy: y, r: 2.6, style: `animation-delay:${d}s` }, drips));
    this.svg.querySelectorAll("[data-fire]").forEach((f) => f.remove());
    if (level >= 6) this.fire(300, 70);

    // choques nas bobinas e no cabo EPS; faíscas no cabo rompido e glitch na imagem da placa de vídeo
    window.clearInterval(this.tick);
    const arcs = this.q(".arcs")!, glitch = this.q(".glitch")!;
    arcs.innerHTML = "";
    glitch.innerHTML = "";
    if (level < 3) return;
    const zig = (x1: number, y1: number, x2: number, y2: number, n = 7, amp = 6) => {
      let d = `M${x1} ${y1}`;
      for (let i = 1; i < n; i++) d += ` L${(x1 + ((x2 - x1) * i) / n + rand(-amp, amp)).toFixed(1)} ${(y1 + ((y2 - y1) * i) / n + rand(-amp, amp)).toFixed(1)}`;
      return `${d} L${x2} ${y2}`;
    };
    const have = new Set(PARTS.slice(0, parts).map((p) => p.id as string));
    this.tick = window.setInterval(() => {
      arcs.innerHTML = "";
      glitch.innerHTML = "";
      if (have.has("vrm") && Math.random() < 0.7) {
        const k = Math.floor(rand(0, 9));
        this.el("path", { d: zig(223 + k * 20, 105, 243 + k * 20, 105, 6, 7) }, arcs);
      }
      if (have.has("vrm") && Math.random() < 0.5) {
        const k = Math.floor(rand(0, 8));
        this.el("path", { d: zig(197, 123 + k * 20, 197, 143 + k * 20, 6, 6) }, arcs);
      }
      if (have.has("power") && Math.random() < 0.45) this.el("path", { d: zig(156, 40, 186, 22, 6, 6) }, arcs);
      if (have.has("power") && Math.random() < 0.12) this.sparks(rand(150, 190), rand(20, 40), "#c9f3ff", 6, 14);
      if (level >= 4 && have.has("gpu")) {
        if (Math.random() < 0.35) this.sparks(468, 390, "#ffd24d", 8, 18);
        if (Math.random() < 0.6)
          for (let i = 0; i < 5; i++) {
            const gx = rand(64, 400);
            this.el("rect", { x: gx.toFixed(0), y: rand(412, 540).toFixed(0), width: Math.min(rand(20, 120), 448 - gx).toFixed(0), height: rand(2, 6).toFixed(1), fill: ["#ff4dd8", "#39ff8f", "#3fe0ff", "#ffd24d"][i % 4]!, opacity: 0.55 }, glitch);
          }
      }
    }, 120);
  }

  /** Ventoinha volta aos poucos: devagar, normal, um pico mais forte e estabiliza; uma depois da outra. */
  spinUp(level: number, parts: number) {
    const have = new Set(PARTS.slice(0, parts).map((p) => p.id as string));
    (LEVEL_FANS[level] ?? [])
      .filter((id) => have.has(FAN_PART[id]!))
      .forEach((id, k) =>
        this.later(k * 900, () => {
          const f = this.q(`[data-fan="${id}"]`);
          if (!f) return;
          const [x, y] = FAN_AT[id]!;
          this.pulse(x, y, "#39ff8f", 30, 1);
          const steps: [number, string][] = [[0, "5s"], [1200, "2.4s"], [2400, "1.1s"], [3400, ".35s"], [5000, ""]];
          steps.forEach(([ms, d]) => this.later(ms, () => (f.style.animationDuration = d)));
        }),
      );
  }

  /** A máquina queimou: fogo, e as peças saem uma a uma. */
  burn(parts: number, done: () => void) {
    this.setWear(6, parts);
    this.later(2400, () => {
      this.svg.querySelectorAll("[data-fire]").forEach((f) => f.remove());
      const ids = PARTS.slice(0, parts).map((p) => p.id).reverse();
      ids.forEach((id, k) => this.later(k * 110, () => this.q(`.comp[data-id="${id}"]`)?.classList.add("out")));
      this.later(ids.length * 110 + 700, () => {
        this.svg.querySelectorAll(".comp").forEach((c) => c.classList.remove("out"));
        done();
      });
    });
  }

  /** Marca de queimado que fica na placa depois de cada recomeço. */
  scorches(n: number) {
    const g = this.q(".scorches")!;
    g.innerHTML = "";
    for (let i = 0; i < Math.min(n, 4); i++) this.el("ellipse", { class: "scorch", cx: 306 + i * 14, cy: 78 + i * 6, rx: 36, ry: 18 }, g);
  }
}
