// Conversas de exemplo do Pair Programming para a conta de demonstração (rode semear.mjs e semear-estudos.mjs antes).
// Uso: node scripts/demos/semear-pair.mjs <profileId>
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "../../packages/db/package.json"));
const postgres = require("postgres");
const sql = postgres(process.env.DATABASE_URL || "postgres://sdp:sdp@localhost:5434/sdp", { onnotice: () => {} });
const pid = process.argv[2];
const day = (offset) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date(Date.now() + offset * 864e5));
const at = (offset, h) => new Date(Date.now() + offset * 864e5 - h * 3600e3);

const F = "```";

const API_PLAN = [
  "Instalar o IntelliJ IDEA Community",
  "Instalar o JDK 21",
  "Configurar JAVA_HOME e Path no Windows",
  "Instalar o Git e se identificar",
  "Criar o projeto no Spring Initializr",
  "Abrir o projeto e rodar pela primeira vez",
  "Criar o primeiro endpoint (controller)",
  "Criar o modelo Transferencia e o serviço",
  "Testar a API com o curl",
  "Primeiro commit e push no GitHub",
  "Escrever o primeiro teste com JUnit",
  "Abrir o pull request",
];

const CONTROLLER = `Boa! A aplicação subiu, então o Spring está funcionando. Agora vem o passo 7: **o primeiro endpoint**.

Um *endpoint* é um endereço da sua API que responde a um pedido. Quando alguém acessar \`GET /transferencias/1\`, a API devolve a transferência número 1. Quem recebe esse pedido no Spring é o **controller**.

1. No IntelliJ, clique com o botão direito em \`src/main/java/com/matheus/pagamentos\` → **New** → **Java Class**.
2. Dê o nome \`TransferenciaController\` e aperte Enter.
3. Digite o código abaixo (digitar ajuda a fixar, mais do que copiar):

**src/main/java/com/matheus/pagamentos/TransferenciaController.java**
${F}java
package com.matheus.pagamentos;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/transferencias")
public class TransferenciaController {

    @GetMapping("/{id}")
    public String buscar(@PathVariable Long id) {
        return "Transferência " + id;
    }
}
${F}

O que está acontecendo, linha por linha:
- \`package\` diz em qual pasta (pacote) a classe mora. Tem que bater com o caminho do arquivo.
- Os \`import\` trazem as anotações do Spring que vamos usar.
- \`@RestController\` avisa o Spring: "esta classe responde pedidos HTTP, e o que ela devolve vai direto na resposta".
- \`@RequestMapping("/transferencias")\` é o começo do endereço de todos os métodos desta classe.
- \`@GetMapping("/{id}")\` liga o método \`buscar\` ao pedido GET em \`/transferencias/algum-número\`.
- \`@PathVariable Long id\` pega o número que veio no endereço e coloca na variável \`id\`.

**Como conferir:** rode a aplicação de novo (botão verde ▶ ao lado do \`main\`) e abra no navegador http://localhost:8080/transferencias/1. Tem que aparecer \`Transferência 1\`.

Me avisa quando aparecer, ou se der algum erro, que a gente continua.`;

const LINE = `Ótima pergunta, essa linha é o "endereço" da classe inteira:

${F}java
@RequestMapping("/transferencias")
${F}

Parte por parte:
- **\`@\`** marca uma *anotação*: uma etiqueta que você cola na classe para o Spring ler na hora de subir a aplicação. Ela não executa nada sozinha; quem lê e age é o Spring.
- **\`RequestMapping\`** quer dizer "mapeamento de pedido": liga um endereço da web a este código.
- **\`"/transferencias"\`** é o pedaço do endereço. Como a anotação está em cima da **classe**, ele vale de prefixo para **todos** os métodos dela.

Por isso o \`@GetMapping("/{id}")\` do método vira, no fim, \`/transferencias/{id}\`. Se amanhã você criar um \`@PostMapping\` sem caminho na mesma classe, ele responde em \`POST /transferencias\`.

Por que fazer assim? Para não repetir \`/transferencias\` em cada método e deixar claro que tudo nesta classe é sobre transferências (uma responsabilidade por classe).

Quando quiser, é só testar no navegador e me avisar que a gente segue.`;

const JAVA_HOME = `Agora o passo 3: **configurar o JAVA_HOME e o Path**.

Por que isso? O JDK está instalado, mas o Windows ainda não sabe **onde** ele está. As *variáveis de ambiente* são como um caderninho de endereços do sistema: o \`JAVA_HOME\` diz onde o Java mora, e o \`Path\` é a lista de pastas onde o terminal procura os comandos que você digita (como \`java\` e \`javac\`).

1. Aperte a tecla **Windows**, digite **variáveis de ambiente** e abra **"Editar as variáveis de ambiente do sistema"**.
2. Clique no botão **Variáveis de Ambiente…** (embaixo, à direita).
3. Em **Variáveis do sistema**, clique em **Novo…**:
   - Nome: \`JAVA_HOME\`
   - Valor: a pasta do JDK, por exemplo \`C:\\Program Files\\Eclipse Adoptium\\jdk-21.0.5.11-hotspot\`
4. Ainda em **Variáveis do sistema**, selecione **Path** → **Editar…** → **Novo** e escreva \`%JAVA_HOME%\\bin\`.
5. Clique **OK** em todas as janelas.
6. **Feche o terminal e abra de novo** (o terminal só lê as variáveis quando abre).

**Como conferir:** no terminal novo, digite:

${F}powershell
echo $env:JAVA_HOME
java -version
${F}

O primeiro tem que mostrar a pasta que você colocou, e o segundo algo como \`openjdk version "21.0.5"\`.

Me avisa quando funcionar (ou cola aqui o que apareceu) que a gente continua.`;

async function chat({ title, d, setup, plan, step, summary, msgs }) {
  const [c] = await sql`insert into pair_chats (profile_id, title, day, summary, setup, plan, step, created_at, updated_at)
    values (${pid}, ${title}, ${day(d)}, ${summary}, ${sql.json(setup)}, ${sql.json(plan)}, ${step}, ${at(d, 3)}, ${at(d, 0)}) returning id`;
  let i = 0;
  for (const [role, text, data] of msgs) await sql`insert into pair_messages (chat_id, role, text, data, created_at) values (${c.id}, ${role}, ${text}, ${sql.json(data ?? {})}, ${at(d, 2 - i++ * 0.05)})`;
  return c.id;
}

// um projeto acoplado pelo próprio Pair Programming (aparece em "Projetos" na lateral, ao lado dos dos Estudos)
const [center] = await sql`select trails from study_centers where profile_id = ${pid}`;
if (center) {
  const trails = (center.trails ?? []).filter((t) => t.id !== "tencurta");
  trails.push({ id: "tencurta", kind: "projeto", title: "Encurtador de URL com Redis", why: "Um encurtador com Spring Boot e cache no Redis, para aprender cache e alta leitura fazendo.", importance: 3, perWeek: 3, sessionMin: 30, hours: 20, deadline: null, skills: ["Spring Boot", "Redis"], units: ["Endpoint para encurtar", "Redirecionar pelo código", "Cache no Redis", "Contador de acessos"].map((title, i) => ({ id: `u${i + 1}`, title, done: i === 0 })) });
  await sql`update study_centers set trails = ${sql.json(trails)} where profile_id = ${pid}`;
}

await sql`delete from pair_messages where chat_id in (select id from pair_chats where profile_id = ${pid})`;
await sql`delete from pair_chats where profile_id = ${pid}`;

await chat({
  title: "Montar um front em React que consome uma API",
  d: -9,
  setup: { goal: "Montar um front em React que consome uma API", stack: "React + TypeScript" },
  plan: ["Instalar o Node.js LTS", "Criar o projeto com o Vite", "Entender a estrutura de pastas", "O primeiro componente", "Estado com useState", "Buscar dados com fetch", "Lista e carregamento", "Formulário", "Publicar no GitHub", "Deploy"],
  step: 2,
  summary: "Ele instalou o Node 22 LTS e criou o projeto com o Vite. Próximo: entender as pastas.",
  msgs: [["user", "Quero montar um front em React que consome uma API\n\nStack: React + TypeScript"], ["assistant", "Vamos lá! Primeiro, o Node.js…", { step: 0, waiting: true }]],
});
await chat({
  title: "Entender Git e GitHub de verdade",
  d: -3,
  setup: { goal: "Entender Git e GitHub de verdade, criando um repositório e fazendo meus primeiros commits", stack: "Git" },
  plan: ["O que é controle de versão", "Instalar o Git", "git init e o primeiro commit", "Staging: o git add", "Ver o histórico", "Criar o repositório no GitHub", "push e pull", "Branch e pull request"],
  step: 7,
  summary: "Fez init, commits, criou o repositório e deu push. Entendeu staging com a analogia da caixa de envio. Falta branch e PR.",
  msgs: [["user", "Pronto, pode continuar."], ["assistant", "Último passo: branch e pull request…", { step: 7, waiting: true }]],
});
await chat({
  title: "Configurar o meu ambiente Java no Windows",
  d: -1,
  setup: { goal: "Quero configurar o meu ambiente Java no Windows: IntelliJ, JDK e variáveis de ambiente", stack: "Java" },
  plan: ["Instalar o IntelliJ IDEA Community", "Instalar o JDK 21", "Configurar JAVA_HOME e Path", "Conferir no terminal", "Primeiro programa no IntelliJ"],
  step: 2,
  summary: "Instalou o IntelliJ Community e o JDK 21 (Temurin) em C:\\Program Files\\Eclipse Adoptium. Agora: JAVA_HOME e Path.",
  msgs: [
    ["user", "Quero configurar o meu ambiente Java no Windows: IntelliJ, JDK e variáveis de ambiente\n\nStack: Java"],
    ["assistant", "Perfeito, vamos montar o ambiente do zero. O roteiro tem 5 passos; começamos pelo IntelliJ…", { step: 0, waiting: true }],
    ["user", "Instalei o JDK, o instalador terminou. Pode continuar."],
    ["assistant", JAVA_HOME, { step: 2, waiting: true }],
  ],
});
await chat({
  title: "Criar a API de transferências do projeto de pagamentos",
  d: 0,
  setup: { goal: 'Quero avançar no projeto "API de pagamentos com Kafka": começar a API de transferências', stack: "Java + Spring Boot", trailId: "tproj", folder: "C:\\Users\\matheus\\projetos\\api-pagamentos" },
  plan: API_PLAN,
  step: 6,
  summary: "Ambiente pronto (IntelliJ, JDK 21, JAVA_HOME, Git). Criou o projeto no Spring Initializr (Web, Validation), pacote com.matheus.pagamentos, e rodou na porta 8080. Agora: o primeiro controller.",
  msgs: [
    ["user", "A aplicação subiu! Apareceu \"Started PagamentosApplication in 2.1 seconds\". Pode continuar."],
    ["assistant", CONTROLLER, { step: 6, waiting: true }],
    ["user", 'Explica essa linha, parte por parte:\n```java\n@RequestMapping("/transferencias")\n```'],
    ["assistant", LINE, { step: 6, waiting: true }],
  ],
});
console.log("ok");
await sql.end();
