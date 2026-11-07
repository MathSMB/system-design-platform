// Prints das telas reais para as seções da apresentação de cada app.
// Uso: node scripts/demos/prints.mjs <cookie> <profileId>  (rode semear.mjs, semear-estudos.mjs e semear-pair.mjs antes)
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { ROOT } from "./lib.mjs";

const require = createRequire(import.meta.url);
let pw;
try {
  pw = require("playwright");
} catch {
  pw = createRequire("/opt/node-tools/")("playwright");
}
const [cookie, pid] = process.argv.slice(2);
const only = process.env.SO; // ex. SO=habito para refazer um app só
const browser = await pw.chromium.launch();
const HIDE = "nextjs-portal{display:none!important}";

async function page(app, { login = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
  if (login) await ctx.addCookies([{ name: "sdl_session", value: cookie, domain: "localhost", path: "/" }]);
  await ctx.addInitScript(`try{["system-design","entrevista","estudos","habito","pair"].forEach(k=>localStorage.setItem("sdl:intro:"+k,"visto"));localStorage.setItem("sdp-tour-canvas-v1","done")}catch{}`);
  const p = await ctx.newPage();
  p.on("load", () => p.addStyleTag({ content: HIDE }).catch(() => {}));
  return p;
}
const out = (app) => {
  const d = join(ROOT, "apps", app, "public", "demo", "prints");
  mkdirSync(d, { recursive: true });
  return d;
};
async function shot(p, app, name, target, pad = 12) {
  const dir = out(app);
  const path = join(dir, `${name}.jpg`);
  if (typeof target === "object" && target && "x" in target) {
    await p.screenshot({ path, type: "jpeg", quality: 78, clip: target });
  } else {
    const l = typeof target === "string" ? p.locator(target).first() : target;
    await l.scrollIntoViewIfNeeded();
    await p.waitForTimeout(400);
    const b = await l.boundingBox();
    const y = await p.evaluate(() => scrollY);
    await p.screenshot({ path, type: "jpeg", quality: 78, fullPage: true, clip: { x: Math.max(0, b.x - pad), y: Math.max(0, b.y + y - pad), width: Math.min(1440, b.width + pad * 2), height: b.height + pad * 2 } });
  }
  console.log("[print]", app, name);
}
const below = { x: 0, y: 49, width: 1440, height: 851 };

// ---------------- System Design ----------------
if (!only || only === "system-design") {
  const p = await page("system-design");
  const B = "http://localhost:3001";
  await p.goto(B + "/canvas", { waitUntil: "networkidle" });
  await p.click("text=3. Cache na frente do banco");
  await p.waitForTimeout(800);
  await p.click("text=▶ Simular");
  await p.waitForTimeout(800);
  await p.waitForFunction(() => !/simulando/i.test(document.body.innerText), null, { timeout: 60000 });
  await p.waitForTimeout(800);
  await shot(p, "system-design", "cache", below);
  // derruba o cache no meio da simulação: a avalanche no banco
  await p.locator(".react-flow__node", { hasText: "REDIS" }).first().click();
  await p.waitForTimeout(400);
  const kill = p.locator("label", { hasText: "Derrubar no segundo" });
  await kill.locator('input[type="checkbox"]').check();
  await p.waitForTimeout(300);
  await p.locator(".react-flow__pane").click({ position: { x: 300, y: 700 } });
  await p.click("text=▶ Simular");
  await p.waitForTimeout(800);
  await p.waitForFunction(() => !/simulando/i.test(document.body.innerText), null, { timeout: 60000 });
  await p.waitForTimeout(800);
  await shot(p, "system-design", "simulacao", below);

  await p.goto(B + "/estudo/system-design", { waitUntil: "networkidle" });
  await p.locator('main a[href^="/estudo/system-design/"]').first().click();
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(2500);
  await shot(p, "system-design", "aula", { x: 0, y: 49, width: 1000, height: 760 });

  await p.goto(B + "/entrevista/system-design", { waitUntil: "networkidle" });
  await p.locator('main a[href^="/entrevista/system-design/"]').first().click();
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(2500);
  await shot(p, "system-design", "desafio", { x: 0, y: 49, width: 1000, height: 640 });

  await p.goto(B + "/concorrencia", { waitUntil: "networkidle" });
  for (let i = 0; i < 6; i++) {
    const btn = p.getByRole("button", { name: /avançar/i });
    const n = await btn.count();
    if (!n) break;
    await btn.nth(i % n).click().catch(() => {});
    await p.waitForTimeout(350);
  }
  await p.getByText("Testar todas as ordens possíveis").first().click().catch(() => {});
  await p.waitForTimeout(1500);
  await shot(p, "system-design", "concorrencia", below);

  await p.goto(B + "/entrevista/concorrencia", { waitUntil: "networkidle" });
  await p.locator('main a[href^="/entrevista/concorrencia/"]').first().click();
  await p.waitForLoadState("networkidle");
  await p.waitForTimeout(2000);
  await shot(p, "system-design", "bug", below);
  await p.context().close();
}

// ---------------- Entrevista ----------------
if (!only || only === "entrevista") {
  const p = await page("entrevista");
  const B = "http://localhost:3002";
  // as telas do processo não usam <main>: pega o bloco central da página
  const M = ":is(main, body .mx-auto.max-w-5xl, body .mx-auto.max-w-3xl)";
  let calls = 0;
  await p.route("**/api/avaliar-resposta", async (r) => {
    calls++;
    const rh = calls === 1;
    await r.fulfill({
      json: {
        level: "pleno", score: rh ? 7.5 : 7,
        verdict: rh ? "Boa resposta: contexto, ação e resultado." : "Escolheu a exceção certa e explicou o caminho até o cliente; faltou o rollback.",
        strengths: rh ? ["Contexto claro do projeto"] : ["Escolheu unchecked e justificou", "Citou o @RestControllerAdvice devolvendo 422"],
        gaps: rh ? ["Não disse quanto o tempo caiu"] : ["Não falou do rollback do @Transactional", "Faltou o corpo do erro (código e mensagem)"],
        covered: [], communication: "Clara, com um exemplo concreto do dia a dia.",
        betterAnswer: rh ? "" : "Eu criaria uma SaldoInsuficienteException unchecked, porque é regra de negócio e não algo que o chamador vá tratar. Ela desfaz a transação do @Transactional e o @RestControllerAdvice traduz para 422 com um corpo padrão: código, mensagem e o id da transferência.",
        howToSay: rh ? [] : ["Comece pela decisão: unchecked", "Explique o porquê em uma frase", "Feche com o que o cliente da API recebe"],
        reply: rh ? "Legal, gostei do exemplo. E quanto o tempo de resposta caiu?" : "Certo, entendi.",
        followUp: "",
      },
    });
  });
  await p.goto(B + "/processo-seletivo", { waitUntil: "networkidle" });
  await p.getByText("Back-end").first().click();
  await p.locator('button:has-text("Java e Spring Boot")').first().click();
  await p.locator('button:has-text("Pleno")').first().click();
  await p.waitForTimeout(600);
  await shot(p, "entrevista", "empresa", M);
  await p.locator('button:has-text("Pagamentos")').first().click();
  await p.waitForTimeout(1500);
  await p.fill("input[type=number] >> nth=0", "4");
  await p.fill("input[type=number] >> nth=1", "9000");
  await p.click('button:has-text("Sim")');
  await p.fill("textarea", "Java 17, Spring Boot 3, Kafka, PostgreSQL, JUnit, Docker");
  await shot(p, "entrevista", "triagem", M);
  await p.click("text=Enviar candidatura");
  await p.waitForTimeout(1500);
  await p.click("text=Próxima etapa");
  await p.waitForTimeout(1500);
  await p.fill("textarea", "No meu último projeto fiz a API de pedidos com Spring Boot e PostgreSQL e reduzi o tempo de resposta com cache no catálogo.");
  await p.click("text=Enviar resposta");
  await p.waitForTimeout(2000);
  await shot(p, "entrevista", "conversa", M);

  await p.goto(B + "/java/pleno", { waitUntil: "networkidle" });
  await shot(p, "entrevista", "java", M);
  // a ordem das perguntas varia: recarrega até cair na pergunta do saldo insuficiente
  const bloco = await p.locator('main a[href^="/java/pleno/"]').first().getAttribute("href");
  for (let i = 0; i < 15; i++) {
    await p.goto(B + bloco, { waitUntil: "networkidle" });
    await p.waitForSelector("textarea");
    if (await p.getByText(/saldo insuficiente/i).count()) break;
  }
  await p.fill("textarea", "Eu usaria uma exceção unchecked, SaldoInsuficienteException, porque é regra de negócio. No @RestControllerAdvice eu transformo ela em 422 para o cliente da API.");
  await p.click("text=Enviar resposta");
  await p.waitForTimeout(1500);
  await shot(p, "entrevista", "feedback", M);
  await p.context().close();
}

// ---------------- Estudos ----------------
if (!only || only === "estudos") {
  const p = await page("estudos", { login: true });
  await p.route("**/api/estudos/conversa", (r) =>
    r.fulfill({
      json: {
        reply: "Boa! Montei a pós como trilha: 10 matérias, 2 sessões de 30 minutos por semana até junho. Microsserviços e mensageria cobrem duas lacunas da vaga.",
        action: "add_trail",
        trail: { id: "tpos", kind: "pos", title: "Pós em Engenharia de Software", why: "Cobre microsserviços e mensageria, que faltam para a vaga.", importance: 2, perWeek: 2, sessionMin: 30, deadline: null, skills: ["Microsserviços", "Kafka ou RabbitMQ"], units: ["Arquitetura de software", "Spring na prática", "Bancos relacionais", "Mensageria", "Testes automatizados", "Cloud e DevOps"].map((title, i) => ({ id: `u${i + 1}`, title, done: false })) },
        note: "",
      },
    }),
  );
  await p.goto("http://localhost:3003/", { waitUntil: "networkidle" });
  await p.waitForSelector("#vaga");
  await shot(p, "estudos", "vaga", "#vaga");
  await shot(p, "estudos", "lacunas", "#lacunas");
  await shot(p, "estudos", "trilhas", "#trilhas");
  await shot(p, "estudos", "projetos", "#projetos");
  const cron = p.locator("#cronograma");
  await cron.scrollIntoViewIfNeeded();
  const b = await cron.boundingBox();
  const y = await p.evaluate(() => scrollY);
  await p.screenshot({ path: join(out("estudos"), "cronograma.jpg"), type: "jpeg", quality: 78, fullPage: true, clip: { x: b.x - 12, y: b.y + y - 12, width: b.width + 24, height: 860 } });
  console.log("[print] estudos cronograma");
  await p.evaluate(() => scrollTo(0, 0));
  await p.getByRole("button", { name: /conversar com a ia/i }).first().click();
  await p.fill("aside textarea", "Comecei uma pós em Engenharia de Software, tem 10 matérias e termina em junho.");
  await p.keyboard.press("Enter");
  await p.waitForSelector("text=Adicionar à central");
  await p.waitForTimeout(500);
  await shot(p, "estudos", "conversa", "aside", 0);
  await p.context().close();
}

// ---------------- Hábito ----------------
if (!only || only === "habito") {
  for (const [name, board] of [
    ["placa", null],
    ["desgaste", { parts: 9, wear: 4, overclock: 0, reboots: 1 }],
  ]) {
    const p = await page("habito", { login: true });
    let real;
    await p.route("**/api/habito", async (r) => {
      const res = await r.fetch();
      const j = await res.json();
      real = j.habit?.board;
      if (board && j.habit) j.habit.board = board;
      await r.fulfill({ json: j });
    });
    await p.goto("http://localhost:3004/", { waitUntil: "networkidle" });
    await p.waitForSelector(".mobo svg");
    // marca o estado como já visto, para a placa aparecer parada (sem a animação de mudança)
    await p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [`sdp-placa-${pid}`, board ?? real]);
    await p.reload({ waitUntil: "networkidle" });
    await p.waitForSelector(".mobo svg");
    await p.waitForTimeout(2500);
    await shot(p, "habito", name, ".mobo", 0);
    if (!board) {
      await shot(p, "habito", "meta", p.locator(".panel", { has: p.getByText("Meta de hoje", { exact: true }) }).first());
      await shot(p, "habito", "calendario", p.locator(".panel", { has: p.getByText("Último ano", { exact: true }) }).first());
      await p.getByText("editar meta").first().click();
      await p.waitForTimeout(600);
      await shot(p, "habito", "editar-meta", p.locator(".panel", { has: p.getByText("Meta de hoje", { exact: true }) }).first());
    }
    await p.context().close();
  }
}
// ---------------- Pair Programming ----------------
if (!only || only === "pair") {
  const p = await page("pair", { login: true });
  // a pasta do exemplo é do Windows: aqui ela aparece como ligada
  await p.route("**/api/pair/conversas?id=*", async (r) => {
    const j = await (await r.fetch()).json();
    if (j.chat?.setup?.folder) j.chat.folderOk = true;
    await r.fulfill({ json: j });
  });
  const chat = p.locator("#pair-chat");
  const msgs = p.locator("#pair-chat .pair-msgs");
  await p.goto("http://localhost:3005/", { waitUntil: "networkidle" });
  await p.waitForSelector("#pair-conversas");
  await p.evaluate(() => scrollTo(0, document.querySelector("#pair-conversas").getBoundingClientRect().top + scrollY - 16));
  await p.waitForTimeout(400);
  await shot(p, "pair", "conversas", "#pair-conversas", 0);

  // um passo do ambiente (JAVA_HOME), do começo da resposta
  await p.click("text=Configurar o meu ambiente Java");
  await p.waitForSelector("text=Variáveis de Ambiente…");
  await p.waitForTimeout(900);
  await msgs.evaluate((el) => el.scrollTo({ top: [...el.querySelectorAll(".md")].at(-1).getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12 }));
  await p.waitForTimeout(400);
  await shot(p, "pair", "passo", chat, 0);

  // código com uma linha clicada e a explicação
  await p.click("text=Criar a API de transferências");
  await p.waitForSelector("text=Parte por parte");
  await p.waitForTimeout(900);
  const line = p.locator(".code-line", { hasText: '@GetMapping("/{id}")' }).first();
  await msgs.evaluate((el, y) => el.scrollTo({ top: y }), await line.evaluate((n) => { const m = n.closest(".pair-msgs"); return n.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop - 260; }));
  await line.hover();
  await p.waitForTimeout(400);
  await shot(p, "pair", "linha", chat, 0);

  // o roteiro aberto
  await p.locator("#pair-chat button", { hasText: "Criar o primeiro endpoint" }).first().click();
  await p.waitForTimeout(500);
  await shot(p, "pair", "roteiro", p.locator("#pair-chat > div").first(), 0);

  // conversa nova ligada a um projeto dos Estudos e à pasta
  await p.getByRole("button", { name: /nova conversa/i }).click();
  await p.getByText("Ligar aos Estudos e à pasta do projeto").click();
  await p.locator("#pair-nova select").selectOption("tproj");
  await p.getByRole("button", { name: "Java + Spring Boot" }).click();
  await p.fill("#pair-nova input[placeholder^='C:']", "C:\\Users\\matheus\\projetos\\api-pagamentos");
  await p.waitForTimeout(400);
  await shot(p, "pair", "nova", "#pair-nova", 0);
  await p.context().close();
}
await browser.close();
