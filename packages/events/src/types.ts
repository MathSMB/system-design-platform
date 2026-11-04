/** Os apps que gravam eventos. */
export const APPS = ["painel", "system-design", "entrevista", "estudos", "habito"] as const;
export type AppId = (typeof APPS)[number];

/**
 * Os tipos de evento. Cada um diz o que aconteceu, no passado.
 * Novo tipo: acrescente aqui e, se ele contar para a meta do dia, em `ACTIVITY_OF`.
 */
export const EVENT_TYPES = {
  "resposta.avaliada": "Uma resposta de entrevista foi avaliada pela IA",
  "etapa.concluida": "Uma etapa do processo seletivo terminou",
  "processo.concluido": "Um processo seletivo terminou (contratado ou eliminado)",
  "design.avaliado": "Um desenho de system design foi avaliado pela IA",
  "estudo.item-feito": "Um item do cronograma de estudos foi marcado como feito",
} as const;
export type EventType = keyof typeof EVENT_TYPES;

export const isEventType = (x: unknown): x is EventType => typeof x === "string" && x in EVENT_TYPES;

/** O que um app manda para gravar (pelo POST /api/eventos ou direto no servidor). */
export interface NewEvent {
  type: EventType;
  /** Evita gravar duas vezes o mesmo fato (ex. "<id do processo>:tecnica"). */
  ref?: string | null;
  payload?: Record<string, unknown>;
}

/** Tipo de atividade do hábito que cada evento conta (o app Hábito lê isto). */
export const ACTIVITY_OF: Partial<Record<EventType, "answer" | "stage" | "process" | "design">> = {
  "resposta.avaliada": "answer",
  "etapa.concluida": "stage",
  "processo.concluido": "process",
  "design.avaliado": "design",
};

/** Confere o corpo de um POST /api/eventos. Volta o evento limpo ou a mensagem de erro. */
export function parseEvent(b: unknown): NewEvent | string {
  if (!b || typeof b !== "object") return "Envie um JSON com type.";
  const o = b as Record<string, unknown>;
  if (!isEventType(o.type)) return `type deve ser um de: ${Object.keys(EVENT_TYPES).join(", ")}.`;
  if (o.ref != null && (typeof o.ref !== "string" || !o.ref.trim())) return "ref deve ser texto.";
  if (o.payload != null && (typeof o.payload !== "object" || Array.isArray(o.payload))) return "payload deve ser um objeto.";
  const payload = (o.payload ?? {}) as Record<string, unknown>;
  if (JSON.stringify(payload).length > 8000) return "payload grande demais (máx. 8 KB).";
  return { type: o.type, ref: typeof o.ref === "string" ? o.ref.trim().slice(0, 120) : null, payload };
}
