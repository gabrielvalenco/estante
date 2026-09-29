import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

import { headers } from "next/headers";

import { auth } from "@/auth";
import { bearerFrom, verifyAppToken } from "@/lib/app-token";

/** Perfil definido pelo próprio servidor para um trecho de código (ex.: logo após o login do app). */
const asProfile = new AsyncLocalStorage<string>();

/** Roda `fn` como se o pedido viesse de `profileId`. Só para ids que o servidor acabou de autenticar. */
export function withProfile<T>(profileId: string, fn: () => Promise<T>): Promise<T> {
  return asProfile.run(profileId, fn);
}

/**
 * Id do perfil de quem está logado, sempre da sessão (nunca de um parâmetro vindo do navegador).
 * Pedidos do app trazem `Authorization: Bearer`; nesse caso vale só o token, sem cair no cookie.
 */
export async function currentProfileId(): Promise<string | null> {
  const fixed = asProfile.getStore();
  if (fixed) return fixed;
  const token = bearerFrom((await headers()).get("authorization"));
  if (token) return verifyAppToken(token);
  const session = await auth();
  return session?.user?.id ?? null;
}
