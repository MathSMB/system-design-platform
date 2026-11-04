import { trackTitle, type Level } from "@sdp/hiring";

export interface ProfileRow {
  id: string;
  stack: string;
  level: string;
  goal: string;
  plan?: unknown;
  startDay: string;
}
export interface SessionData {
  user: { id: string; name: string };
  profiles: ProfileRow[];
  profile: ProfileRow | null;
}

/** Nome do perfil, ex. "Java Pleno". Serve no servidor e no navegador. */
export const profileTitle = (p: Pick<ProfileRow, "stack" | "level">) => trackTitle(p.stack, p.level as Level);
