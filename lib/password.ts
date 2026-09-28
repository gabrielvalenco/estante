import "server-only";

import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Hash de senha com scrypt (nativo do Node, sem dependência).
 * Formato salvo: scrypt$N$r$p$salt$hash, em base64url. Os parâmetros ficam no próprio
 * hash para podermos endurecê-los no futuro sem invalidar senhas antigas.
 */

const N = 2 ** 15;
const R = 8;
const P = 1;
const KEYLEN = 64;
// 128 * N * r = 32 MiB; o padrão do Node (32 MiB) é o limite exato, então damos folga.
const MAXMEM = 64 * 1024 * 1024;

function derive(password: string, salt: Buffer, opts: ScryptOptions & { keylen: number }): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password.normalize("NFKC"), salt, opts.keylen, { N: opts.N, r: opts.r, p: opts.p, maxmem: MAXMEM }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, { N, r: R, p: P, keylen: KEYLEN });
  return ["scrypt", N, R, P, salt.toString("base64url"), key.toString("base64url")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await derive(password, Buffer.from(salt, "base64url"), {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    keylen: expected.length,
  });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/**
 * Hash fixo para comparar quando o e-mail não existe. Assim "e-mail não cadastrado"
 * e "senha errada" levam o mesmo tempo, e ninguém descobre quem tem conta.
 */
let dummy: Promise<string> | null = null;
export function dummyHash() {
  dummy ??= hashPassword(randomBytes(12).toString("hex"));
  return dummy;
}
