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

/** Token do cabeçalho Authorization, se houver. */
export function bearerFrom(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}
