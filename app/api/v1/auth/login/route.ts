import type { NextRequest } from "next/server";

import { getMyAccount } from "@/app/actions";
import { fail, failWith, ok, readJson } from "@/lib/api";
import { createAppToken } from "@/lib/app-token";
import { signInWithPassword } from "@/lib/db/password-auth";
import { withProfile } from "@/lib/session";

/** Login do app com e-mail e senha: devolve o token e a conta. Mesmo bloqueio por tentativas do site. */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  if (!body) return fail("invalid_input", 400);
  const result = await signInWithPassword(body);
  if (!result.ok) return failWith(result.error);
  return ok({ token: await createAppToken(result.profileId), account: await withProfile(result.profileId, getMyAccount) });
}
