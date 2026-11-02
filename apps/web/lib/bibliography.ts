import type { Ref } from "@/lib/training/types";

export interface BibSection {
  id: string;
  title: string;
  intro: string;
  /** true = veio do roadmap do Renato Augusto no Miro; false = complemento da plataforma */
  fromMiro: boolean;
  items: Ref[];
}

/** Bibliografia: o que veio do Miro do Renato Augusto e o que a plataforma acrescenta. */
export const BIBLIOGRAPHY: BibSection[] = [
  {
    id: "livros",
    title: "Livros técnicos",
    intro: "A lista \"Livros que eu indico\" do roadmap do Renato Augusto no Miro.",
    fromMiro: true,
    items: [
      { title: "System Design Interview, vol. 1", by: "Alex Xu", note: "O ponto de partida para entrevistas: estimativas, cache, filas, sharding." },
      { title: "System Design Interview, vol. 2", by: "Alex Xu e Sahn Lam", note: "Casos maiores: proximidade, chat, pagamentos, bolsa de valores." },
      { title: "Designing Data-Intensive Applications", by: "Martin Kleppmann", note: "Replicação, particionamento e transações (cap. 7 é a base das aulas de concorrência)." },
      { title: "Fundamentos da Arquitetura de Software", by: "Mark Richards e Neal Ford" },
      { title: "Arquitetura de Software: As Partes Difíceis", by: "Neal Ford, Mark Richards, Pramod Sadalage e Zhamak Dehghani", note: "Trade-offs de arquiteturas distribuídas: dados, sagas, granularidade." },
      { title: "Criando Microsserviços, 2ª ed.", by: "Sam Newman" },
      { title: "Migrando Sistemas Monolíticos para Microsserviços", by: "Sam Newman" },
      { title: "Domain-Driven Design", by: "Eric Evans" },
      { title: "Aprenda Domain-Driven Design", by: "Vlad Khononov" },
      { title: "Arquitetura Limpa", by: "Robert C. Martin" },
      { title: "Código Limpo", by: "Robert C. Martin" },
      { title: "Refatoração, 2ª ed.", by: "Martin Fowler" },
      { title: "Padrões de Projeto", by: "Gamma, Helm, Johnson e Vlissides" },
      { title: "O Programador Pragmático", by: "Andrew Hunt e David Thomas" },
    ],
  },
  {
    id: "outros-livros",
    title: "Fora da técnica",
    intro: "Também estão na lista do Renato. Ele insiste que comunicação é a habilidade mais importante do arquiteto.",
    fromMiro: true,
    items: [
      { title: "Como Fazer Amigos e Influenciar Pessoas", by: "Dale Carnegie" },
      { title: "Nada Pode Me Ferir", by: "David Goggins" },
      { title: "Pai Rico, Pai Pobre", by: "Robert T. Kiyosaki" },
      { title: "Os Segredos da Mente Milionária", by: "T. Harv Eker" },
      { title: "O Homem Mais Rico da Babilônia", by: "George S. Clason" },
    ],
  },
  {
    id: "pessoas",
    title: "Pessoas para acompanhar",
    intro: "As 13 referências do Miro.",
    fromMiro: true,
    items: [
      { title: "Alex Xu", url: "https://bytebytego.com/", note: "ByteByteGo." },
      { title: "Neo Kim", url: "https://newsletter.systemdesign.one/", note: "The System Design Newsletter." },
      { title: "Raul Junco", note: "System Design Codex." },
      { title: "Nina Duran" },
      { title: "Nelson Djalo", url: "https://amigoscode.com/", note: "Amigoscode." },
      { title: "Gaurav Sen", url: "https://www.youtube.com/@gkcs", note: "Vídeos de system design." },
      { title: "Martin Fowler", url: "https://martinfowler.com/" },
      { title: "James Lewis", url: "https://martinfowler.com/articles/microservices.html", note: "Coautor, com Fowler, do artigo que definiu microsserviços." },
      { title: "Sam Newman", url: "https://samnewman.io/" },
      { title: "Robert C. Martin", url: "https://blog.cleancoder.com/" },
      { title: "Vaughn Vernon", url: "https://vaughnvernon.com/", note: "Implementando Domain-Driven Design." },
      { title: "Simon Brown", url: "https://c4model.com/", note: "C4 Model para diagramas." },
      { title: "Grady Booch", note: "Um dos criadores da UML." },
    ],
  },
  {
    id: "newsletters",
    title: "Newsletters",
    intro: "Do Miro.",
    fromMiro: true,
    items: [
      { title: "ByteByteGo Newsletter", by: "Alex Xu", url: "https://blog.bytebytego.com/" },
      { title: "The System Design Newsletter", by: "Neo Kim", url: "https://newsletter.systemdesign.one/" },
      { title: "System Design Codex", by: "Raul Junco" },
    ],
  },
  {
    id: "blogs",
    title: "Blogs de engenharia",
    intro: "Os blogs de system design e arquitetura do Miro. Ótimos para ver os conceitos das aulas em sistemas reais.",
    fromMiro: true,
    items: [
      { title: "Azure Architecture Center", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/" },
      { title: "Antipadrões de desempenho", by: "Microsoft Learn", url: "https://learn.microsoft.com/pt-br/azure/architecture/antipatterns/", note: "Retry storm, chatty I/O, busy database: vários aparecem nas aulas." },
      { title: "Netflix Tech Blog", url: "https://netflixtechblog.com/" },
      { title: "The Cloudflare Blog", url: "https://blog.cloudflare.com/" },
      { title: "Stripe Engineering", url: "https://stripe.com/blog/engineering" },
      { title: "Google Cloud Blog", url: "https://cloud.google.com/blog" },
      { title: "Slack Engineering", url: "https://slack.engineering/" },
      { title: "Uber Engineering", url: "https://www.uber.com/blog/engineering/" },
      { title: "LinkedIn Engineering", url: "https://engineering.linkedin.com/blog" },
    ],
  },
  {
    id: "gratuitos",
    title: "Cursos e guias gratuitos",
    intro: "Complementos da plataforma, todos gratuitos.",
    fromMiro: false,
    items: [
      { title: "CS50", by: "Harvard", url: "https://cs50.harvard.edu/x/", note: "Fundamentos de computação." },
      { title: "The System Design Primer", by: "Donne Martin", url: "https://github.com/donnemartin/system-design-primer" },
      { title: "Site Reliability Engineering", by: "Google", url: "https://sre.google/books/", note: "Capítulos sobre sobrecarga e falhas em cascata." },
      { title: "Padrões de projeto em português", by: "Refactoring.Guru", url: "https://refactoring.guru/pt-br/design-patterns" },
      { title: "Cloudflare Learning Center", url: "https://www.cloudflare.com/pt-br/learning/", note: "DNS, CDN e redes, em português." },
      { title: "microservices.io", by: "Chris Richardson", url: "https://microservices.io/patterns/" },
    ],
  },
  {
    id: "concorrencia",
    title: "Concorrência e dados",
    intro: "Complementos da plataforma para as aulas de concorrência.",
    fromMiro: false,
    items: [
      { title: "Transaction Isolation", by: "documentação do PostgreSQL", url: "https://www.postgresql.org/docs/current/transaction-iso.html", note: "O Read Committed que o laboratório simula." },
      { title: "Explicit Locking (SELECT ... FOR UPDATE)", by: "documentação do PostgreSQL", url: "https://www.postgresql.org/docs/current/explicit-locking.html" },
      { title: "Comando SET (opção NX)", by: "documentação do Redis", url: "https://redis.io/docs/latest/commands/set/" },
      { title: "An Investigation of the Therac-25 Accidents", by: "Nancy Leveson e Clark Turner, IEEE Computer, 1993", note: "O caso real da aula Therac-25." },
      { title: "Idempotent Consumer", by: "Chris Richardson", url: "https://microservices.io/patterns/communication-style/idempotent-consumer.html" },
    ],
  },
];
