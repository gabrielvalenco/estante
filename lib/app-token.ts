import "server-only";

import { createHash } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

/**
 * Tokens do app (Expo). O site usa cookie de sessão do Auth.js; o app manda
 * `Authorization: Bearer <token>`. O token é um JWT HS256 assinado com uma chave derivada
 * do AUTH_SECRET (não a mesma chave do Auth.js), com audiência própria: um token do app
 * não vale como sessão do site e vice-versa.
 */

const ISSUER = "estante";
const AUDIENCE = "estante-app";
const TTL = "30d";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET ausente");
  return createHash("sha256").update(`estante-app-token:${secret}`).digest();
}

export async function createAppToken(profileId: string) {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(profileId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(key());
}

/** Id do perfil dono do token, ou null se inválido, expirado ou de outra audiência. */
export async function verifyAppToken(token: string): Promise<string | null> {
  if (!token || token.length > 2000) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { issuer: ISSUER, audience: AUDIENCE, algorithms: ["HS256"] });
    return typeof payload.sub === "string" && /^[0-9a-f-]{36}$/.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Entrar no app pelo site (Google, GitHub ou senha). Fluxo com PKCE:
 * 1. o app gera um `verifier` aleatório e abre /app/conectar com o `challenge` = SHA-256(verifier);
 * 2. a pessoa entra no site e confirma; o site devolve um código ao app pelo endereço `estante://`;
 * 3. o app troca código + verifier pelo token (POST /api/v1/auth/exchange).
 * O código vale 2 minutos e só serve para quem tem o verifier, que nunca sai do aparelho:
 * interceptar o código não adianta. Chave e audiência próprias (não vale como token do app).
 */
const CODE_AUDIENCE = "estante-app-code";
const CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;

function codeKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET ausente");
  return createHash("sha256").update(`estante-app-code:${secret}`).digest();
}

export const isChallenge = (c: unknown): c is string => typeof c === "string" && CHALLENGE.test(c);

/**
 * Para onde o código pode ir: só para o próprio app no aparelho (estante://). Em desenvolvimento,
 * também para o Expo Go (exp://) e a versão web local, que não existem em produção.
 * Nunca para um site qualquer: aí quem montou o link receberia o código.
 */
export function isAppRedirect(url: unknown): url is string {
  if (typeof url !== "string" || url.length > 300) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol === "estante:") return true;
  if (process.env.NODE_ENV !== "development") return false;
  return u.protocol === "exp:" || ((u.protocol === "http:" || u.protocol === "https:") && (u.hostname === "localhost" || u.hostname === "127.0.0.1"));
}

export async function createLoginCode(profileId: string, challenge: string) {
  return new SignJWT({ chal: challenge })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(profileId)
    .setIssuer(ISSUER)
    .setAudience(CODE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime("2m")
    .sign(codeKey());
}

/** Id do perfil se o código é válido, não expirou e o verifier corresponde ao challenge. */
export async function redeemLoginCode(code: unknown, verifier: unknown): Promise<string | null> {
  if (typeof code !== "string" || code.length > 1000 || typeof verifier !== "string" || !VERIFIER.test(verifier)) return null;
  try {
    const { payload } = await jwtVerify(code, codeKey(), { issuer: ISSUER, audience: CODE_AUDIENCE, algorithms: ["HS256"] });
    const expected = createHash("sha256").update(verifier).digest("base64url");
    if (payload.chal !== expected) return null;
    return typeof payload.sub === "string" && /^[0-9a-f-]{36}$/.test(payload.sub) ? payload.sub : null;
  } catch {
    return null;
  }
}

/** Token do cabeçalho Authorization, se houver. */
export function bearerFrom(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}
