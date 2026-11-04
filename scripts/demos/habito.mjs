// Vídeo do Hábito: a placa-mãe real com uma conta de exemplo (rode semear.mjs antes).
import { recorder } from "./lib.mjs";

const [cookie, pid] = process.argv.slice(2);
// o "último estado visto" decide a animação: conserto (cena 1) ou queima (cena 2)
const init = `try{
  localStorage.setItem("sdl:intro:habito","visto");
  const burn = sessionStorage.getItem("__scene") === "queima";
  localStorage.setItem("sdp-placa-${pid}", JSON.stringify(burn ? { parts: 15, wear: 5, overclock: 3, reboots: 0 } : { parts: 13, wear: 5, overclock: 0, reboots: 1 }));
}catch{}`;
const r = await recorder("habito", { cookie, init });
const { page, cap, wait, move, click, scrollTo } = r;

await page.goto("http://localhost:3004/", { waitUntil: "domcontentloaded" });
await page.waitForSelector(".mobo svg");
await page.waitForFunction(() => document.documentElement.scrollHeight > 2000);
await scrollTo(".mobo", 60);
cap("O Hábito transforma a sua meta diária numa placa-mãe neon. Aqui ela voltou de 5 níveis de desgaste.");
await wait(3000);
cap("Cada dia cumprido conserta um nível: o fogo apaga, as ventoinhas voltam a girar e peças novas entram.");
await move(900, 560);
await wait(6000);
cap("Com as 15 peças instaladas, cada dia cumprido vira overclock.");
await wait(2500);
await scrollTo("text=Meta de hoje", 120);
cap("A meta do dia: o estudo livre você marca; respostas, etapas e desenhos dos outros apps contam sozinhos.");
await wait(1200);
await click(page.locator('input[type="checkbox"]').last());
await wait(2500);
await scrollTo("text=Último ano", 260);
cap("O calendário mostra cada dia: peça instalada, conserto, failover, desgaste e o dia em que a máquina queimou.");
await move(1180, 760);
await wait(3500);

await page.evaluate(() => sessionStorage.setItem("__scene", "queima"));
await page.reload({ waitUntil: "domcontentloaded" });
await page.waitForSelector(".mobo svg");
await page.waitForFunction(() => document.documentElement.scrollHeight > 2000);
await scrollTo(".mobo", 60);
cap("Se o desgaste chega ao 6º nível, a máquina queima: fogo no VRM e todas as peças saem.");
await wait(5500);
cap("A montagem recomeça do zero, a marca de queimado fica, e cada dia cumprido volta a instalar peças.");
await wait(8000);
await r.finish("habito");
