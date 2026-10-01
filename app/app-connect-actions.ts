"use server";

import { createLoginCode, isAppRedirect, isChallenge } from "@/lib/app-token";
import { currentProfileId } from "@/lib/session";

/**
 * Confirmação de "Entrar no app pelo site": gera o código de 2 minutos para a conta logada
 * e devolve o endereço do app para onde mandar. O perfil vem sempre da sessão do site.
 */
export async function issueAppCodeAction(challenge: string, redirect: string): Promise<{ ok: true; url: string } | { ok: false }> {
  const me = await currentProfileId();
  if (!me || !isChallenge(challenge) || !isAppRedirect(redirect)) return { ok: false };
  const url = new URL(redirect);
  url.searchParams.set("code", await createLoginCode(me, challenge));
  return { ok: true, url: url.toString() };
}
