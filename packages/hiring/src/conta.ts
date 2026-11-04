/** Dados do cadastro: as opções valem no formulário e na validação do servidor. */

export const EXPERIENCES = [
  { id: "0", title: "Menos de 1 ano" },
  { id: "1-2", title: "1 a 2 anos" },
  { id: "3-5", title: "3 a 5 anos" },
  { id: "6+", title: "6 anos ou mais" },
] as const;

export const OBJECTIVES = [
  { id: "primeiro-emprego", title: "Conseguir o primeiro emprego na área" },
  { id: "trocar-empresa", title: "Trocar de empresa" },
  { id: "subir-nivel", title: "Subir de nível (ex. de júnior para pleno)" },
  { id: "mudar-area", title: "Mudar de área ou de stack" },
  { id: "afiado", title: "Me manter afiado para oportunidades" },
] as const;

export type ExperienceId = (typeof EXPERIENCES)[number]["id"];
export type ObjectiveId = (typeof OBJECTIVES)[number]["id"];

export const isExperience = (x: unknown): x is ExperienceId => EXPERIENCES.some((e) => e.id === x);
export const isObjective = (x: unknown): x is ObjectiveId => OBJECTIVES.some((o) => o.id === x);
