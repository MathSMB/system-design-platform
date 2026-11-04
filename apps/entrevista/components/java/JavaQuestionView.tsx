"use client";

import { getBlock, type JavaQuestion } from "@sdp/hiring";
import { AiConversation, type ConvResult } from "@/components/answer/AiConversation";

export interface QuestionResult {
  id: string;
  conv: ConvResult;
}

/** Vaga de referência do treino: o que as vagas de Java Pleno pedem (guia de estudo). */
export const JAVA_PLENO_JOB =
  "Vaga típica de Desenvolvedor(a) Java Pleno no Brasil: Java 17+, Spring Boot 3, JPA/Hibernate, APIs REST, mensageria (Kafka ou RabbitMQ), PostgreSQL, testes (JUnit, Mockito, Testcontainers), Docker e CI. Espera-se autonomia em tarefas médias, código revisável e saber explicar trade-offs.";

/** Contexto de uma pergunta de Java para a IA: o que o entrevistador quer ouvir e o que soa mal. */
export const javaCtx = (q: JavaQuestion, stage: string, job = JAVA_PLENO_JOB) => ({
  stage,
  target: "pleno" as const,
  expected: q.checklist,
  reference: [q.options.find((o) => o.level === "pleno")!.text, `Aprofundamento esperado: ${q.followUp.q} ${q.followUp.options.find((o) => o.level === "pleno")!.text}`].join("\n"),
  avoid: q.options.filter((o) => o.level !== "pleno").map((o) => `${o.text} (${o.why})`),
  job,
});

/** Uma pergunta de Java em conversa com a IA. */
export function JavaQuestionView({
  q,
  who = "Entrevistador",
  stage = "Entrevista técnica · Java Pleno",
  job,
  showFeedback = true,
  onDone,
}: {
  q: JavaQuestion;
  who?: string;
  stage?: string;
  job?: string;
  showFeedback?: boolean;
  onDone(r: QuestionResult): void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="hud-label !text-muted">{getBlock(q.block)?.title}</div>
      <AiConversation
        key={q.id}
        question={q.prompt}
        code={q.code}
        who={who}
        ctx={javaCtx(q, stage, job)}
        showFeedback={showFeedback}
        onDone={(conv) => onDone({ id: q.id, conv })}
      />
    </div>
  );
}
