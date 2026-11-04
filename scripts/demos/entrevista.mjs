// Vídeo da Entrevista: processo seletivo simulado e treino Java com feedback.
// A avaliação da IA é simulada aqui (resposta fixa) para o vídeo não depender do Claude Code.
import { recorder } from "./lib.mjs";

const init = `try{localStorage.setItem("sdl:intro:entrevista","visto")}catch{}`;
const r = await recorder("entrevista", { init });
const { page, cap, wait, move, click, type, scrollTo } = r;
const B = "http://localhost:3002";

const base = {
  covered: ["Exceção de negócio unchecked", "Tradução para HTTP no @RestControllerAdvice"],
  communication: "Clara, com um exemplo concreto do dia a dia.",
};
let calls = 0;
await page.route("**/api/avaliar-resposta", async (route) => {
  calls++;
  await new Promise((res) => setTimeout(res, 1600));
  const rh = calls === 1;
  await route.fulfill({
    json: {
      ...base,
      level: "pleno",
      score: rh ? 7.5 : 7,
      verdict: rh ? "Boa resposta: contexto, ação e resultado." : "Escolheu a exceção certa e explicou o caminho até o cliente; faltou o rollback.",
      strengths: rh ? ["Contexto claro do projeto", "Citou a tecnologia certa"] : ["Escolheu unchecked e justificou", "Citou o @RestControllerAdvice devolvendo 422"],
      gaps: rh ? ["Não disse quanto o tempo caiu"] : ["Não falou do rollback do @Transactional", "Faltou o corpo do erro (código e mensagem)"],
      betterAnswer: rh
        ? "No time de pedidos eu cuidei da API de checkout. O p99 estava em 900 ms; coloquei cache no catálogo e caiu para 180 ms."
        : "Eu criaria uma SaldoInsuficienteException unchecked, porque é regra de negócio e não algo que o chamador vá tratar. Ela desfaz a transação do @Transactional e o @RestControllerAdvice traduz para 422 com um corpo padrão: código, mensagem e o id da transferência.",
      howToSay: rh ? ["Abra com o resultado em número"] : ["Comece pela decisão: unchecked", "Explique o porquê em uma frase", "Feche com o que o cliente da API recebe"],
      reply: rh ? "Legal, gostei do exemplo. Vou passar para o time técnico." : "Certo, entendi.",
      followUp: "",
    },
  });
});

await page.goto(B + "/", { waitUntil: "networkidle" });
cap("Entrevista técnica: treine para o processo seletivo de verdade, com um entrevistador de IA que avalia cada resposta.");
await move(1100, 380);
await wait(3000);

await page.goto(B + "/processo-seletivo", { waitUntil: "networkidle" });
cap("No processo seletivo simulado você escolhe área, stack, nível e a empresa.");
await wait(900);
await click(page.getByText("Back-end").first());
await wait(700);
await click(page.locator('button:has-text("Java e Spring Boot")').first());
await wait(700);
await click(page.locator('button:has-text("Pleno")').first());
await wait(700);
cap("Cada empresa tem cultura, etapas e eventos diferentes, baseados em relatos reais de candidatos.");
await click(page.locator('button:has-text("Pagamentos")').first());
await wait(1800);

cap("Começa na triagem, como na vida real: experiência, pretensão e tecnologias.");
await click(page.locator("input[type=number]").nth(0));
await type("4", 120);
await click(page.locator("input[type=number]").nth(1));
await type("9000", 90);
await click(page.locator('button:has-text("Sim")').first());
await click(page.locator("textarea").first());
await type("Java 17, Spring Boot 3, Kafka, PostgreSQL, JUnit, Docker", 22);
await wait(400);
await click(page.getByText("Enviar candidatura"));
await wait(1800);
await click(page.getByText("Próxima etapa").first());
await wait(1800);

cap("Na conversa com o RH você responde por escrito ou falando; a IA responde no papel da recrutadora.");
await click(page.locator("textarea").first());
await type("No meu último projeto fiz a API de pedidos com Spring Boot e PostgreSQL e reduzi o tempo de resposta com cache no catálogo.", 18);
await wait(500);
await click(page.getByText("Enviar resposta"));
await wait(3200);
await move(1000, 640);
await wait(2000);

await page.goto(B + "/java/pleno", { waitUntil: "networkidle" });
cap("Treino avulso: perguntas de Java pleno por bloco, com o nível de profundidade que a vaga pede.");
await move(700, 500);
await wait(2200);
await click(page.locator('main a[href^="/java/pleno/"]').first());
await page.waitForSelector("textarea");
await wait(1500);
await click(page.locator("textarea").first());
await type("Eu usaria uma exceção unchecked, SaldoInsuficienteException, porque é regra de negócio. No @RestControllerAdvice eu transformo ela em 422 para o cliente da API.", 16);
await wait(400);
await click(page.getByText("Enviar resposta"));
await wait(2600);
cap("O feedback diz o nível da sua resposta, o que faltou, uma resposta de pleno e como falar melhor.");
await scrollTo(page.getByText("Pontos fortes").first(), 140).catch(() => {});
await wait(4500);
await wait(1500);
await r.finish("entrevista");
