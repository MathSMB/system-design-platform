import { describe, expect, it } from "vitest";
import { ACTIVITY_OF, EVENT_TYPES, describeEvent, parseEvent } from "./types";

describe("parseEvent", () => {
  it("aceita um evento conhecido e limpa o ref", () => {
    expect(parseEvent({ type: "etapa.concluida", ref: "  abc:rh ", payload: { stage: "rh" } })).toEqual({ type: "etapa.concluida", ref: "abc:rh", payload: { stage: "rh" } });
  });
  it("recusa tipo desconhecido, ref vazio e payload em lista", () => {
    expect(typeof parseEvent({ type: "x" })).toBe("string");
    expect(typeof parseEvent({ type: "design.avaliado", ref: " " })).toBe("string");
    expect(typeof parseEvent({ type: "design.avaliado", payload: [] })).toBe("string");
    expect(typeof parseEvent(null)).toBe("string");
  });
  it("cada evento de treino conta uma atividade do hábito", () => {
    expect(ACTIVITY_OF["resposta.avaliada"]).toBe("answer");
    expect(ACTIVITY_OF["estudo.item-feito"]).toBeUndefined();
  });
});

describe("describeEvent", () => {
  it("dá texto legível aos eventos de projeto", () => {
    expect(describeEvent("projeto.commits", { repo: "MathSMB/api-pedidos", commits: 2 })).toBe("2 commits em api-pedidos");
    expect(describeEvent("projeto.commits", { trail: "API", commits: 1 })).toBe("1 commit em API");
    expect(describeEvent("projeto.passo-concluido", { repo: "MathSMB/api-pedidos", step: "#2 CRUD" })).toBe("Passo concluído em api-pedidos: #2 CRUD");
    expect(describeEvent("projeto.analisado", { repo: "a/b", relevant: false })).toBe("IA analisou b (ajuste pequeno)");
  });
  it("passo do pair programming conta como avanço no projeto", () => {
    expect(describeEvent("pair.passo-concluido", { step: "Instalar o JDK 21", title: "API de tarefas" })).toBe("Pair programming: Instalar o JDK 21 (API de tarefas)");
    expect(ACTIVITY_OF["pair.passo-concluido"]).toBe("project");
  });
  it("sem dado, usa a descrição do tipo", () => {
    expect(describeEvent("projeto.commits", {})).toBe(EVENT_TYPES["projeto.commits"]);
    expect(describeEvent("resposta.avaliada", null)).toBe(EVENT_TYPES["resposta.avaliada"]);
    expect(describeEvent("tipo.novo", {})).toBe("tipo.novo");
  });
});
