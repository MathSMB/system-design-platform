/**
 * IA da Central de estudos: pesquisa das vagas (com busca na web), conversa para
 * montar trilhas, projetos sugeridos e o cronograma em blocos curtos.
 * Os prompts ficam aqui (iguais para o Claude Code da assinatura e para a API);
 * a limpeza do que a IA devolve fica no @sdp/study.
 */
import { ITEM_KINDS, TRAIL_KINDS, WEEKDAYS, kindOf, plannable, weekday, type Availability, type Schedule, type Skill, type SkillLevel, type Trail } from "@sdp/study";

// ---------------------------------------------------------------------------
// Pesquisa da vaga (skill fixa: sempre o mesmo método e o mesmo formato)
// ---------------------------------------------------------------------------

export interface ResearchInput {
  role: string;
  level: string;
  /** Tecnologias que você já sabe que a vaga usa (ajuda a busca). */
  hint?: string;
  today: string;
}

export const RESEARCH_SYSTEM_PROMPT = `Você é um pesquisador de mercado de trabalho de tecnologia no Brasil. Faz SEMPRE a mesma pesquisa, com o mesmo método, para o cargo pedido, e responde em português do Brasil.

Método (siga na ordem):
1. Busque vagas reais e recentes (últimos 90 dias) do cargo e do nível no Brasil, incluindo remotas, com a ferramenta de busca na web. Use várias fontes: LinkedIn Vagas, Gupy, Glassdoor, Indeed, Programathor, Remotar, Catho, sites de carreira de empresas.
2. Abra e leia de 15 a 30 anúncios diferentes (sem repetir a mesma vaga em sites diferentes). Anote o que cada um pede como obrigatório e como diferencial.
3. Conte em quantos anúncios cada habilidade aparece. "frequency" = porcentagem dos anúncios lidos que pedem aquela habilidade (0 a 100). Agrupe sinônimos ("Spring" e "Spring Boot" são uma só). "must" = true quando a maioria das vagas que pedem colocam como obrigatório.
4. Busque a faixa salarial mensal CLT do cargo e nível (Glassdoor, pesquisas salariais, anúncios com salário). "band" = [mínimo, máximo] em reais; [] se não achar nada confiável.
5. Liste os temas que mais aparecem em entrevistas desse cargo ("questions"), a partir de relatos (Glassdoor entrevistas, blogs, fóruns) e dos requisitos.

Regras do resultado:
- "postingsAnalyzed": quantos anúncios você leu de fato. Nunca invente.
- "skills": de 12 a 30 habilidades, específicas (tecnologias, práticas, conceitos), com "category" curta (Linguagem, Framework, Banco de dados, Mensageria, Nuvem, DevOps, Arquitetura, Testes, Práticas, Comportamental).
- "sources": um link por anúncio lido e por fonte de salário, com um rótulo curto (empresa ou site).
- "summary": 3 a 5 frases sobre o que o mercado pede para esse cargo hoje e o que diferencia os candidatos.
- Sem dado inventado: se algo não foi achado, deixe de fora.`;

export const RESEARCH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "postingsAnalyzed", "skills", "band", "questions", "sources"],
  properties: {
    summary: { type: "string" },
    postingsAnalyzed: { type: "integer" },
    skills: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "frequency", "category", "must"],
        properties: { name: { type: "string" }, frequency: { type: "integer" }, category: { type: "string" }, must: { type: "boolean" } },
      },
    },
    band: { type: "array", items: { type: "integer" } },
    questions: { type: "array", items: { type: "string" } },
    sources: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["label", "url"], properties: { label: { type: "string" }, url: { type: "string" } } },
    },
  },
} as const;

export function buildResearchPrompt(i: ResearchInput): string {
  return [
    `Cargo: ${i.role}`,
    `Nível: ${i.level}`,
    i.hint ? `Tecnologias que costumam aparecer (use só como ponto de partida da busca): ${i.hint}` : "",
    `Hoje é ${i.today}.`,
    "Faça a pesquisa pelo método e devolva o JSON pedido.",
  ]
    .filter(Boolean)
    .join("\n");
}

// ---------------------------------------------------------------------------
// Contexto comum (vaga, habilidades, trilhas)
// ---------------------------------------------------------------------------

export interface StudyContext {
  role: string;
  level: string;
  today: string;
  skills: (Skill & { level: SkillLevel })[];
  trails: Trail[];
  availability: Availability;
  /** Entrevistas recentes na plataforma: título, nota e o que faltou. */
  interviews: { title: string; score: number | null; gaps: string[] }[];
}

const LEVEL_WORD = ["não sabe", "estudando", "domina"];

function contextText(c: StudyContext): string {
  const skills = c.skills.length
    ? c.skills.slice(0, 30).map((s) => `- ${s.name} (${s.frequency}% das vagas${s.must ? ", obrigatório" : ""}): ${LEVEL_WORD[s.level]}`).join("\n")
    : "(ainda sem pesquisa da vaga)";
  const trails = c.trails.length
    ? c.trails
        .map((t) => {
          const pend = t.units.filter((u) => !u.done);
          return `- [${t.id}] ${kindOf(t.kind).title}: ${t.title} · importância ${t.importance}/3 · ${t.perWeek}x por semana, sessões de ${t.sessionMin} min${t.deadline ? ` · prazo ${t.deadline}` : ""}${t.skills.length ? ` · cobre ${t.skills.join(", ")}` : ""}\n  Pendentes (${pend.length} de ${t.units.length}): ${pend.slice(0, 15).map((u) => `[${u.id}] ${u.title}`).join("; ") || "nenhuma"}`;
        })
        .join("\n")
    : "(nenhuma trilha ainda)";
  const week = WEEKDAYS.map((d, i) => `${d} ${c.availability.minutes[i]} min`).join(", ");
  const interviews = c.interviews.length
    ? c.interviews.slice(0, 8).map((r) => `- ${r.title}: ${r.score ?? "?"}/10${r.gaps.length ? `. Faltou: ${r.gaps.slice(0, 4).join("; ")}` : ""}`).join("\n")
    : "(nenhuma entrevista feita ainda)";
  return [
    `## Vaga alvo\n${c.role} · nível ${c.level} · hoje é ${c.today}${c.availability.targetDate ? ` · quer estar pronto até ${c.availability.targetDate}` : ""}`,
    `## Habilidades que as vagas pedem\n${skills}`,
    `## Trilhas dele\n${trails}`,
    `## Tempo livre por semana\n${week} · folga de ${Math.round(c.availability.slack * 100)}% para imprevistos`,
    c.availability.notes ? `## Combinados com ele\n${c.availability.notes}` : "",
    `## Entrevistas na plataforma\n${interviews}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

// ---------------------------------------------------------------------------
// Conversa para montar trilhas e mudar o plano
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export interface StudyChatInput {
  context: StudyContext;
  messages: ChatMessage[];
}

export interface StudyChatReply {
  reply: string;
  /** add_trail = há uma trilha pronta para ele adicionar; replan = refazer o cronograma. */
  action: "none" | "add_trail" | "replan";
  /** A trilha proposta (vazia quando action não é add_trail). */
  trail: { kind: string; title: string; why: string; importance: number; perWeek: number; sessionMin: number; deadline: string; skills: string[]; units: string[] };
  /** Um combinado para o cronograma ("semana que vem tenho prova", "sábado não estudo"). */
  note: string;
}

export const CHAT_SYSTEM_PROMPT = `Você é o coach de estudos dentro da plataforma de estudos do usuário. Conversa em português do Brasil, curto e direto (no máximo 5 frases por resposta), como um colega que entende de carreira em tecnologia.

O que você faz:
1. Ajuda a adicionar uma TRILHA: pós-graduação, certificação, livro, curso, projeto ou outro estudo. Para isso descubra, perguntando só o que falta:
   - o que é (nome exato) e por que importa para a vaga dele;
   - as unidades: matérias da pós, módulos ou domínios da certificação, capítulos do livro, aulas do curso, entregas do projeto. Se for algo público e conhecido (um livro famoso, uma certificação), proponha você mesmo a lista, usando a busca na web quando ajudar, e peça só a confirmação;
   - prazo (se houver);
   - quantas vezes por semana entra (não precisa ser todo dia: 1, 2 ou 3 vezes por semana costuma bastar) e de quantos minutos cada sessão. Sugira blocos curtos, de 15 a 30 minutos, para aproveitar tempos pequenos;
   - importância para a vaga, de 1 a 3, sugerida por você com base nas habilidades que as vagas pedem.
   Quando tiver o suficiente, responda com action "add_trail", a trilha completa em "trail" e, em "reply", um resumo de uma ou duas frases dizendo que ele pode clicar em "Adicionar à central".
2. Quando ele pedir para refazer o cronograma, ou contar algo que muda a semana (prova, viagem, um dia sem tempo), responda com action "replan", escreva o combinado em "note" (uma frase objetiva) e diga que vai refazer o cronograma.
3. Fora isso, action "none": responda a dúvida, e sempre lembre o que é mais importante para a vaga quando fizer sentido.

Regras do JSON:
- "trail" sempre presente; quando action não for "add_trail", use textos vazios, números 0 e listas vazias.
- "trail.kind": um de ${TRAIL_KINDS.map((k) => k.id).join(", ")}.
- "trail.deadline": "AAAA-MM-DD" ou "".
- "note": "" quando não houver combinado novo.`;

export const CHAT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "action", "trail", "note"],
  properties: {
    reply: { type: "string" },
    action: { type: "string", enum: ["none", "add_trail", "replan"] },
    trail: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "title", "why", "importance", "perWeek", "sessionMin", "deadline", "skills", "units"],
      properties: {
        kind: { type: "string" },
        title: { type: "string" },
        why: { type: "string" },
        importance: { type: "integer" },
        perWeek: { type: "integer" },
        sessionMin: { type: "integer" },
        deadline: { type: "string" },
        skills: { type: "array", items: { type: "string" } },
        units: { type: "array", items: { type: "string" } },
      },
    },
    note: { type: "string" },
  },
} as const;

export function buildChatPrompt(i: StudyChatInput): string {
  const talk = i.messages
    .slice(-20)
    .map((m) => `${m.role === "user" ? "Ele" : "Você"}: ${m.text.slice(0, 2000)}`)
    .join("\n\n");
  return `${contextText(i.context)}\n\n## Conversa até agora\n${talk}\n\nResponda à última mensagem dele no formato JSON pedido.`;
}

export function normalizeChat(raw: unknown): StudyChatReply {
  const r = (raw ?? {}) as Record<string, any>;
  const t = (r.trail ?? {}) as Record<string, any>;
  const action = ["none", "add_trail", "replan"].includes(r.action) ? r.action : "none";
  return {
    reply: String(r.reply ?? "").slice(0, 3000) || "Não entendi, pode repetir?",
    action,
    trail: {
      kind: String(t.kind ?? ""),
      title: String(t.title ?? ""),
      why: String(t.why ?? ""),
      importance: Number(t.importance) || 0,
      perWeek: Number(t.perWeek) || 0,
      sessionMin: Number(t.sessionMin) || 0,
      deadline: String(t.deadline ?? ""),
      skills: Array.isArray(t.skills) ? t.skills.map(String) : [],
      units: Array.isArray(t.units) ? t.units.map(String) : [],
    },
    note: String(r.note ?? "").slice(0, 300),
  };
}

// ---------------------------------------------------------------------------
// Projetos sugeridos
// ---------------------------------------------------------------------------

export const PROJECTS_SYSTEM_PROMPT = `Você é um tech lead que monta portfólio para candidatos de tecnologia no Brasil. A partir das habilidades que as vagas pedem (com a frequência) e do que o candidato já sabe, proponha EXATAMENTE 3 projetos de portfólio diferentes, em português do Brasil.

Regras:
- Juntos, os 3 devem cobrir as habilidades mais pedidas que ele ainda não domina. Cada um cobre um conjunto diferente, e um deles é menor (2 a 4 semanas).
- Projetos realistas de empresa (ex.: API de pagamentos com fila e idempotência), não tutoriais genéricos.
- "pitch": 2 a 3 frases dizendo o que é e por que impressiona numa entrevista dessa vaga.
- "skills": as habilidades da pesquisa que ele pratica (use os mesmos nomes).
- "deliverables": de 4 a 10 entregas em ordem, cada uma pequena o bastante para algumas sessões curtas.
- "weeks": quantas semanas leva com o tempo livre dele.`;

export const PROJECTS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["projects"],
  properties: {
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "pitch", "skills", "deliverables", "weeks"],
        properties: {
          title: { type: "string" },
          pitch: { type: "string" },
          skills: { type: "array", items: { type: "string" } },
          deliverables: { type: "array", items: { type: "string" } },
          weeks: { type: "integer" },
        },
      },
    },
  },
} as const;

export const buildProjectsPrompt = (c: StudyContext) => `${contextText(c)}\n\nProponha os 3 projetos no formato JSON pedido.`;

// ---------------------------------------------------------------------------
// Cronograma
// ---------------------------------------------------------------------------

export interface ScheduleInput {
  context: StudyContext;
  from: string;
  until: string;
  days: string[];
  /** Como foi o cronograma anterior: feitos, não feitos e o que ficou para trás. */
  previous?: { done: number; total: number; missed: string[]; recent: string[] };
}

export interface ScheduleDraft {
  notes: string;
  outline: { week: string; focus: string }[];
  items: { day: string; title: string; kind: string; minutes: number; trailId: string; unitId: string; skill: string; why: string }[];
}

export const SCHEDULE_SYSTEM_PROMPT = `Você monta o cronograma de estudos de um candidato a uma vaga de tecnologia, dia a dia, em português do Brasil. O objetivo é ele conseguir a vaga sem largar o plano.

Regras do cronograma:
- Nunca passe dos minutos livres de cada dia (já com a folga). Dia com 0 minutos fica sem nada: é descanso.
- Blocos curtos: a maioria de 10 a 30 minutos, para caber nos tempos pequenos do dia. Um dia pode ter vários blocos. Respeite os minutos de sessão de cada trilha.
- Cada trilha entra só as vezes por semana combinadas (1, 2 ou 3 vezes por semana não é todo dia). Espalhe pela semana.
- Siga as unidades das trilhas em ordem. Quando o item for de uma trilha, preencha "trailId" e "unitId" com os ids dados (entre colchetes). Senão, "".
- Prioridade: prazo próximo, importância da trilha, e habilidades muito pedidas nas vagas que ele não domina (cruze com o que faltou nas entrevistas).
- Revisão espaçada, sempre: depois de estudar um tema importante, ponha uma "revisao" curta (10 a 15 min) 1 a 3 dias depois e outra cerca de uma semana depois. Revisão é se testar (explicar em voz alta, responder perguntas, refazer um exercício), não reler.
- 1 ou 2 vezes por semana, um "teste": treino de entrevista com nota na plataforma sobre o tema da semana (ex.: "Treino de entrevista na plataforma: transações e JPA").
- Itens de projeto usam kind "projeto".
- O que ficou para trás no cronograma anterior volta primeiro, sem acumular tudo num dia.
- "skill": o nome da habilidade da pesquisa que o item trabalha (igual ao da lista), ou "".
- "title": a ação concreta do bloco ("Ler cap. 3 do DDIA: armazenamento", "Revisar: isolamento de transações").
- "why": meia frase do porquê agora.
- "outline": uma linha por semana depois do período detalhado, até a data alvo (no máximo 12 semanas), com o foco da semana.
- "notes": 2 a 4 frases para ele: a lógica da quinzena e o que é mais importante não pular.
- kind: um de ${ITEM_KINDS.map((k) => k.id).join(", ")}.`;

export const SCHEDULE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["notes", "outline", "items"],
  properties: {
    notes: { type: "string" },
    outline: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["week", "focus"], properties: { week: { type: "string" }, focus: { type: "string" } } },
    },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["day", "title", "kind", "minutes", "trailId", "unitId", "skill", "why"],
        properties: {
          day: { type: "string" },
          title: { type: "string" },
          kind: { type: "string" },
          minutes: { type: "integer" },
          trailId: { type: "string" },
          unitId: { type: "string" },
          skill: { type: "string" },
          why: { type: "string" },
        },
      },
    },
  },
} as const;

export function buildSchedulePrompt(i: ScheduleInput): string {
  const days = i.days.map((d) => `- ${d} (${WEEKDAYS[weekday(d)]}): ${plannable(i.context.availability, d)} min`).join("\n");
  const prev = i.previous
    ? `## Cronograma anterior\nFeitos ${i.previous.done} de ${i.previous.total} itens.${i.previous.missed.length ? `\nFicaram para trás: ${i.previous.missed.slice(0, 15).join("; ")}` : ""}${i.previous.recent.length ? `\nEstudados nos últimos dias (para a revisão espaçada): ${i.previous.recent.slice(0, 20).join("; ")}` : ""}`
    : "";
  return [contextText(i.context), prev, `## Período a detalhar (minutos que pode usar em cada dia)\n${days}`, "Monte o cronograma no formato JSON pedido."].filter(Boolean).join("\n\n");
}

export function normalizeSchedule(raw: unknown): ScheduleDraft {
  const r = (raw ?? {}) as Record<string, any>;
  return {
    notes: String(r.notes ?? ""),
    outline: Array.isArray(r.outline) ? r.outline.map((w: any) => ({ week: String(w?.week ?? ""), focus: String(w?.focus ?? "") })) : [],
    items: Array.isArray(r.items) ? r.items : [],
  };
}

export type { Schedule };
