// Ferramentas para gravar os vídeos de demonstração com o Playwright:
// cursor visível com clique, movimento suave, digitação e legendas com tempo.
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = createRequire("/opt/node-tools/")("playwright");
}

// a página é desenhada maior (1600x1000) e o vídeo sai reduzido, para caber mais tela em cada quadro
const W = 1600;
const H = 1000;
const VW = 1280;
const VH = 800;

/** Cursor em forma de seta + círculo no clique, desenhado por cima da página. */
const CURSOR = `
(() => {
  const put = () => {
    if (document.getElementById("__demo_cursor")) return;
    const st = document.createElement("style");
    st.textContent = "nextjs-portal{display:none!important}";
    document.documentElement.appendChild(st);
    const c = document.createElement("div");
    c.id = "__demo_cursor";
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M4 2l15 9-7 1.5L8.5 20z" fill="#fff" stroke="#05060b" stroke-width="1.5"/></svg>';
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: 2147483647, pointerEvents: "none", transition: "transform 40ms linear", filter: "drop-shadow(0 0 6px rgba(34,228,255,.8))" });
    const p = JSON.parse(sessionStorage.getItem("__demo_xy") || "[640,400]");
    c.style.transform = "translate(" + p[0] + "px," + p[1] + "px)";
    document.documentElement.appendChild(c);
    addEventListener("mousemove", (e) => { c.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; sessionStorage.setItem("__demo_xy", JSON.stringify([e.clientX, e.clientY])); }, true);
    addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      Object.assign(r.style, { position: "fixed", left: e.clientX - 18 + "px", top: e.clientY - 18 + "px", width: "36px", height: "36px", borderRadius: "50%", border: "2px solid #22e4ff", zIndex: 2147483646, pointerEvents: "none", transition: "all .45s ease-out", opacity: "1" });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = "scale(1.8)"; r.style.opacity = "0"; });
      setTimeout(() => r.remove(), 500);
    }, true);
  };
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", put); else put();
})();`;

/**
 * Abre um navegador gravando vídeo. `cookie` é o login único (opcional).
 * Volta { page, cap, wait, move, click, type, scrollTo, finish }.
 */
export async function recorder(name, { cookie, init } = {}) {
  const tmp = join(ROOT, ".demo-tmp", name);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: tmp, size: { width: VW, height: VH } }, reducedMotion: "no-preference" });
  if (cookie) await ctx.addCookies([{ name: "sdl_session", value: cookie, domain: "localhost", path: "/" }]);
  await ctx.addInitScript(CURSOR);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  const t0 = Date.now();
  const cues = [];
  let mouse = [800, 500];

  const wait = (ms) => page.waitForTimeout(ms);
  /** Legenda a partir de agora. */
  const cap = (text) => cues.push({ at: Math.max(0, (Date.now() - t0) / 1000), text });
  async function move(x, y, steps = 25) {
    await page.mouse.move(x, y, { steps });
    mouse = [x, y];
  }
  async function center(locator) {
    const l = typeof locator === "string" ? page.locator(locator).first() : locator;
    await l.scrollIntoViewIfNeeded();
    const b = await l.boundingBox();
    return [b.x + b.width / 2, b.y + b.height / 2];
  }
  async function click(locator, { pause = 350 } = {}) {
    const [x, y] = await center(locator);
    await move(x, y);
    await wait(pause);
    await page.mouse.down();
    await page.mouse.up();
  }
  async function type(text, delay = 45) {
    await page.keyboard.type(text, { delay });
  }
  /** Rola a página suavemente até o elemento ficar perto do topo. */
  async function scrollTo(locator, offset = 90) {
    const l = typeof locator === "string" ? page.locator(locator).first() : locator;
    const y = await l.evaluate((el, off) => el.getBoundingClientRect().top + scrollY - off, offset);
    await page.evaluate(async (target) => {
      const start = scrollY;
      const d = target - start;
      const n = 40;
      for (let i = 1; i <= n; i++) {
        const t = i / n;
        window.scrollTo({ top: start + d * (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), behavior: "instant" });
        await new Promise((r) => setTimeout(r, 16));
      }
    }, y);
    await wait(300);
  }

  /** Fecha, converte para MP4 (H.264) e salva vídeo, capa e legendas no app. */
  async function finish(app, { trimStart } = {}) {
    // corta o começo (carregamento) até perto da primeira legenda
    trimStart ??= Math.max(0, (cues[0]?.at ?? 0) - 0.4);
    const video = page.video();
    await ctx.close();
    await browser.close();
    const raw = await video.path();
    const out = join(ROOT, "apps", app, "public", "demo");
    mkdirSync(out, { recursive: true });
    const mp4 = join(out, `${name}.mp4`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(trimStart), "-i", raw, "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-r", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4]);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", "2", "-i", mp4, "-frames:v", "1", "-q:v", "4", join(out, `${name}.jpg`)]);
    const shifted = cues.map((c) => ({ at: Math.max(0, +(c.at - trimStart).toFixed(1)), text: c.text }));
    writeFileSync(join(ROOT, "apps", app, "components", "demo-cues.ts"), `// Gerado por scripts/demos (não edite à mão): legendas do vídeo de demonstração.\nexport const DEMO_CUES = ${JSON.stringify(shifted, null, 2)};\n`);
    rmSync(join(ROOT, ".demo-tmp"), { recursive: true, force: true });
    console.log(`[demo] ${mp4}`);
  }

  return { page, cap, wait, move, click, type, scrollTo, center, finish };
}
