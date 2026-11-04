// Vídeo do System Design: capa, canvas com simulação e laboratório de concorrência.
import { recorder } from "./lib.mjs";

const init = `try{localStorage.setItem("sdl:intro:system-design","visto");localStorage.setItem("sdp-tour-canvas-v1","done")}catch{}`;
const r = await recorder("system-design", { init });
const { page, cap, wait, move, click, scrollTo } = r;
const B = "http://localhost:3001";

await page.goto(B + "/", { waitUntil: "networkidle" });
cap("System Design: aprenda arquitetura montando o sistema, colocando carga e vendo onde ele quebra.");
await move(1180, 300);
await wait(3000);
await scrollTo("text=Escolha como quer treinar hoje", 120);
cap("Dois modos: Estudo, com aulas e um mentor, e Entrevista técnica, sem dicas e com nota em estrelas.");
await move(450, 450);
await wait(1500);
await move(1150, 450);
await wait(2000);

await page.goto(B + "/canvas", { waitUntil: "networkidle" });
cap("No canvas você arrasta usuários, load balancer, servidores, cache, fila e banco, e conecta.");
await wait(1200);
await click("text=1. Um servidor + banco");
await wait(1500);
await click("text=▶ Simular");
cap("Simular aplica a carga: req/s, latência p99, erros e o gargalo aparecem na hora.");
await wait(5500);
await click("text=3. Cache na frente do banco");
cap("Põe um cache na frente do banco e simula de novo: dá para comparar os números.");
await wait(1500);
await click("text=▶ Simular");
await wait(6000);

await page.goto(B + "/concorrencia", { waitUntil: "networkidle" });
cap("No laboratório de concorrência, duas transações disputam o último ingresso, passo a passo.");
await wait(1500);
for (let i = 0; i < 4; i++) {
  await click(page.locator("button:has-text('Avançar')").nth(i % 2), { pause: 200 });
  await wait(900);
}
cap("Você vê o dado ficando errado: os dois compram o mesmo ingresso.");
for (let i = 0; i < 4; i++) {
  const b = page.locator("button:has-text('Avançar'):enabled").first();
  if (!(await b.count())) break;
  await click(b, { pause: 200 });
  await wait(900);
}
await wait(1500);
await click("text=Testar todas as ordens possíveis");
cap("E testa todas as ordens possíveis: o bug aparece em algumas, e as correções (lock, UPDATE atômico) nunca quebram.");
await wait(5000);
await r.finish("system-design");
