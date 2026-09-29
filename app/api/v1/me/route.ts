import type { NextRequest } from "next/server";

import { getMyAccount, updateProfileAction } from "@/app/actions";
import { setPrivacyAction } from "@/app/account-actions";
import { appUser, fail, failWith, ok, readJson } from "@/lib/api";
import { planStatusOf } from "@/lib/billing";

/** A conta com o plano (assinar e gerenciar é pelo site). */
async function accountWithPlan(me: string) {
  const [account, plan] = await Promise.all([getMyAccount(), planStatusOf(me)]);
  return account ? { ...account, plan } : null;
}

/** A conta de quem está logado no app: perfil, estante, quem segue, bloqueios e o plano. */
export async function GET(req: NextRequest) {
  const me = await appUser(req);
  if (!me) return fail("unauthenticated", 401);
  const account = await accountWithPlan(me);
  return account ? ok(account) : fail("unauthenticated", 401);
}

/**
 * Edita o perfil. Aceita os mesmos campos da tela de Configurações do site
 * (name, handle, bio, goal, tone, favorites) e, separado, isPrivate.
 */
export async function PATCH(req: NextRequest) {
  const me = await appUser(req);
  if (!me) return fail("unauthenticated", 401);
  const body = (await readJson(req)) as Record<string, unknown> | null;
  if (!body || typeof body !== "object") return fail("invalid", 400);

  const { isPrivate, ...draft } = body;
  if (typeof isPrivate === "boolean") {
    const r = await setPrivacyAction(isPrivate);
    if (!r.ok) return fail("unavailable", 503);
  }
  if (Object.keys(draft).length) {
    const r = await updateProfileAction(draft as Parameters<typeof updateProfileAction>[0]);
    if (!r.ok) return failWith(r.error);
  }
  return ok(await accountWithPlan(me));
}
