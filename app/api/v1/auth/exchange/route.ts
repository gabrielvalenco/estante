import type { NextRequest } from "next/server";

import { getMyAccount } from "@/app/actions";
import { fail, ok, readJson } from "@/lib/api";
import { createAppToken, redeemLoginCode } from "@/lib/app-token";
import { withProfile } from "@/lib/session";

/** Troca o código de /app/conectar (entrar pelo site) + o verifier do app pelo token do app. */
export async function POST(req: NextRequest) {
  const body = (await readJson(req)) as { code?: unknown; verifier?: unknown } | null;
  const profileId = await redeemLoginCode(body?.code, body?.verifier);
  if (!profileId) return fail("invalid_code", 400);
  const account = await withProfile(profileId, getMyAccount);
  if (!account) return fail("not_found", 404);
  return ok({ token: await createAppToken(profileId), account });
}
