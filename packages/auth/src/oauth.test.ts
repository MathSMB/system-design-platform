import { afterEach, describe, expect, it } from "vitest";
import { authorizeUrl, callbackUrl, providers } from "./oauth";

afterEach(() => {
  for (const k of ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]) delete process.env[k];
});

describe("entrar com GitHub e Google", () => {
  it("só liga o provedor com id e segredo", () => {
    expect(providers()).toEqual({ github: false, google: false });
    process.env.GITHUB_CLIENT_ID = "id";
    expect(providers().github).toBe(false);
    process.env.GITHUB_CLIENT_SECRET = "s";
    expect(providers()).toEqual({ github: true, google: false });
  });
  it("monta o endereço de autorização com o retorno no Painel", () => {
    process.env.GITHUB_CLIENT_ID = "gh";
    process.env.GOOGLE_CLIENT_ID = "go";
    const gh = new URL(authorizeUrl("github", "http://localhost:3000", "st"));
    expect(gh.origin).toBe("https://github.com");
    expect(gh.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/entrar/github/callback");
    expect(gh.searchParams.get("state")).toBe("st");
    const go = new URL(authorizeUrl("google", "http://localhost:3000", "st"));
    expect(go.searchParams.get("scope")).toBe("openid email profile");
    expect(go.searchParams.get("redirect_uri")).toBe(callbackUrl("http://localhost:3000", "google"));
  });
});
