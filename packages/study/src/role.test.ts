import { describe, expect, it } from "vitest";
import { cleanRoleSpec, pace, roleName, roleTechs, cleanTrail, DEFAULT_AVAILABILITY } from "./index";

describe("montador de cargo", () => {
  it("monta o nome do full-stack com as duas linguagens", () => {
    const s = cleanRoleSpec({ area: "dev", focus: "full", back: "java", front: "react", level: "pleno" })!;
    expect(roleName(s)).toBe("Dev full-stack Java e React pleno");
    expect(roleTechs(s)).toContain("Spring Boot");
  });
  it("back-end ignora a linguagem do front e exige a do back", () => {
    expect(roleName(cleanRoleSpec({ area: "dev", focus: "back", back: "python", front: "react", level: "junior" })!)).toBe("Dev back-end Python júnior");
    expect(cleanRoleSpec({ area: "dev", focus: "full", back: "java", level: "pleno" })).toBeNull();
  });
  it("outras áreas usam a especialidade", () => {
    expect(roleName(cleanRoleSpec({ area: "seguranca", option: "pentest", level: "senior" })!)).toBe("Pentester sênior");
    expect(cleanRoleSpec({ area: "mobile", option: "java", level: "pleno" })).toBeNull();
  });
});

describe("ritmo ideal x real", () => {
  const t = cleanTrail({ title: "Pós", hours: 100, units: [{ title: "a", done: true }, "b", "c", "d"] })!;
  it("conta as horas que faltam pelas unidades pendentes", () => {
    const p = pace([t, cleanTrail({ title: "Livro" })!], { ...DEFAULT_AVAILABILITY, minutes: [60, 60, 60, 60, 60, 0, 0], slack: 0, targetDate: "2026-12-07" }, "2026-11-07");
    expect(p.remainingHours).toBe(75);
    expect(p.unknown).toEqual(["Livro"]);
    expect(p.weeklyMin).toBe(300);
    expect(p.finishDate).toBe("2027-02-20"); // 75 h / 5 h por semana = 15 semanas
    expect(p.idealWeeklyMin).toBe(1050); // 75 h em 30 dias
    expect(p.onTrack).toBe(false);
  });
  it("sem data alvo não há ideal", () => {
    expect(pace([t], DEFAULT_AVAILABILITY, "2026-11-07").idealWeeklyMin).toBeNull();
  });
});
