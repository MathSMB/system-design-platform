// Vídeo do Pair Programming: nova conversa, um passo do ambiente, "pode continuar", explicar uma linha e o roteiro.
// Rode semear.mjs, semear-estudos.mjs e semear-pair.mjs antes. As respostas da IA são simuladas aqui.
import { recorder } from "./lib.mjs";

const [cookie] = process.argv.slice(2);
const init = `try{localStorage.setItem("sdl:intro:pair","visto")}catch{}`;
const r = await recorder("pair", { cookie, init });
const { page, cap, wait, move, click, type, scrollTo, finish } = r;
const B = "http://localhost:3005";
const F = "```";

const CONFERIR = `Boa, o JAVA_HOME está certo! Agora o passo 4: **conferir que o terminal enxerga o Java**.

Já vimos o \`java -version\`. Falta o **compilador**, o \`javac\`: é ele que transforma o seu \`.java\` (que você lê) em \`.class\` (que a máquina virtual do Java executa).

${F}powershell
javac -version
where.exe java
${F}

- O primeiro tem que mostrar \`javac 21.0.5\`.
- O segundo mostra **de qual pasta** o Windows está pegando o \`java\`. Tem que ser a pasta do JDK 21. Se aparecer outra antes (um Java antigo), me mostra que a gente arruma a ordem do Path.

Me avisa o que apareceu que a gente continua.`;

const LINHA = `Essa é a linha que **recebe o pedido**:

${F}java
public String buscar(@PathVariable Long id) {
${F}

Parte por parte:
- **\`public\`**: o método pode ser chamado de fora da classe (o Spring precisa chamar).
- **\`String\`**: o tipo do que ele devolve. Por enquanto, um texto; no próximo passo vira um objeto \`Transferencia\`, que o Spring converte em JSON.
- **\`buscar\`**: o nome do método. Use um verbo que diga o que ele faz.
- **\`@PathVariable Long id\`**: pega o pedaço \`{id}\` do endereço e entrega como número (\`Long\`). Em \`/transferencias/42\`, o \`id\` vale 42.
- **\`{\`**: abre o corpo do método, onde fica o que ele faz.

Quando quiser, testa no navegador e me avisa.`;

async function chatOf(id, patch) {
  const j = await (await page.request.get(`${B}/api/pair/conversas?id=${id}`)).json();
  return { ...j.chat, folderOk: true, ...patch };
}
await page.route("**/api/pair/conversas?id=*", async (route) => {
  const j = await (await route.fetch()).json();
  if (j.chat?.setup?.folder) j.chat.folderOk = true;
  await route.fulfill({ json: j });
});
await page.route("**/api/pair/conversa", async (route) => {
  const b = route.request().postDataJSON();
  await new Promise((res) => setTimeout(res, 2200));
  const line = /Explica essa linha/.test(b.text);
  const chat = await chatOf(b.chatId, line ? {} : { step: 3 });
  await route.fulfill({ json: { chat, message: { id: Date.now(), role: "assistant", text: line ? LINHA : CONFERIR, step: chat.step, waiting: true } } });
});

await page.goto(`${B}/`, { waitUntil: "networkidle" });
await scrollTo("#pair-conversas", 16);
cap("Pair Programming: um mentor de IA que programa do seu lado, como um sênior com um júnior.");
await move(900, 300);
await wait(2500);

cap("Você conta o que quer construir e escolhe a stack…");
await click(page.locator("#pair-nova textarea"));
await type("Quero criar a API de transferências do meu projeto de pagamentos", 30);
await click(page.getByRole("button", { name: "Java + Spring Boot" }));
await wait(800);
cap("…e, se quiser, liga a um projeto dos Estudos e à pasta do projeto no computador.");
await click(page.getByText("Ligar aos Estudos e à pasta do projeto"));
await wait(500);
await page.locator("#pair-nova select").selectOption("tproj");
await click(page.locator("#pair-nova input[placeholder^='C:']"));
await type("C:\\Users\\matheus\\projetos\\api-pagamentos", 25);
await wait(1800);

cap("O mentor entrega um passo por vez: o que fazer, por que fazer e como conferir que deu certo.");
await click(page.locator("#pair-conversas button", { hasText: "Configurar o meu ambiente Java" }));
await page.waitForSelector("text=Variáveis de Ambiente…");
const msgs = page.locator("#pair-chat .pair-msgs");
await msgs.evaluate((el) => el.scrollTo({ top: [...el.querySelectorAll(".md")].at(-1).getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12, behavior: "smooth" }));
await move(800, 520);
await wait(4200);
await msgs.evaluate((el) => el.scrollTo({ top: el.scrollHeight, behavior: "smooth" }));
await wait(1500);

cap("Terminou? Um clique em Pode continuar, e ele confirma o que foi feito e segue para o próximo passo.");
await click(page.getByRole("button", { name: /pode continuar/i }));
await page.waitForSelector("text=javac -version");
await wait(800);
await msgs.evaluate((el) => el.scrollTo({ top: [...el.querySelectorAll(".md")].at(-1).getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12, behavior: "smooth" }));
await wait(4000);

cap("No código, cada linha tem explicação: clique numa linha e ele explica parte por parte.");
await click(page.locator("#pair-conversas button", { hasText: "Criar a API de transferências" }));
await page.waitForSelector("text=Parte por parte");
await wait(600);
const line = page.locator(".code-line", { hasText: "public String buscar(@PathVariable Long id)" }).first();
await msgs.evaluate((el, y) => el.scrollTo({ top: y, behavior: "smooth" }), await line.evaluate((n) => { const m = n.closest(".pair-msgs"); return n.getBoundingClientRect().top - m.getBoundingClientRect().top + m.scrollTop - 320; }));
await wait(1200);
await click(line, { pause: 900 });
await page.waitForSelector("text=pega o pedaço");
await wait(800);
await msgs.evaluate((el) => el.scrollTo({ top: [...el.querySelectorAll(".md")].at(-1).getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 12, behavior: "smooth" }));
await wait(4500);

cap("O roteiro mostra onde você vai chegar. E as conversas ficam guardadas por dia, para continuar amanhã de onde parou.");
await click(page.locator("#pair-chat button", { hasText: "Criar o primeiro endpoint" }).first());
await wait(2500);
await move(300, 520);
await wait(3000);

await finish("pair");
