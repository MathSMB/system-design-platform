// Vídeo dos Estudos: central com pesquisa da vaga, lacunas, trilhas, projetos, cronograma e conversa.
// Rode semear.mjs e semear-estudos.mjs antes. A resposta da IA na conversa é simulada aqui.
import { recorder } from "./lib.mjs";

const [cookie] = process.argv.slice(2);
const init = `try{localStorage.setItem("sdl:intro:estudos","visto")}catch{}`;
const r = await recorder("estudos", { cookie, init });
const { page, cap, wait, move, click, type, scrollTo } = r;

await page.route("**/api/estudos/conversa", async (route) => {
  await new Promise((res) => setTimeout(res, 1800));
  const units = ["Arquitetura de software", "Spring na prática", "Bancos relacionais", "Mensageria", "Testes automatizados", "Cloud e DevOps", "Microsserviços", "Segurança", "Observabilidade", "Projeto integrador"];
  await route.fulfill({
    json: {
      reply: "Boa! Montei a pós como trilha: 10 matérias, 2 sessões de 30 minutos por semana até junho. Microsserviços e mensageria cobrem duas lacunas da vaga.",
      action: "add_trail",
      trail: { id: "tpos", kind: "pos", title: "Pós em Engenharia de Software", why: "Cobre microsserviços e mensageria, que faltam para a vaga.", importance: 2, perWeek: 2, sessionMin: 30, deadline: null, skills: ["Microsserviços", "Kafka ou RabbitMQ"], units: units.map((title, i) => ({ id: `u${i + 1}`, title, done: false })) },
      note: "",
    },
  });
});

await page.goto("http://localhost:3003/", { waitUntil: "networkidle" });
cap("Central de estudos: do anúncio da vaga à meta de hoje. Aqui, o quanto você já está pronto para Java pleno.");
await move(400, 330);
await wait(3500);

await scrollTo("#vaga", 70);
cap("A IA pesquisa os anúncios do cargo e mostra o que mais pedem, com a faixa salarial e perguntas de entrevista.");
await move(620, 520);
await wait(3500);
cap("Você marca o que já sabe: não sei, estudando ou domino. O quanto está pronto muda na hora.");
await click(page.locator("li", { hasText: "SQL e PostgreSQL" }).getByRole("button", { name: /domino/i }));
await wait(2500);

await scrollTo("#lacunas", 70);
cap("As lacunas: o que a vaga mais pede e você ainda não domina, em ordem de prioridade.");
await wait(3500);

await scrollTo(page.getByText("Suas trilhas").first(), 90);
cap("Trilhas: livro, certificação, pós, curso e projetos, divididos em capítulos, módulos ou entregas.");
await move(560, 470);
await wait(3500);

await scrollTo(page.getByText("Projetos para o portfólio").first(), 90);
cap("A IA sugere projetos de portfólio que praticam exatamente o que falta para a vaga.");
await move(1000, 380);
await wait(3200);

await scrollTo("#cronograma", 70);
cap("O cronograma encaixa tudo no seu tempo livre, em blocos curtos, com revisão espaçada e folga para imprevistos.");
await wait(3000);
const kafka = page.locator("label", { hasText: "Projeto: evento no Kafka com idempotência" });
await scrollTo(kafka, 330);
cap("Cada bloco feito conta na meta do dia do Hábito e entra no histórico.");
await click(kafka.locator('input[type="checkbox"]'));
await wait(1500);
await click(page.locator("label", { hasText: "Treino com nota" }).locator('input[type="checkbox"]'));
await wait(2500);

await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await wait(500);
await click(page.getByRole("button", { name: /conversar com a ia/i }).first());
await wait(1200);
cap("E você conversa com a IA para juntar a pós, o livro ou a prova que já está fazendo.");
await click(page.locator("aside textarea"));
await type("Comecei uma pós em Engenharia de Software, tem 10 matérias e termina em junho.", 22);
await page.keyboard.press("Enter");
await wait(3500);
await click(page.getByText("Adicionar à central ▶"));
cap("Ela monta a trilha e você adiciona com um clique; depois é só replanejar o cronograma.");
await wait(3500);
await r.finish("estudos");
