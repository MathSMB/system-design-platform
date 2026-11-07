/**
 * A placa-mãe do hábito, desenhada como uma string SVG (vista de cima).
 * Cada peça é um <g class="comp" data-id="..."> escondido; a tela mostra as instaladas
 * e liga os efeitos de desgaste com as classes d1..d6 no <svg>. Estilos em globals.css (.mobo).
 */

interface FanOpts {
  blades?: number;
  pink?: boolean;
  frame?: boolean;
  ring?: boolean;
  slow?: boolean;
  id?: string;
}

function fan(cx: number, cy: number, r: number, o: FanOpts = {}) {
  const n = o.blades || 9, cls = o.pink ? "blade p" : "blade";
  let b = "";
  for (let i = 0; i < n; i++) {
    const a = (360 / n) * i;
    b += `<path class="${cls}" transform="rotate(${a} ${cx} ${cy})" d="M${cx - r * .12} ${cy - r * .25} C${cx + r * .15} ${cy - r * .45} ${cx + r * .4} ${cy - r * .7} ${cx + r * .45} ${cy - r * .9} A${r * .98} ${r * .98} 0 0 0 ${cx - r * .18} ${cy - r * .97} C${cx - r * .15} ${cy - r * .7} ${cx - r * .2} ${cy - r * .45} ${cx - r * .24} ${cy - r * .22}Z"/>`;
  }
  let frame = "";
  if (o.frame) {
    const s = r + 9;
    frame = `<rect class="plate" x="${cx - s}" y="${cy - s}" width="${2 * s}" height="${2 * s}" rx="9"/>` +
      ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as [number, number][]).map(([i, j]) => `<circle class="cap" cx="${cx + i * (s - 6)}" cy="${cy + j * (s - 6)}" r="2.4"/>`).join("");
  }
  return `${frame}<circle class="plate" cx="${cx}" cy="${cy}" r="${r + 2}"/>
    ${o.ring !== false ? `<g class="spinring"><circle class="ring" cx="${cx}" cy="${cy}" r="${r + 1}"/></g>` : ""}
    <g class="blades ${o.slow ? "slow" : ""}" data-fan="${o.id || ""}"><circle cx="${cx}" cy="${cy}" r="${r}" fill="none"/>${b}</g>
    <circle class="hub" cx="${cx}" cy="${cy}" r="${r * .24}"/><circle cx="${cx}" cy="${cy}" r="${r * .1}" fill="${o.pink ? "#ff4dd8" : "#3fe0ff"}" opacity=".7"/>`;
}
const fins = (x: number, y: number, w: number, h: number, n: number, vertical: boolean, cls = "fin") => {
  let s = "";
  for (let i = 1; i < n; i++) s += vertical
    ? `<line class="${cls}" x1="${x + (w / n) * i}" y1="${y + 3}" x2="${x + (w / n) * i}" y2="${y + h - 3}"/>`
    : `<line class="${cls}" x1="${x + 3}" y1="${y + (h / n) * i}" x2="${x + w - 3}" y2="${y + (h / n) * i}"/>`;
  return s;
};
const capAt = (x: number, y: number, r = 5) => `<circle class="cap" cx="${x}" cy="${y}" r="${r}"/><path class="capx" d="M${x - r * .6} ${y}H${x + r * .6}M${x} ${y - r * .6}V${y + r * .6}"/>`;
const rep = (n: number, f: (i: number) => string) => Array.from({ length: n }, (_, i) => f(i)).join("");

/** O SVG da placa inteira, com todas as peças escondidas (a classe "in" mostra cada uma). */
export function boardSvg(): string {
  // detalhes fixos da placa (PCB, furos, SMDs, capacitores, slots)
  const dots = rep(29, (i) => rep(27, (j) => `<circle class="dot" cx="${50 + i * 20}" cy="${50 + j * 20}" r=".7"/>`));
  let seed = 7; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const smd = rep(70, () => { const x = 50 + rnd() * 560, y = 50 + rnd() * 520; return `<rect class="smd" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${rnd() > .5 ? 5 : 3}" height="${rnd() > .5 ? 2.5 : 4}"/>`; });
  const holes = ([[56, 56], [604, 56], [56, 564], [604, 564], [420, 56], [420, 380]] as [number, number][]).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#05070d" stroke="#b08a2e" stroke-width="2.5"/>`).join("");
  const caps = ([[214, 112], [214, 290], [410, 112], [410, 296], [428, 320], [200, 316], [600, 330], [455, 380]] as [number, number][]).map(([x, y]) => capAt(x, y)).join("");
  const sata = rep(4, (i) => `<rect class="chip dim" x="600" y="${340 + i * 15}" width="16" height="11" rx="1.5"/><rect x="603" y="${343 + i * 15}" width="10" height="5" fill="#05070d"/>`);
  const pcie2 = `<rect class="chip dim" x="70" y="558" width="300" height="10" rx="2"/><text class="silk s" x="374" y="566">PCIE_2</text>`;
  const fanhdr = ([[150, 560], [596, 120], [470, 380]] as [number, number][]).map(([x, y]) => `<rect class="chip dim" x="${x}" y="${y}" width="16" height="7"/>${rep(4, (k) => `<rect class="pin" x="${x + 2 + k * 3.5}" y="${y + 2}" width="2" height="3"/>`)}`).join("");

  // trilhas entre as peças: acendem quando as duas pontas estão instaladas
  const traces: [string, string, string][] = [
    ["cpu", "ram", "M400 180 H440"], ["cpu", "ram", "M400 200 H440"], ["cpu", "ram", "M400 240 H440"], ["cpu", "ram", "M400 260 H440"],
    ["cpu", "ssd", "M280 300 V330"], ["cpu", "ssd", "M340 300 V330"],
    ["cpu", "power", "M220 140 H208 V70 H200"], ["ram", "power", "M522 200 H560"], ["ram", "power", "M522 260 H560"],
    ["power", "debug", "M576 150 V98"], ["ssd", "chipset", "M430 351 H455 V420 H470"], ["chipset", "gpu", "M470 470 H452"],
    ["cpu", "gpu", "M240 300 V318 H200 V400"], ["io", "vrm", "M128 150 H140"], ["io", "vrm", "M128 220 H140"],
    ["io", "audio", "M90 280 V300"], ["audio", "gpu", "M120 390 V400"], ["chipset", "cmos", "M545 500 V530"],
    ["chipset", "power", "M570 400 V302"], ["wifi", "io", "M40 100 H48"], ["wifi", "io", "M40 140 H48"],
    ["debug", "cpu", "M552 78 H436 V112 H400"], ["chipset", "rgb", "M590 450 H612"], ["ssd", "audio", "M210 351 H190"],
  ];
  const tr = traces.map(([, , d]) => `<path class="trace" d="${d}"/>`).join("");
  const fl = traces.map(([a, b, d], i) => `<path class="flow" data-a="${a}" data-b="${b}" d="${d}" style="animation-delay:${-i * .17}s"/>`).join("");

  // ---------- peças ----------
  const P: Record<string, string> = {};
  P.vrm = `<rect class="metal" x="210" y="48" width="212" height="44" rx="5"/>${fins(210, 48, 212, 44, 26, true, "fin lit")}
    <rect class="metal" x="140" y="100" width="44" height="200" rx="5"/>${fins(140, 100, 44, 200, 24, false, "fin lit")}
    <path d="M196 70 C170 70 162 82 162 100" fill="none" stroke="#d9b44a" stroke-width="5" stroke-linecap="round" opacity=".85"/>
    <text class="silk" x="300" y="74" text-anchor="middle" fill="#3fe0ff" style="fill:#9fe9ff;letter-spacing:.3em">SDP · POWER STAGE 24+2</text>
    ${rep(10, (i) => `<rect class="choke" x="${216 + i * 20}" y="98" width="14" height="14" rx="2"/><text class="silk s" x="${218 + i * 20}" y="107.5" style="font-size:5px">R22</text>`)}
    ${rep(9, (i) => `<rect class="choke" x="190" y="${116 + i * 20}" width="14" height="14" rx="2"/>`)}`;
  P.cpu = `<rect class="chip dim" x="220" y="120" width="180" height="180" rx="6"/>
    ${rep(14, (i) => rep(14, (j) => `<circle class="lga" cx="${229 + i * 12.4}" cy="${129 + j * 12.4}" r="1.2"/>`))}
    <path d="M404 128 V292 M404 128 h8 M404 292 h8 M412 128 v18" fill="none" stroke="#9fb3dd" stroke-width="2.4" stroke-linecap="round"/>
    <rect x="240" y="140" width="140" height="140" rx="8" fill="url(#ihsGrad)" stroke="#3fe0ff" stroke-width="1.4"/>
    <rect class="core" x="262" y="162" width="96" height="96" rx="6"/>
    ${rep(4, (i) => rep(2, (j) => `<rect x="${270 + i * 21}" y="${182 + j * 30}" width="15" height="22" rx="2" fill="none" stroke="#3fe0ff" stroke-width=".7" opacity=".55"/>`))}
    <path d="M244 276 l10 0 l-10 -10z" fill="#d9b44a"/>
    <text class="silk" x="310" y="160" text-anchor="middle" style="fill:#cfe9ff">SDP CORE ULTRA 9</text>
    <text class="silk s" x="310" y="272" text-anchor="middle" style="fill:#9fb3dd">24C/32T · 5.8 GHz · 3 nm</text>`;
  P.ram = rep(4, (i) => {
    const x = 440 + i * 21;
    return `<g data-ram="${i}"><rect class="chip" x="${x}" y="96" width="16" height="248" rx="3"/>
      <rect x="${x + 2}" y="104" width="12" height="232" rx="2" fill="url(#metalGrad)" stroke="#2c4a86" stroke-width=".6"/>
      ${rep(10, (k) => `<line x1="${x + 3}" y1="${120 + k * 21}" x2="${x + 13}" y2="${114 + k * 21}" stroke="#3fe0ff" stroke-width=".7" opacity=".45"/>`)}
      <rect class="ramchase" x="${x + 2}" y="98" width="12" height="10" rx="2" fill="url(#rgbV)" style="animation-delay:${-i * .5}s"/>
      <text class="silk s" transform="translate(${x + 10.5} 300) rotate(-90)" style="fill:#9fe9ff">DDR5 8000</text></g>`;
  }) + `<text class="silk s" x="440" y="354">DIMM A1 A2 B1 B2</text>`;
  P.power = `<rect class="chip" x="560" y="150" width="34" height="150" rx="3"/>
    ${rep(12, (i) => `<rect class="pin" x="566" y="${157 + i * 11.8}" width="8" height="7" rx="1"/><rect class="pin" x="580" y="${157 + i * 11.8}" width="8" height="7" rx="1"/>`)}
    ${([["#3fe0ff", 0], ["#ff4dd8", 6], ["#3fe0ff", 12], ["#ff4dd8", 18]] as [string, number][]).map(([c, o]) => `<path class="cable" stroke="${c}" opacity=".7" d="M594 ${170 + o * 6} C610 ${170 + o * 6} 612 ${196 + o * 6} 622 ${200 + o * 6}"/>`).join("")}
    <rect class="chip" x="140" y="46" width="60" height="20" rx="3"/>${rep(4, (i) => `<rect class="pin" x="${145 + i * 13}" y="49" width="9" height="6"/><rect class="pin" x="${145 + i * 13}" y="57" width="9" height="6"/>`)}
    <path class="cable" stroke="#3fe0ff" opacity=".7" d="M160 46 C160 30 150 24 150 6"/><path class="cable" stroke="#ff4dd8" opacity=".7" d="M182 46 C182 30 190 24 190 6"/>
    <text class="silk s" x="140" y="76">EPS 12V</text><text class="silk s" x="560" y="146">ATX 24P</text>`;
  P.ssd = `<rect class="chip" x="210" y="330" width="222" height="42" rx="4"/>
    <rect x="216" y="334" width="168" height="34" rx="3" fill="url(#metalGrad)" stroke="#3fe0ff" stroke-width=".8"/>${fins(216, 334, 168, 34, 22, true, "fin lit")}
    <text class="silk" x="222" y="327">GEN5 NVMe 4TB · 14 GB/s</text>
    ${fan(410, 351, 15, { blades: 7, ring: false, id: "ssd" })}
    <circle class="led g" cx="226" cy="364" r="2.2" style="animation-duration:.3s"/>`;
  P.pump = `<path d="M240 140 L380 280 M380 140 L240 280" stroke="#2c4a86" stroke-width="12" stroke-linecap="round"/>
    ${([[240, 140], [380, 140], [240, 280], [380, 280]] as [number, number][]).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#0b1226" stroke="#3fe0ff"/>`).join("")}
    <circle cx="310" cy="210" r="72" fill="#0b1226" stroke="#2c4a86" stroke-width="2"/>
    <g class="spinring"><circle cx="310" cy="210" r="66" fill="none" stroke="url(#ringGrad)" stroke-width="7" class="glow"/></g>
    ${rep(3, (i) => `<circle cx="310" cy="210" r="${58 - i * 3}" fill="none" stroke="#3fe0ff" stroke-width=".6" opacity="${.5 - i * .14}"/>`)}
    <circle class="lcd" cx="310" cy="210" r="46"/>
    <g class="spinring" style="animation-duration:1.6s"><path d="M310 168 A42 42 0 0 1 352 210" fill="none" stroke="#ff4dd8" stroke-width="3" stroke-linecap="round" class="glowp"/></g>
    <text class="lcdsub" x="310" y="190">CPU</text>
    <text class="lcdtxt" x="310" y="218" data-lcd="t">42°</text>
    <text class="lcdsub" x="310" y="234" data-lcd="r">PUMP 2800 RPM</text>`;
  const tubeA = "M372 180 C420 150 440 16 560 14 C640 12 690 30 692 66";
  const tubeB = "M372 240 C470 236 470 44 590 36 C670 30 744 36 746 66";
  P.radiator = `<rect class="plate" x="650" y="66" width="170" height="490" rx="10"/>
    ${fins(656, 72, 158, 478, 80, false)}
    ${fan(735, 150, 66, { frame: true, blades: 9, id: "rad1" })}${fan(735, 310, 66, { frame: true, blades: 9, id: "rad2" })}${fan(735, 470, 66, { frame: true, blades: 9, id: "rad3" })}
    <rect x="681" y="60" width="22" height="16" rx="3" class="metal"/><rect x="735" y="60" width="22" height="16" rx="3" class="metal"/>
    <path class="tubeedge" d="${tubeA}"/><path class="tube" d="${tubeA}"/><path class="coolant" d="${tubeA}"/>
    <path class="tubeedge" d="${tubeB}"/><path class="tube" d="${tubeB}"/><path class="coolant" d="${tubeB}" style="animation-direction:reverse"/>
    <text class="silk" x="735" y="572" text-anchor="middle">AIO 360 mm</text>`;
  P.chipset = `<rect class="metal" x="470" y="400" width="122" height="102" rx="8"/>
    ${rep(9, (i) => `<line x1="${476 + i * 12}" y1="406" x2="${466 + i * 12}" y2="496" stroke="#3fe0ff" stroke-width="1" opacity=".4"/>`)}
    ${fan(531, 451, 30, { blades: 9, pink: true, id: "chip" })}
    <text class="silk s" x="474" y="512">Z990 · PCIe 5.0</text>`;
  P.io = `<path d="M48 50 H122 L132 64 V266 L122 282 H48 Z" fill="#0b1226" stroke="#3fe0ff" stroke-width="1.2"/>
    ${rep(8, (i) => `<line x1="56" y1="${74 + i * 24}" x2="124" y2="${66 + i * 24}" stroke="#2c4a86" stroke-width="1"/>`)}
    <text x="90" y="170" text-anchor="middle" style="fill:#3fe0ff;font:700 22px var(--body);letter-spacing:.06em" class="glow" transform="rotate(-90 90 165)">SDP</text>
    ${([[58, "c"], [86, "c"], [114, "g"], [142, "y"], [170, "c"], [198, "p"], [226, "g"]] as [number, string][]).map(([y, c], i) => `<rect x="42" y="${y}" width="10" height="18" rx="1.5" fill="#05070d" stroke="#5f79b8"/><circle class="led ${c}" cx="47" cy="${y + 4}" r="1.6" style="animation-delay:${-i * .31}s;animation-duration:${.4 + (i % 4) * .35}s"/>`).join("")}
    <text class="silk s" x="58" y="278">USB4 · 10GbE</text>`;
  P.wifi = `${[100, 140].map((y, i) => `<path d="M40 ${y} H14" stroke="#9fb3dd" stroke-width="5" stroke-linecap="round"/><circle cx="12" cy="${y}" r="5" fill="#0b1226" stroke="#3fe0ff"/>
    ${rep(3, (k) => `<path class="wave" d="M${6 - k * 4} ${y - 8 - k * 4} A ${10 + k * 4} ${10 + k * 4} 0 0 0 ${6 - k * 4} ${y + 8 + k * 4}" style="animation-delay:${k * .35 + i * .5}s"/>`)}`).join("")}
    <text class="silk s" x="2" y="170">WI-FI 7</text>`;
  P.audio = `<path class="audioline" d="M56 300 H192 V392 H56"/>
    <rect class="chip" x="68" y="314" width="34" height="34" rx="3"/><text class="silk s" x="85" y="334" text-anchor="middle" style="fill:#ffd24d">ALC4K</text>
    ${([[120, 318], [138, 318], [156, 318], [120, 336], [138, 336], [156, 336]] as [number, number][]).map(([x, y]) => `<circle class="goldcap" cx="${x}" cy="${y}" r="7"/><path d="M${x - 4} ${y}H${x + 4}" stroke="#ffd24d" stroke-width=".8"/>`).join("")}
    ${rep(7, (i) => `<rect class="eq" x="${70 + i * 15}" y="358" width="9" height="26" rx="1.5" style="animation-delay:${-i * .23}s;animation-duration:${.5 + (i % 3) * .25}s"/>`)}
    <text class="silk s" x="176" y="314" style="fill:#ffd24d">♪</text>`;
  P.debug = `<rect class="chip" x="548" y="50" width="62" height="54" rx="4"/>
    <rect x="554" y="56" width="50" height="30" rx="2" fill="#120408"/>
    <text class="seg" x="557" y="80" data-post>A0</text>
    ${["CPU", "DRAM", "VGA", "BOOT"].map((t, i) => `<circle cx="${556 + i * 14}" cy="94" r="2" fill="${i === 3 ? "#39ff8f" : "#2a1a1f"}" class="${i === 3 ? "led g" : ""}"/><text class="silk s" x="${552 + i * 14}" y="101" style="font-size:4px">${t}</text>`).join("")}`;
  P.gpu = `<rect x="56" y="402" width="400" height="150" rx="12" fill="#0a1124" stroke="#3fe0ff" stroke-width="1.5"/>
    <path d="M66 412 H200 L214 426 H300 L314 412 H446" fill="none" stroke="#2c4a86" stroke-width="1.2"/>
    <path d="M66 542 H180 L192 530 H320 L332 542 H446" fill="none" stroke="#2c4a86" stroke-width="1.2"/>
    <rect class="ramchase" x="70" y="405" width="140" height="3" rx="1.5" fill="url(#rgbH)"/>
    ${fan(142, 477, 42, { blades: 11, id: "gpu1" })}${fan(256, 477, 42, { blades: 11, id: "gpu2" })}${fan(370, 477, 42, { blades: 11, id: "gpu3" })}
    <rect class="chip gconn" x="414" y="406" width="30" height="12" rx="2"/>${rep(6, (i) => `<rect class="pin" x="${417 + i * 4.3}" y="409" width="2.6" height="6"/>`)}
    <path class="cable gc-ok" stroke="#ff4dd8" opacity=".8" d="M444 412 C470 412 470 380 500 372"/><g class="gc-broken"><path class="cable" stroke="#ff4dd8" opacity=".8" d="M444 412 C456 412 460 405 462 397"/><path class="cable" stroke="#ff4dd8" opacity=".8" d="M474 384 C482 378 490 374 500 372"/><path d="M462 397 l3 -2 l-1 -3 l3 -1" stroke="#ffd24d" fill="none" stroke-width="1"/><path d="M474 384 l-3 1 l1 3 l-3 2" stroke="#ffd24d" fill="none" stroke-width="1"/></g>
    <text class="silk" x="256" y="425" text-anchor="middle" style="fill:#cfe9ff;letter-spacing:.25em">SDP RTX 9090 · 32 GB</text>`;
  P.cmos = `<circle cx="545" cy="548" r="19" fill="#0b1226" stroke="#9fb3dd" stroke-width="2"/><circle cx="545" cy="548" r="14" fill="url(#metalGrad)" stroke="#3fe0ff"/><text class="silk" x="545" y="551" text-anchor="middle" style="fill:#cfe9ff">CR2032</text>`;
  P.rgb = `<rect class="rgb" x="44" y="44" width="572" height="532" rx="12" stroke="url(#rgbGrad)"/>
    <path class="rgb" d="M612 420 V520" stroke="url(#rgbGrad)" stroke-width="5" opacity=".9"/>`;

  // ordem de desenho (de baixo para cima)
  const layers = ["vrm", "cpu", "ram", "power", "ssd", "pump", "chipset", "io", "wifi", "audio", "debug", "gpu", "cmos", "rgb", "radiator"];
  const comps = layers.map((id) => `<g class="comp" data-id="${id}">${P[id]}</g>`).join("");
  const slots = `<g>
    <rect class="slot" data-s="cpu" x="220" y="120" width="180" height="180"/><rect class="slot" data-s="ram" x="438" y="94" width="84" height="252"/>
    <rect class="slot" data-s="power" x="560" y="150" width="34" height="150"/><rect class="slot" data-s="ssd" x="210" y="330" width="222" height="42"/>
    <rect class="slot" data-s="vrm" x="140" y="48" width="282" height="252"/><rect class="slot" data-s="chipset" x="470" y="400" width="122" height="102"/>
    <rect class="slot" data-s="io" x="42" y="50" width="90" height="232"/><rect class="slot" data-s="audio" x="56" y="300" width="136" height="92"/>
    <rect class="slot" data-s="debug" x="548" y="50" width="62" height="54"/><rect class="slot" data-s="gpu" x="56" y="402" width="400" height="150"/>
    <circle class="slot" data-s="cmos" cx="545" cy="548" r="19"/><rect class="slot" data-s="radiator" x="650" y="66" width="170" height="490" rx="10"/></g>`;

  return `<svg class="dmgsvg" viewBox="0 0 830 600" role="img" aria-label="Placa-mãe neon montada pelos dias de estudo">
  <defs>
    <linearGradient id="pcbGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0a1430"/><stop offset="1" stop-color="#060c1d"/></linearGradient>
    <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b2b52"/><stop offset=".5" stop-color="#101b38"/><stop offset="1" stop-color="#18284c"/></linearGradient>
    <linearGradient id="ihsGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3a60"/><stop offset=".45" stop-color="#151f3d"/><stop offset=".55" stop-color="#1d2b50"/><stop offset="1" stop-color="#0f1730"/></linearGradient>
    <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3fe0ff"/><stop offset=".35" stop-color="#b78cff"/><stop offset=".65" stop-color="#ff4dd8"/><stop offset="1" stop-color="#3fe0ff" stop-opacity=".1"/></linearGradient>
    <linearGradient id="rgbV" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff4dd8"/><stop offset=".5" stop-color="#3fe0ff"/><stop offset="1" stop-color="#39ff8f"/></linearGradient>
    <linearGradient id="rgbH" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3fe0ff"/><stop offset=".5" stop-color="#b78cff"/><stop offset="1" stop-color="#ff4dd8"/></linearGradient>
    <linearGradient id="rgbGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff3d7f"/><stop offset=".25" stop-color="#ffcb2e"/><stop offset=".5" stop-color="#39ff8f"/><stop offset=".75" stop-color="#3fe0ff"/><stop offset="1" stop-color="#b78cff"/>
      <animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="5s" repeatCount="indefinite"/></linearGradient>
  </defs>
  <rect class="pcb" x="40" y="40" width="580" height="540" rx="12"/>
  ${rep(6, (i) => `<path class="layer-line" d="M40 ${120 + i * 80} H620"/>`)}
  ${dots}${smd}${holes}${caps}${sata}${pcie2}${fanhdr}
  <text class="silk" x="470" y="574">SDP-HABIT Z990 · REV 2.0</text>
  ${tr}${slots}<g class="scorches"></g>${fl}
  ${comps}
  <g class="dust d-a"></g><g class="dust d-b"></g><g class="bulge"><circle class="cap" cx="428" cy="320" r="6"/><path class="capx" d="M424 320H432M428 316V324"/></g><ellipse class="leakcap" cx="433" cy="330" rx="7" ry="4"/><ellipse class="puddle" cx="400" cy="300" rx="34" ry="12"/><g class="drips"></g><g class="arcs"></g><g class="glitch"></g>
  <g class="fxlayer"></g>
</svg>`;
}

