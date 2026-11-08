// Vídeo de apresentação da plataforma inteira: landing, login, Painel e os cinco apps funcionando.
// Rode semear.mjs, semear-estudos.mjs e semear-pair.mjs antes.
// Uso: node scripts/demos/apresentacao.mjs <cookie> <profileId> [saida.mp4]
// As respostas da IA são simuladas aqui, para o vídeo não depender do Claude Code.
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { recorder, ROOT } from "./lib.mjs";

const [cookie, pid, outArg] = process.argv.slice(2);
const OUT = outArg || join(ROOT, ".demo-out", "apresentacao.mp4");
const P = (n) => `http://localhost:${3000 + n}`;

const init = `try{
  for (const a of ["painel","system-design","entrevista","estudos","habito","pair"]) localStorage.setItem("sdl:intro:"+a,"visto");
  localStorage.setItem("sdp-tour-canvas-v1","done");
  if (location.port === "3004") localStorage.setItem("sdp-placa-${pid}", JSON.stringify({ parts: 13, wear: 5, overclock: 0, reboots: 1 }));
}catch{}`;
const r = await recorder("apresentacao", { init });
const { page, wait, move, click, type, scrollTo } = r;
const ctx = page.context();
const t0 = Date.now();
const cues = [];
const cap = (text) => cues.push({ at: (Date.now() - t0) / 1000, text });
const navTo = async (label) => {
  await click(page.locator("nav a", { hasText: new RegExp(`^${label}$`, "i") }).first());
  await page.waitForLoadState("networkidle");
};

// ---------- IA simulada ----------
let calls = 0;
await page.route("**/api/avaliar-resposta", async (route) => {
  calls++;
  await new Promise((res) => setTimeout(res, 1600));
  const rh = calls === 1;
  await route.fulfill({
    json: {
      covered: ["Exceção de negócio unchecked", "Tradução para HTTP no @RestControllerAdvice"],
      communication: "Clara, com um exemplo concreto do dia a dia.",
      level: "pleno",
      score: rh ? 7.5 : 7,
      verdict: rh ? "Boa resposta: contexto, ação e resultado." : "Escolheu a exceção certa e explicou o caminho até o cliente; faltou o rollback.",
      strengths: rh ? ["Contexto claro do projeto", "Citou a tecnologia certa"] : ["Escolheu unchecked e justificou", "Citou o @RestControllerAdvice devolvendo 422"],
      gaps: rh ? ["Não disse quanto o tempo caiu"] : ["Não falou do rollback do @Transactional", "Faltou o corpo do erro (código e mensagem)"],
      betterAnswer: "Eu criaria uma SaldoInsuficienteException unchecked, porque é regra de negócio. Ela desfaz a transação do @Transactional e o @RestControllerAdvice traduz para 422 com um corpo padrão: código, mensagem e o id da transferência.",
      howToSay: ["Comece pela decisão: unchecked", "Explique o porquê em uma frase", "Feche com o que o cliente da API recebe"],
      reply: rh ? "Legal, gostei do exemplo. Vou passar para o time técnico." : "Certo, entendi.",
      followUp: "",
    },
  });
});
const F = "```";
const CONFERIR = `Boa, o JAVA_HOME está certo! Agora o passo 4: **conferir que o terminal enxerga o Java**.

Falta o **compilador**, o \`javac\`: é ele que transforma o seu \`.java\` em \`.class\`.

${F}powershell
javac -version
where.exe java
${F}

- O primeiro tem que mostrar \`javac 21.0.5\`.
- O segundo mostra **de qual pasta** o Windows está pegando o \`java\`.

Me avisa o que apareceu que a gente continua.`;
await page.route("**/api/pair/conversas?id=*", async (route) => {
  const j = await (await route.fetch()).json();
  if (j.chat?.setup?.folder) j.chat.folderOk = true;
  await route.fulfill({ json: j });
});
await page.route("**/api/pair/conversa", async (route) => {
  const b = route.request().postDataJSON();
  await new Promise((res) => setTimeout(res, 2000));
  const j = await (await page.request.get(`${P(5)}/api/pair/conversas?id=${b.chatId}`)).json();
  const chat = { ...j.chat, folderOk: true, step: 3 };
  await route.fulfill({ json: { chat, message: { id: Date.now(), role: "assistant", text: CONFERIR, step: chat.step, waiting: true } } });
});

// ---------- 1. Landing e login ----------
await page.goto(P(0) + "/", { waitUntil: "networkidle" });
cap("System Design Lab: da vaga que você quer à proposta na mão. Cinco apps que trabalham juntos.");
await move(900, 380);
await wait(3500);
await scrollTo("#apps", 40);
cap("Estudos diz o que estudar, System Design ensina na prática, Entrevista treina o processo seletivo…");
await move(500, 500);
await wait(3000);
cap("…Pair Programming programa o projeto com você e o Hábito garante que você não pare.");
await move(1100, 600);
await wait(3000);

await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await wait(400);
await click(page.getByRole("link", { name: /criar conta ou entrar/i }).first());
await page.waitForLoadState("networkidle");
cap("Uma conta só para os cinco apps: entre com GitHub, Google ou crie com nome e a vaga que você quer.");
await wait(1200);
await click(page.locator('input[placeholder="ex. Matheus"]'));
await type("Matheus", 70);
await click(page.locator('input[type="email"]'));
await type("matheus@exemplo.com", 35);
await wait(1500);
// o cadastro entra na conta de exemplo (já com histórico) em vez de criar uma vazia
await page.route("**/api/conta**", async (route) => {
  if (route.request().method() === "GET") return route.fallback();
  await ctx.addCookies([{ name: "sdl_session", value: cookie, domain: "localhost", path: "/" }]);
  await route.fulfill({ json: { ok: true } });
});
await click(page.getByRole("button", { name: /criar conta e entrar/i }), { pause: 700 });
await page.waitForURL(P(0) + "/");
await page.waitForLoadState("networkidle");
await page.unroute("**/api/conta**");

// ---------- 2. Painel ----------
cap("Entrou, cai no Painel: os cinco apps, o perfil ativo (Java pleno) e os seus projetos.");
await move(700, 420);
await wait(3500);
await scrollTo(page.getByText("Projetos").last(), 120).catch(() => {});
cap("Os projetos de portfólio aparecem com o progresso de cada um, ligados ao GitHub ou marcados à mão.");
await move(600, 450);
await wait(3000);
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
await wait(800);

// ---------- 3. Estudos ----------
await click(page.locator(`a[href^="${P(3)}"]`, { hasText: /abrir/i }).first());
await page.waitForLoadState("networkidle");
cap("ESTUDOS: o quanto você já está pronto para a vaga, com base nos anúncios reais do cargo.");
await move(400, 330);
await wait(3500);
await scrollTo("#vaga", 70);
cap("O que as vagas mais pedem, a faixa salarial e o que você já domina.");
await move(620, 520);
await wait(2500);
const dom = page.locator("li", { hasText: "SQL e PostgreSQL" }).getByRole("button", { name: /domino/i });
if (await dom.count()) await click(dom);
await wait(2000);
await scrollTo(page.getByText("Suas trilhas").first(), 90);
cap("Trilhas de livro, certificação, pós e projetos, e um cronograma que cabe no seu tempo livre.");
await move(560, 470);
await wait(3000);
await scrollTo("#cronograma", 70);
await wait(2500);

// ---------- 4. System Design ----------
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await navTo("System Design");
cap("SYSTEM DESIGN: aprenda arquitetura montando o sistema, jogando carga e vendo onde ele quebra.");
await move(1180, 300);
await wait(3000);
await page.goto(P(1) + "/canvas", { waitUntil: "networkidle" });
cap("No canvas você monta usuários, load balancer, servidores, cache e banco, e simula.");
await wait(1000);
await click("text=1. Um servidor + banco");
await wait(1200);
await click("text=▶ Simular");
cap("Req/s, latência p99, erros e o gargalo aparecem na hora.");
await wait(5000);
await click("text=3. Cache na frente do banco");
cap("Põe um cache na frente do banco, simula de novo e compara os números.");
await wait(1200);
await click("text=▶ Simular");
await wait(5500);
await page.goto(P(1) + "/concorrencia", { waitUntil: "networkidle" });
cap("No laboratório de concorrência, duas transações disputam o último ingresso, passo a passo.");
await wait(1200);
for (let i = 0; i < 6; i++) {
  const b = page.locator("button:has-text('Avançar'):enabled").nth(i % 2);
  if (!(await b.count())) break;
  await click(b, { pause: 200 });
  await wait(700);
}
await click("text=Testar todas as ordens possíveis");
cap("Testa todas as ordens possíveis: o bug aparece em algumas, e as correções nunca quebram.");
await wait(4500);

// ---------- 5. Entrevista ----------
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await navTo("Entrevista");
cap("ENTREVISTA: um processo seletivo inteiro, da triagem à proposta, com um entrevistador de IA.");
await move(1100, 380);
await wait(3000);
await page.goto(P(2) + "/java/pleno", { waitUntil: "networkidle" });
cap("Treino por stack e nível: perguntas de Java pleno, com a profundidade que a vaga pede.");
await move(700, 500);
await wait(2000);
await click(page.locator('main a[href^="/java/pleno/"]').first());
await page.waitForSelector("textarea");
await wait(1200);
await click(page.locator("textarea").first());
await type("Eu usaria uma exceção unchecked, SaldoInsuficienteException, porque é regra de negócio. No @RestControllerAdvice eu transformo ela em 422 para o cliente.", 14);
await wait(300);
await click(page.getByText("Enviar resposta"));
await wait(2400);
cap("Cada resposta volta avaliada: o seu nível, o que faltou, uma resposta de pleno e como falar melhor.");
await scrollTo(page.getByText("Pontos fortes").first(), 140).catch(() => {});
await wait(4500);

// ---------- 6. Pair Programming ----------
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await navTo("Pair Programming");
await scrollTo("#pair-conversas", 16);
cap("PAIR PROGRAMMING: um mentor de IA que programa do seu lado, como um sênior com um júnior.");
await move(900, 300);
await wait(2500);
cap("Ele entrega um passo por vez: o que fazer, por que fazer e como conferir que deu certo.");
await click(page.locator("#pair-conversas button", { hasText: "Configurar o meu ambiente Java" }));
await page.waitForSelector("text=Variáveis de Ambiente…");
const msgs = page.locator("#pair-chat .pair-msgs");
await msgs.evaluate((el) => el.scrollTo({ top: [...el.querySelectorAll(".md")].at(-1).getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12, behavior: "smooth" }));
await move(800, 520);
await wait(3500);
cap("Terminou? Um clique em Pode continuar e ele confere e segue para o próximo passo.");
await click(page.getByRole("button", { name: /pode continuar/i }));
await page.waitForSelector("text=javac -version");
await wait(600);
await msgs.evaluate((el) => el.scrollTo({ top: [...el.querySelectorAll(".md")].at(-1).getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12, behavior: "smooth" }));
await wait(4000);

// ---------- 7. Hábito ----------
await navTo("Hábito");
await page.waitForSelector(".mobo svg");
await page.waitForFunction(() => document.documentElement.scrollHeight > 2000);
await scrollTo(".mobo", 60);
cap("HÁBITO: a sua meta diária vira uma placa-mãe neon. Cada dia cumprido instala ou conserta uma peça.");
await move(900, 560);
await wait(6000);
await scrollTo("text=Meta de hoje", 120);
cap("Respostas, desenhos e blocos de estudo dos outros apps contam sozinhos na meta do dia.");
await wait(1000);
await click(page.locator('input[type="checkbox"]').last());
await wait(2000);
await scrollTo("text=Último ano", 260);
cap("E o calendário mostra cada dia: peça instalada, conserto, desgaste e o dia em que a máquina queimou.");
await move(1180, 760);
await wait(3500);

// ---------- 8. Fecho ----------
await page.goto(P(0) + "/", { waitUntil: "networkidle" });
cap("Cinco apps, uma conta, tudo rodando no seu computador. System Design Lab.");
await move(800, 400);
await wait(4500);

// ---------- vídeo final com legendas ----------
const video = page.video();
await ctx.close();
await ctx.browser()?.close();
const raw = await video.path();
const trim = Math.max(0, cues[0].at - 0.4);
const end = (Date.now() - t0) / 1000;
const ts = (s) => {
  s = Math.max(0, s - trim);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = (s % 60).toFixed(2).padStart(5, "0");
  return `${h}:${String(m).padStart(2, "0")}:${x}`;
};
const ass = [
  "[Script Info]", "ScriptType: v4.00+", "PlayResX: 1280", "PlayResY: 800", "",
  "[V4+ Styles]",
  "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
  "Style: Default,DejaVu Sans,26,&H00FFFFFF,&H00FFFFFF,&H00000000,&HC00B0605,0,0,0,0,100,100,0,0,3,14,0,2,80,80,36,1",
  "", "[Events]", "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
  ...cues.map((c, i) => `Dialogue: 0,${ts(c.at)},${ts(cues[i + 1]?.at ?? end)},Default,,0,0,0,,${c.text.replace(/\n/g, " ")}`),
].join("\n");
const tmp = join(ROOT, ".demo-tmp");
mkdirSync(tmp, { recursive: true });
const assPath = join(tmp, "apresentacao.ass");
writeFileSync(assPath, ass);
mkdirSync(dirname(OUT), { recursive: true });
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(trim), "-i", raw, "-vf", `ass=${assPath}`, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-r", "30", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", OUT]);
rmSync(tmp, { recursive: true, force: true });
console.log(`[apresentacao] ${OUT}`);
