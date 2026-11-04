import { trackTitle, type Level } from "@sdp/hiring";

export interface ProfileRow {
  id: string;
  stack: string;
  level: string;
  goal: string;
  plan?: unknown;
  startDay: string;
}
export interface UserRow {
  id: string;
  name: string;
  email?: string | null;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  experience?: string | null;
  objective?: string | null;
  githubId?: string | null;
  githubLogin?: string | null;
  googleId?: string | null;
}
export interface SessionData {
  user: UserRow;
  profiles: ProfileRow[];
  profile: ProfileRow | null;
}

/** Nome do perfil, ex. "Java Pleno". Serve no servidor e no navegador. */
export const profileTitle = (p: Pick<ProfileRow, "stack" | "level">) => trackTitle(p.stack, p.level as Level);
