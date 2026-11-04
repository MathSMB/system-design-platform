// Gera o cookie do login único para uma conta (só para gravar os vídeos). Uso: node cookie.mjs <userId> <profileId>
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const require = createRequire(join(dirname(fileURLToPath(import.meta.url)), "../../packages/auth/package.json"));
const { SignJWT } = require("jose");
const [uid, pid] = process.argv.slice(2);
const key = new TextEncoder().encode(process.env.AUTH_SECRET || "sdp-segredo-local-de-desenvolvimento-troque-no-env");
console.log(await new SignJWT({ pid }).setProtectedHeader({ alg: "HS256" }).setSubject(uid).setIssuedAt().setExpirationTime("1d").sign(key));
