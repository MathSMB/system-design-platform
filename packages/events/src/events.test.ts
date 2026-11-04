import { describe, expect, it } from "vitest";
import { ACTIVITY_OF, parseEvent } from "./types";

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
