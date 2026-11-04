import { describe, expect, it } from "vitest";
import { readToken, signToken } from "./token";

describe("token do login único", () => {
  it("assina e lê de volta a conta e o perfil", async () => {
    const t = await signToken({ uid: "u1", pid: "p1" });
    expect(await readToken(t)).toEqual({ uid: "u1", pid: "p1" });
  });
  it("recusa token alterado ou de outro segredo", async () => {
    const t = await signToken({ uid: "u1", pid: null });
    expect(await readToken(t.slice(0, -2) + "xx")).toBeNull();
    process.env.AUTH_SECRET = "outro";
    expect(await readToken(t)).toBeNull();
    delete process.env.AUTH_SECRET;
    expect(await readToken(undefined)).toBeNull();
  });
});
