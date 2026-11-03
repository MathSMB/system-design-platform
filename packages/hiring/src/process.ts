import type { AskStep, Option } from "./types";
import { POINTS } from "./types";

const G = (text: string, why: string): Option => ({ text, level: "pleno", why });
const M = (text: string, why: string): Option => ({ text, level: "livro", why });
const B = (text: string, why: string): Option => ({ text, level: "errada", why });

// ───────────────────────── Empresas ─────────────────────────

export type CompanyId = "tucano" | "orbita" | "serra";
export type StageId = "triagem" | "rh" | "teste" | "tecnica" | "gestor" | "proposta" | "admissao";

export interface Company {
  id: CompanyId;
  name: string;
  kind: string;
  /** Inspiração real, em uma frase (sem citar nomes na tela do processo). */
  pattern: string;
  city: string;
  model: string;
  /** Faixa CLT mensal do pleno nessa empresa (R$). */
  band: [number, number];
  /** Regimes que a empresa oferece. */
  regimes: ("CLT" | "PJ")[];
  testFormat: "revisao" | "takehome";
  /** Quem conduz cada etapa (aparece no topo da etapa). */
  who: Record<Exclude<StageId, "admissao">, string>;
  /** A técnica começa com perguntas de soft skills (relato PicPay). */
  softWarmup: boolean;
  /** A técnica inclui um bug de concorrência (reaproveita Entrevista › Concorrência). */
  raceQuestion: boolean;
  days: string;
  jobAd: { title: string; about: string; must: string[]; nice: string[]; offer: string[] };
}

export const COMPANIES: Company[] = [
  {
    id: "tucano",
    name: "Tucano Bank",
    kind: "Banco digital",
    pattern: "Formato de banco digital: entrevista técnica com 3 devs começando por soft skills, fit cultural curto, cerca de 3 semanas.",
    city: "São Paulo",
    model: "Remoto, com encontros trimestrais",
    band: [8500, 11500],
    regimes: ["CLT"],
    testFormat: "revisao",
    who: { triagem: "Formulário da vaga (Gupy)", rh: "Larissa, tech recruiter", teste: "Revisão de código com o time", tecnica: "3 devs do time de Pagamentos (júnior, pleno e sênior)", gestor: "Diego, engineering manager", proposta: "Larissa, tech recruiter" },
    softWarmup: true,
    raceQuestion: true,
    days: "cerca de 3 semanas",
    jobAd: {
      title: "Pessoa Engenheira de Software Pleno · Java (Pagamentos)",
      about: "Time responsável por Pix e transferências: 40 milhões de transações por mês.",
      must: ["Java 17+ e Spring Boot 3", "APIs REST e mensageria (Kafka)", "PostgreSQL e JPA", "Testes automatizados (JUnit, Mockito)", "Docker"],
      nice: ["Kubernetes", "AWS", "Observabilidade (Grafana, OpenTelemetry)"],
      offer: ["CLT", "Vale-refeição flexível", "Plano de saúde e odontológico", "PLR", "Auxílio home office"],
    },
  },
  {
    id: "orbita",
    name: "Órbita Consultoria",
    kind: "Consultoria",
    pattern: "Formato de consultoria: RH, gerente técnico e arquiteto em conversas separadas; vaga para alocação num cliente.",
    city: "Belo Horizonte",
    model: "Híbrido no cliente, 2 vezes por semana",
    band: [6000, 8500],
    regimes: ["CLT", "PJ"],
    testFormat: "revisao",
    who: { triagem: "Formulário da vaga (Gupy)", rh: "Patrícia, recrutadora", teste: "Revisão de código com o gerente técnico", tecnica: "Rafael, arquiteto de soluções", gestor: "Marcos, gerente técnico do cliente", proposta: "Patrícia, recrutadora" },
    softWarmup: false,
    raceQuestion: true,
    days: "cerca de 2 semanas",
    jobAd: {
      title: "Desenvolvedor(a) Java Pleno · alocação em cliente do setor bancário",
      about: "Projeto de modernização: sair de um legado Java EE para microsserviços Spring Boot.",
      must: ["Java 11+ e Spring Boot", "Microsserviços e REST", "Oracle ou PostgreSQL", "Git e metodologias ágeis"],
      nice: ["Kafka ou RabbitMQ", "Java EE (EJB, JSF)", "Inglês intermediário"],
      offer: ["CLT ou PJ", "Vale-refeição", "Plano de saúde", "Trilha de certificações"],
    },
  },
  {
    id: "serra",
    name: "Serra Sistemas",
    kind: "Software house de BH",
    pattern: "Formato de empresa de produto média: desafio para fazer em casa e conversa com o tech lead sobre as suas decisões.",
    city: "Belo Horizonte",
    model: "Híbrido, 2 vezes por semana na Savassi",
    band: [6500, 9000],
    regimes: ["CLT"],
    testFormat: "takehome",
    who: { triagem: "Formulário da vaga", rh: "Júlia, analista de pessoas", teste: "Desafio para fazer em casa (72 h)", tecnica: "Bruno, tech lead", gestor: "Ana, CTO", proposta: "Júlia, analista de pessoas" },
    softWarmup: false,
    raceQuestion: false,
    days: "cerca de 2 semanas",
    jobAd: {
      title: "Desenvolvedor(a) Back-end Java Pleno · produto de agendamento",
      about: "SaaS de agendamento para clínicas e salões, 3 mil clientes.",
      must: ["Java e Spring Boot", "PostgreSQL e Flyway", "Testes (JUnit, Testcontainers)", "Docker e CI"],
      nice: ["Redis", "React", "AWS"],
      offer: ["CLT", "Vale-alimentação", "Plano de saúde", "Day off no aniversário"],
    },
  },
];

/**
 * Referência de mercado para Java Pleno (pesquisada em 03/11/2026). Mostrada na proposta.
 * A faixa das empresas fictícias segue estes números: BH entre R$ 6 e 9 mil,
 * banco digital remoto um pouco acima.
 */
export const MARKET = {
  updated: "nov/2026",
  sources: [
    { label: "Glassdoor, Java Pleno em BH", value: "média R$ 7 mil, de R$ 4 a 9 mil (50 salários)", url: "https://www.glassdoor.com.br/Sal%C3%A1rios/belo-horizonte-mg-desenvolvedor-java-pleno-sal%C3%A1rio-SRCH_IL.0,17_IC2514646_KO18,42.htm" },
    { label: "Indeed, Java Pleno no Brasil", value: "média R$ 6.452 (jul/2026); SP R$ 7.433", url: "https://br.indeed.com/career/desenvolvedor-java-pleno/salaries" },
    { label: "Vagas anunciadas em BH (ProgramaThor)", value: "back-end pleno até R$ 8 mil; pleno/sênior até R$ 12 mil", url: "https://programathor.com.br/jobs-java/belo-horizonte" },
  ],
};

export const getCompany = (id: string) => COMPANIES.find((c) => c.id === id);

/** Todas as etapas, sempre nesta ordem. */
export const STAGES: { id: StageId; title: string; short: string }[] = [
  { id: "triagem", title: "Vaga e triagem", short: "Triagem" },
  { id: "rh", title: "Conversa com o RH", short: "RH" },
  { id: "teste", title: "Teste técnico", short: "Teste" },
  { id: "tecnica", title: "Entrevista técnica", short: "Técnica" },
  { id: "gestor", title: "Gestor e fit cultural", short: "Gestor" },
  { id: "proposta", title: "Proposta", short: "Proposta" },
  { id: "admissao", title: "Admissão", short: "Admissão" },
];

/** Nota mínima (fração dos pontos) para passar de cada etapa avaliada. */
export const PASS: Partial<Record<StageId, number>> = { triagem: 1, rh: 0.6, teste: 0.6, tecnica: 0.6, gestor: 0.6 };

// ───────────────────────── Triagem ─────────────────────────

/** Pergunta de formulário. `knockout` elimina na hora (filtro automático). */
export interface FormQuestion {
  q: string;
  options: (Option & { knockout?: boolean; note?: string })[];
}

export function triagemForm(c: Company): FormQuestion[] {
  const [lo, hi] = c.band;
  const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR")}`;
  return [
    {
      q: "Há quanto tempo você trabalha com Java e Spring Boot?",
      options: [
        { ...B("Menos de 1 ano", "A vaga pede pleno (2 a 5 anos). O filtro elimina automaticamente."), knockout: true },
        G("De 2 a 5 anos", "Dentro do que a vaga pede."),
        { ...M("Mais de 8 anos", "Passa, mas o recrutador vai perguntar por que um sênior quer uma vaga pleno."), note: "Perfil acima da vaga: confirmar expectativa." },
      ],
    },
    {
      q: `Qual sua pretensão salarial mensal (CLT)?`,
      options: [
        { ...M(`${fmt(Math.round((lo * 0.75) / 500) * 500)}`, "Passa, mas abaixo da faixa: a proposta vai partir daqui e você deixa dinheiro na mesa."), note: "Pretensão abaixo do mercado." },
        G(`${fmt(Math.round(((lo + hi) / 2) / 500) * 500)}`, "Dentro da faixa e baseada em pesquisa."),
        { ...B(`${fmt(Math.round((hi * 1.5) / 500) * 500)}`, "Bem acima do teto: o filtro da vaga corta antes de alguém ler o currículo."), knockout: true },
      ],
    },
    {
      q: `O trabalho é: ${c.model}. Você tem disponibilidade?`,
      options: [
        G("Sim", "Disponível no modelo da vaga."),
        ...(c.model.startsWith("Remoto")
          ? [M("Sim, mas prefiro presencial", "Passa, mas fica a dúvida se a vaga combina com você.")]
          : [{ ...B("Só trabalho 100% remoto", "Incompatível com o modelo da vaga: eliminado no filtro."), knockout: true }]),
      ],
    },
    {
      q: "Quais destas tecnologias você já usou em projeto real?",
      options: [
        G(`${c.jobAd.must.slice(0, 3).join(", ")} e mais`, "Bate com os requisitos obrigatórios."),
        { ...B("Só Java básico, sem Spring", "Spring Boot é obrigatório em todas as vagas de pleno. O filtro elimina."), knockout: true },
        M("Spring Boot, mas só em cursos", "Passa, mas o técnico vai pedir exemplos reais."),
      ],
    },
  ];
}

/** Candidatura preenchida em campos livres, como num formulário da Gupy. */
export interface Application {
  years: number;
  /** Pretensão mensal CLT em R$. */
  salary: number;
  /** Aceita o modelo de trabalho da vaga. */
  available: boolean;
  /** Tecnologias que já usou em projeto real, em texto livre. */
  techs: string;
}

export interface Screening {
  /** Motivo do corte automático, quando há. */
  knockout?: string;
  notes: { text: string; bad: boolean }[];
  askedLow: boolean;
}

/** Filtro automático da vaga: as regras que um ATS aplica antes de alguém ler o currículo. */
export function screenApplication(c: Company, a: Application): Screening {
  const [lo, hi] = c.band;
  const notes: Screening["notes"] = [];
  let knockout: string | undefined;
  const t = a.techs.toLowerCase();
  if (a.years < 2) knockout = "A vaga pede pleno (2 a 5 anos com Java). Com menos de 2 anos, o filtro corta automaticamente.";
  else if (a.years > 8) notes.push({ text: "Perfil acima da vaga: o recrutador vai perguntar por que um sênior quer uma vaga de pleno.", bad: true });
  else notes.push({ text: "Experiência dentro do que a vaga pede.", bad: false });
  if (!knockout && a.salary > hi * 1.3) knockout = `Pretensão de R$ ${a.salary.toLocaleString("pt-BR")} bem acima do teto da vaga: o filtro corta antes de alguém ler o currículo.`;
  const askedLow = a.salary > 0 && a.salary < lo * 0.9;
  if (askedLow) notes.push({ text: "Pretensão abaixo da faixa: a proposta vai partir daqui e você deixa dinheiro na mesa.", bad: true });
  else if (a.salary <= hi * 1.3) notes.push({ text: a.salary > hi ? "Pretensão acima do teto, mas ainda negociável." : "Pretensão dentro da faixa.", bad: a.salary > hi });
  if (!knockout && !a.available) knockout = `Indisponível no modelo da vaga (${c.model}): eliminado no filtro.`;
  if (!knockout && !/spring/.test(t)) knockout = "Spring Boot é obrigatório nesta vaga e não apareceu nas suas tecnologias. O filtro elimina.";
  const hits = c.jobAd.must.filter((m) => m.toLowerCase().split(/[^a-zà-ú0-9]+/).some((w) => w.length > 2 && !["e", "com", "ou"].includes(w) && t.includes(w)));
  if (!knockout) notes.push({ text: `Bateu ${hits.length} de ${c.jobAd.must.length} requisitos obrigatórios nas tecnologias.`, bad: hits.length < c.jobAd.must.length / 2 });
  return { knockout, notes, askedLow };
}

// ───────────────────────── Conversa com o RH ─────────────────────────

/** Pergunta com o que o recrutador anota sobre cada resposta. */
export interface NotedStep {
  q: string;
  options: (Option & { note: string })[];
}

export function rhQuestions(c: Company): NotedStep[] {
  return [
    {
      q: "Para começar, me conta um pouco sobre você e sua trajetória.",
      options: [
        { ...G("Resumo de 1 a 2 minutos: quantos anos com Java/Spring, o domínio em que trabalho, uma entrega com número (\"reduzi o tempo da conciliação de 4 h para 20 min\") e por que esta vaga.", "Objetivo, com resultado concreto e ligado à vaga."), note: "Comunicação clara, resultado mensurável." },
        { ...M("Conto desde a faculdade, passando por cada emprego.", "Informação certa, mas longa demais: o recrutador perde o fio."), note: "Resposta longa, pouco foco." },
        { ...B("Está tudo no meu currículo.", "Soa desinteressado: esta pergunta é para ver como você se comunica."), note: "Pouco engajamento." },
      ],
    },
    {
      q: "Por que você está buscando uma nova oportunidade?",
      options: [
        { ...G("Quero trabalhar com sistemas de maior escala e mensageria, que no meu time atual não temos. Aprendi muito lá, mas o próximo passo está aqui.", "Motivo de crescimento, ligado à vaga, sem falar mal de ninguém."), note: "Motivação alinhada à vaga." },
        { ...M("Busco crescimento e novos desafios.", "Aceitável, mas genérico: todos dizem isso."), note: "Motivação genérica." },
        { ...B("Meu gestor é desorganizado e a empresa não valoriza ninguém.", "Falar mal do emprego atual é um dos sinais de alerta mais anotados pelo RH."), note: "Falou mal da empresa atual." },
      ],
    },
    {
      q: `Por que a ${c.name}?`,
      options: [
        { ...G(`Li sobre o produto e a stack: ${c.jobAd.about.toLowerCase()} Trabalhar com ${c.jobAd.must[0]} nesse contexto é o que eu procuro.`, "Mostra que pesquisou a empresa."), note: "Pesquisou a empresa." },
        { ...M("Vi a vaga e o perfil bate com o meu.", "Honesto, mas não mostra interesse específico."), note: "Interesse pouco específico." },
        { ...B("Estou aplicando para várias, a de vocês foi a primeira a responder.", "Sincero demais: o recrutador conclui que você aceitaria qualquer uma."), note: "Sem interesse na empresa." },
      ],
    },
    {
      q: "Qual sua pretensão salarial?",
      options: [
        { ...G(`Pesquisei a faixa de pleno em ${c.city} e, considerando o pacote completo, minha expectativa fica entre R$ ${Math.round(((c.band[0] + c.band[1]) / 2) / 500) * 500} e R$ ${Math.round((c.band[1] * 0.97) / 500) * 500}. Qual a faixa de vocês para a vaga?`, "Faixa pesquisada, dentro do mercado, e devolveu a pergunta."), note: "Pretensão alinhada e fundamentada." },
        { ...M("O que vocês oferecerem está bom.", "Sem número, a proposta tende a vir no piso da faixa."), note: "Não informou pretensão." },
        { ...B(`R$ ${Math.round((c.band[0] * 0.6) / 500) * 500}, para garantir a vaga.`, "Pedir pouco não garante a vaga e pode passar insegurança."), note: "Pretensão muito abaixo do mercado." },
      ],
    },
    {
      q: c.regimes.includes("PJ") ? "Temos CLT e PJ. Qual você prefere?" : "A vaga é CLT. Tudo bem para você?",
      options: c.regimes.includes("PJ")
        ? [
            { ...G("Prefiro CLT. Se for PJ, preciso comparar o pacote: o valor PJ precisa ser uns 40% a 50% maior para compensar férias, 13º, FGTS e benefícios.", "Sabe a conta e deixa a porta aberta."), note: "Entende CLT x PJ." },
            { ...M("Tanto faz.", "Na hora da proposta, isso vira desvantagem para negociar."), note: "Indiferente ao regime." },
            { ...B("PJ, pelo mesmo valor do CLT.", "PJ pelo mesmo valor bruto é perder cerca de um terço do pacote."), note: "Não conhece a diferença de CLT e PJ." },
          ]
        : [
            { ...G("Sim, CLT é o que eu prefiro. Pode me contar os benefícios?", "Confirma e já busca entender o pacote."), note: "Ok com o regime." },
            { ...M("Sim.", "Ok, mas perdeu a chance de entender o pacote."), note: "Ok com o regime." },
            { ...B("Só aceito PJ.", "Incompatível com a vaga."), note: "Regime incompatível." },
          ],
    },
    {
      q: "Se aprovado, quando você poderia começar?",
      options: [
        { ...G("Tenho 30 dias de aviso prévio. Consigo negociar para 15, mas prefiro sair bem da empresa atual.", "Honesto e profissional: o RH valoriza quem não deixa o time na mão."), note: "Disponibilidade clara e ética." },
        { ...M("Imediatamente, posso sair amanhã.", "Rápido, mas o recrutador se pergunta se você faria o mesmo com eles."), note: "Sairia sem aviso." },
        { ...B("Só daqui a uns 3 meses, quero terminar um projeto.", "Longo demais para uma vaga aberta: tende a eliminar."), note: "Disponibilidade muito tardia." },
      ],
    },
    {
      q: "Você está participando de outros processos?",
      options: [
        { ...G("Sim, de mais um, em fase inicial. Mas a vaga de vocês é minha prioridade por causa do time de produto.", "Honesto e mostra prioridade sem blefe."), note: "Transparente sobre outros processos." },
        { ...M("Não.", "Tudo bem, se for verdade."), note: "Sem outros processos." },
        { ...B("Sim, tenho uma proposta 30% maior e preciso de resposta até amanhã.", "Blefe pressionando o RH costuma acelerar a eliminação, não a proposta."), note: "Pressionou com outra proposta." },
      ],
    },
  ];
}

// ───────────────────────── Teste técnico: revisão de código ─────────────────────────

export const ISSUE_KINDS = [
  "Consulta dentro de loop (N+1)",
  "Consulta sem paginação",
  "Transação ou atomicidade errada",
  "Corrida entre requisições",
  "Dado sensível exposto",
  "Falta validação de entrada",
  "Erro engolido",
  "Status HTTP errado",
  "Teste que não testa",
] as const;
export type IssueKind = (typeof ISSUE_KINDS)[number];

export interface CodeReview {
  id: string;
  title: string;
  context: string;
  lines: string[];
  /** Linha (base 1) → problema plantado. */
  issues: { line: number; kind: IssueKind; why: string }[];
}

export const REVIEWS: Record<"transferencia" | "relatorio", CodeReview> = {
  transferencia: {
    id: "transferencia",
    title: "PR #482 · Transferência entre contas",
    context: "Um dev do time abriu este PR. Revise: clique nas linhas com problema e diga qual é. Linhas sem problema não precisam de comentário.",
    lines: [
      "@RestController",
      "@RequestMapping(\"/transferencias\")",
      "class TransferenciaController {",
      "  private final TransferenciaService service;",
      "  @PostMapping",
      "  ResponseEntity<Void> transferir(@RequestBody TransferenciaRequest req) {",
      "    log.info(\"transferência {} senha={}\", req, req.senhaTransacao());",
      "    service.transferir(req);",
      "    return ResponseEntity.ok().build();",
      "  }",
      "}",
      "",
      "@Service",
      "class TransferenciaService {",
      "  public void transferir(TransferenciaRequest req) {",
      "    Conta origem = contas.findById(req.origem()).orElseThrow();",
      "    Conta destino = contas.findById(req.destino()).orElseThrow();",
      "    if (origem.getSaldo().compareTo(req.valor()) >= 0) {",
      "      origem.setSaldo(origem.getSaldo().subtract(req.valor()));",
      "      contas.save(origem);",
      "      destino.setSaldo(destino.getSaldo().add(req.valor()));",
      "      contas.save(destino);",
      "    }",
      "    try {",
      "      notificacao.enviar(origem.getCliente(), req.valor());",
      "    } catch (Exception e) { }",
      "  }",
      "}",
    ],
    issues: [
      { line: 6, kind: "Falta validação de entrada", why: "Sem @Valid: valor negativo ou zero passa e vira uma transferência ao contrário." },
      { line: 7, kind: "Dado sensível exposto", why: "A senha da transação vai para o log, que muita gente lê e que fica guardado." },
      { line: 9, kind: "Status HTTP errado", why: "Criou um recurso: o certo é 201 Created. E quando falta saldo, o método não faz nada e ainda devolve 200." },
      { line: 15, kind: "Transação ou atomicidade errada", why: "Sem @Transactional: se cair entre os dois save, o dinheiro sai da origem e não chega no destino." },
      { line: 18, kind: "Corrida entre requisições", why: "Ler o saldo, conferir e gravar depois: duas transferências simultâneas passam pela checagem com o mesmo saldo (lost update). Precisa de UPDATE atômico, FOR UPDATE ou @Version." },
      { line: 26, kind: "Erro engolido", why: "catch vazio: a notificação falha e ninguém fica sabendo. No mínimo logar, e de preferência enviar por evento." },
    ],
  },
  relatorio: {
    id: "relatorio",
    title: "PR #91 · Relatório de agendamentos por profissional",
    context: "Revise este PR do time do cliente. Clique nas linhas com problema e diga qual é.",
    lines: [
      "@GetMapping(\"/relatorios/profissionais\")",
      "List<ProfissionalDTO> relatorio(@RequestParam String inicio) {",
      "  LocalDate data = LocalDate.parse(inicio);",
      "  List<Profissional> todos = profissionais.findAll();",
      "  List<ProfissionalDTO> out = new ArrayList<>();",
      "  for (Profissional p : todos) {",
      "    long total = agendamentos.countByProfissionalAndDataAfter(p, data);",
      "    out.add(new ProfissionalDTO(p.getNome(), p.getCpf(), p.getEmail(), total));",
      "  }",
      "  return out;",
      "}",
      "",
      "@Test",
      "void relatorioFunciona() {",
      "  when(profissionais.findAll()).thenReturn(List.of(ana, bruno));",
      "  var r = controller.relatorio(\"2026-01-01\");",
      "  assertNotNull(r);",
      "}",
    ],
    issues: [
      { line: 3, kind: "Falta validação de entrada", why: "Data inválida estoura DateTimeParseException e vira 500. Use @DateTimeFormat com LocalDate no parâmetro ou valide e devolva 400." },
      { line: 4, kind: "Consulta sem paginação", why: "findAll sem paginação traz todos os profissionais para a memória. Com milhares, a tela trava." },
      { line: 7, kind: "Consulta dentro de loop (N+1)", why: "Uma consulta de contagem por profissional: 1 + N consultas. Um GROUP BY resolve numa consulta só." },
      { line: 8, kind: "Dado sensível exposto", why: "CPF e e-mail de todos os profissionais num relatório que não precisa deles (LGPD)." },
      { line: 17, kind: "Teste que não testa", why: "assertNotNull passa até com lista vazia: o teste não confere os totais." },
    ],
  },
};

/** Nota da revisão: acerto de linha e tipo = 1; linha certa e tipo errado = 0,5; linha sem problema marcada = −0,5. */
export function scoreReview(review: CodeReview, marks: Record<number, IssueKind>): { score: number; max: number } {
  let score = 0;
  for (const [lineStr, kind] of Object.entries(marks)) {
    const issue = review.issues.find((i) => i.line === Number(lineStr));
    if (!issue) score -= 0.5;
    else score += issue.kind === kind ? 1 : 0.5;
  }
  return { score: Math.max(0, score), max: review.issues.length };
}

export const reviewFor = (c: Company) => (c.id === "tucano" ? REVIEWS.transferencia : REVIEWS.relatorio);

// ───────────────────────── Teste técnico: desafio para casa ─────────────────────────

export const TAKEHOME = {
  title: "Desafio: API de agendamento",
  brief: [
    "Crie uma API em Java 17+ e Spring Boot para clientes agendarem horários com profissionais.",
    "Regras: um profissional não pode ter dois agendamentos no mesmo horário; o cliente cancela até 2 horas antes.",
    "Entregue em até 72 horas, num repositório público, com README explicando como rodar e suas decisões.",
    "Avaliamos: funcionamento, organização, testes, tratamento de erros e o README.",
  ],
  /** Você "entregou"; na conversa, o tech lead pergunta sobre as decisões. */
  defense: [
    {
      q: "Como você garantiu que dois clientes não marquem o mesmo horário ao mesmo tempo?",
      options: [
        G("Constraint UNIQUE (profissional_id, inicio) no banco, ou EXCLUDE com tstzrange no PostgreSQL para horários que se sobrepõem. A aplicação trata a violação e devolve 409. E tem um teste com duas threads.", "A regra está no banco, que resolve a corrida, e foi testada."),
        M("Antes de salvar, consulto se já existe agendamento no horário.", "Tem corrida: as duas requisições consultam e salvam juntas."),
        B("Não pensei nesse caso.", "É o caso principal do desafio."),
      ],
    },
    {
      q: "Por que você organizou o código assim?",
      options: [
        G("Camadas simples (controller, service, repository), com a regra de cancelamento num objeto de domínio testado sem Spring. Não usei hexagonal completo porque o desafio é pequeno, e expliquei isso no README.", "Escolha justificada pelo tamanho do problema."),
        M("Segui o padrão MVC que todo mundo usa.", "Ok, mas sem justificativa própria."),
        B("Usei hexagonal com 6 módulos Maven para mostrar que sei.", "Complexidade sem necessidade é sinal de alerta para pleno."),
      ],
    },
    {
      q: "Quais testes você escreveu?",
      options: [
        G("Unidade para a regra de cancelamento, integração com Testcontainers para o conflito de horário e @WebMvcTest para os status HTTP de erro.", "Pirâmide coerente, cobrindo o que mais pode quebrar."),
        M("Testes de unidade dos services com Mockito.", "Bom começo, mas o conflito de horário só aparece com o banco real."),
        B("Não deu tempo de escrever testes.", "Em take-home, falta de testes costuma eliminar."),
      ],
    },
  ] satisfies AskStep[],
};

// ───────────────────────── Entrevista técnica: aquecimento ─────────────────────────

export const SOFT_WARMUP: AskStep[] = [
  {
    q: "Antes da parte técnica: conta um bug difícil que você resolveu.",
    options: [
      G("Situação, o que eu fiz e o resultado: \"Pagamentos duplicavam 1 vez por semana. Pelos logs com traceId vi retries do gateway. Implementei Idempotency-Key com UNIQUE e um teste com requisições paralelas. Zero duplicidade desde então.\"", "Estrutura STAR com causa, ação e resultado."),
      M("Já resolvi vários, geralmente debugando com breakpoints.", "Genérico, sem um caso concreto."),
      B("Não lembro de nenhum difícil.", "Sinaliza pouca vivência ou pouca reflexão sobre o trabalho."),
    ],
  },
  {
    q: "Como você aprende uma tecnologia nova quando o projeto exige?",
    options: [
      G("Documentação oficial e um projeto pequeno para testar, depois aplico numa tarefa real com alguém revisando. Foi assim com Kafka: em duas semanas eu já mantinha um consumidor em produção.", "Método e exemplo com prazo."),
      M("Faço um curso online.", "Válido, mas o entrevistador quer ver como você aprende na prática."),
      B("Espero alguém do time me ensinar.", "Passa a impressão de pouca autonomia, o que pesa para pleno."),
    ],
  },
];

// ───────────────────────── Gestor e fit cultural ─────────────────────────

export interface BehavioralQuestion extends AskStep {
  /** Para montar a resposta no formato STAR. */
  star: string;
}

export const BEHAVIORAL: BehavioralQuestion[] = [
  {
    q: "Me conta de uma vez em que você discordou tecnicamente de alguém do time.",
    star: "Situação: qual era a discussão? Ação: como você argumentou? Resultado: o que foi decidido e o que você aprendeu?",
    options: [
      G("\"Um colega queria cache em tudo. Mostrei com métricas que só 2 endpoints eram lentos e propus um teste de uma semana. Ficamos com cache só nesses dois, e a decisão foi registrada num ADR.\"", "Discordou com dados, propôs experimento e fechou com decisão do time."),
      M("\"Eu expliquei meu ponto e no fim fizemos do meu jeito.\"", "Sem mostrar como convenceu nem se ouviu o outro."),
      B("\"Não costumo discordar, faço o que pedem.\"", "Para pleno, o gestor espera opinião técnica."),
    ],
  },
  {
    q: "Fala de uma entrega que não saiu como planejado.",
    star: "Situação: o que deu errado? Ação: o que você fez na hora e depois? Resultado: o que mudou no processo?",
    options: [
      G("\"Subi uma migração que travou a tabela de pedidos por 4 minutos. Fiz o rollback, avisei o time no canal de incidentes e escrevi o post-mortem. Desde então, migrações grandes rodam em etapas e passam por revisão.\"", "Assume o erro, age rápido e muda o processo."),
      M("\"O prazo atrasou porque o escopo mudou.\"", "Coloca a culpa fora e não mostra aprendizado."),
      B("\"Nunca tive entregas com problema.\"", "Ninguém acredita, e parece falta de autocrítica."),
    ],
  },
  {
    q: "Como você lida com prazo apertado e pressão por entregar rápido?",
    star: "Situação: um caso real. Ação: o que você negociou ou cortou? Resultado: como ficou a qualidade?",
    options: [
      G("\"Divido o que é essencial para a data e o que pode vir depois, alinho com o PO e mantenho os testes do fluxo principal. Numa Black Friday, entregamos o checkout novo sem o cupom, que saiu uma semana depois.\"", "Negocia escopo, preserva qualidade, com exemplo."),
      M("\"Faço hora extra até terminar.\"", "Mostra comprometimento, mas não é sustentável e não negocia."),
      B("\"Pulo os testes para ganhar tempo.\"", "O gestor ouve: \"vai gerar incidente\"."),
    ],
  },
  {
    q: "Como você ajudaria uma pessoa júnior que acabou de entrar no time?",
    star: "Situação: já fez isso? Ação: o que você fez na prática? Resultado: como a pessoa evoluiu?",
    options: [
      G("\"Pareio nas primeiras tarefas, escolho issues pequenas que passem pelo fluxo inteiro e faço code review explicando o porquê. Com a última pessoa, em um mês ela já fazia deploy sozinha.\"", "Plano concreto e resultado: é o que se espera de um pleno."),
      M("\"Fico disponível para dúvidas.\"", "Passivo: o júnior muitas vezes não pergunta."),
      B("\"Isso é papel do tech lead.\"", "Pleno já ajuda os mais novos."),
    ],
  },
];

// ───────────────────────── Eventos sorteados ─────────────────────────

/** Depois da técnica, com nota média: a empresa oferece júnior (relato PicPay). */
export const DOWNLEVEL: AskStep = {
  q: "Recebemos o retorno do time técnico. Gostaram de você, mas acham que o perfil hoje é de júnior. Podemos seguir para a vaga de Júnior, com salário de júnior?",
  options: [
    G("Agradeço o retorno. Pode me dizer em quais pontos ficaram as dúvidas? Topo seguir como pleno com um plano de 3 meses e revisão no fim, ou conversar sobre júnior com revisão em 6 meses por escrito.", "Pede feedback, negocia com prazo e registro."),
    M("Aceito júnior, o importante é entrar.", "Pode ser uma escolha válida, mas sem negociar uma revisão você pode ficar anos como júnior."),
    B("Que absurdo, eu sou pleno. Não aceito.", "Fecha a porta sem entender o motivo."),
  ],
};

/** Antes do gestor: uma semana sem resposta (relato PicPay). */
export const GHOSTING: AskStep = {
  q: "Faz uma semana que você fez a entrevista técnica e ninguém respondeu. O que você faz?",
  options: [
    G("Mando um e-mail curto à recrutadora: agradeço, reafirmo o interesse e pergunto se há previsão para a próxima etapa.", "Educado, objetivo e deixa registro."),
    M("Espero mais, eles vão responder.", "Às vezes respondem, mas um follow-up educado ajuda a lembrar de você."),
    B("Mando mensagem no LinkedIn do gestor cobrando um retorno.", "Passa por cima do RH e pega mal."),
  ],
};

// ───────────────────────── Proposta ─────────────────────────

export type Regime = "CLT" | "PJ";

export interface Offer {
  regime: Regime;
  monthly: number;
}

/** Valor da proposta: parte do piso e sobe com o desempenho (0 a 1) e com a pretensão informada. */
export function makeOffer(c: Company, performance: number, askedLow: boolean): Offer {
  const [lo, hi] = c.band;
  const p = Math.max(0, Math.min(1, performance));
  const base = lo + (hi - lo) * (askedLow ? 0.1 : 0.2 + 0.5 * p);
  return { regime: "CLT", monthly: Math.round(base / 100) * 100 };
}

export type CounterResult =
  | { kind: "aceita"; monthly: number; text: string }
  | { kind: "meio-termo"; monthly: number; text: string }
  | { kind: "sem-orcamento"; monthly: number; text: string };

/** Como o RH responde a uma contraproposta. */
export function counterOffer(c: Company, offer: Offer, asked: number): CounterResult {
  const ceiling = c.band[1];
  if (asked <= offer.monthly * 1.1 && asked <= ceiling)
    return { kind: "aceita", monthly: Math.round(asked / 100) * 100, text: "Conversei com a liderança e conseguimos chegar no valor que você pediu." };
  if (asked <= offer.monthly * 1.2 && asked <= ceiling * 1.05) {
    const mid = Math.min(ceiling, Math.round((offer.monthly + asked) / 2 / 100) * 100);
    return { kind: "meio-termo", monthly: mid, text: `Não chegamos no valor todo, mas conseguimos subir para R$ ${mid.toLocaleString("pt-BR")}.` };
  }
  const bumped = Math.round((offer.monthly * 1.03) / 100) * 100;
  return {
    kind: "sem-orcamento",
    monthly: bumped,
    text: `Esse valor está acima da faixa da vaga. O máximo que conseguimos é R$ ${bumped.toLocaleString("pt-BR")}, com revisão salarial em 6 meses.`,
  };
}

/**
 * Comparação aproximada de CLT x PJ.
 * Pacote CLT anual = salário × 13,33 (12 salários + 13º + 1/3 de férias) + FGTS 8% sobre isso + benefícios × 12.
 * PJ equivalente = o mesmo pacote, recebido em 11 meses de nota (sem férias pagas), mais ~6% de imposto
 * (Simples Nacional, faixa inicial do Anexo III com Fator R) e R$ 300/mês de contador.
 * É uma conta de bolso: INSS, IR e plano de saúde mudam o resultado.
 */
export function cltVsPj(cltMonthly: number, benefitsMonthly: number) {
  const cltYear = cltMonthly * (13 + 1 / 3);
  const fgts = cltYear * 0.08;
  const packageYear = cltYear + fgts + benefitsMonthly * 12;
  const pjMonthly = (packageYear / 11 + 300) / (1 - 0.06);
  return {
    packageYear: Math.round(packageYear),
    pjMonthly: Math.round(pjMonthly / 100) * 100,
    ratio: pjMonthly / cltMonthly,
  };
}

// ───────────────────────── Admissão ─────────────────────────

export const ADMISSAO: Record<Regime, string[]> = {
  CLT: [
    "Pedir a proposta por escrito: salário, benefícios, cargo e data de início",
    "Comunicar a empresa atual e cumprir o aviso prévio combinado",
    "Enviar documentos (RG, CPF, carteira de trabalho digital, PIS, comprovante de residência, dados bancários)",
    "Fazer o exame admissional",
    "Assinar o contrato e conferir o registro na carteira digital",
  ],
  PJ: [
    "Pedir a proposta e o contrato por escrito, com prazo de aviso e reajuste",
    "Abrir ou revisar o CNPJ e o CNAE certo, com um contador",
    "Conferir se o trabalho tem cara de CLT (horário fixo, subordinação): é um risco",
    "Combinar como ficam férias e recesso",
    "Comunicar a empresa atual e cumprir o aviso",
  ],
};

// ───────────────────────── Pontuação ─────────────────────────

export const scoreOf = (picked: Option[]) => picked.reduce((s, o) => s + POINTS[o.level], 0);
export const maxOf = (n: number) => n * POINTS.pleno;
