import type { NextRequest } from "next/server";

import { getMyAccount } from "@/app/actions";
import { fail, failWith, ok, readJson } from "@/lib/api";
import { createAppToken } from "@/lib/app-token";
import { signUpWithPassword } from "@/lib/db/password-auth";
import { withProfile } from "@/lib/session";

/** Cadastro pelo app (nome, e-mail e senha), com as mesmas regras do site. */
export async function POST(req: NextRequest) {
  const body = await readJson(req);
  if (!body) return fail("invalid_input", 400);
  const result = await signUpWithPassword(body);
  if (!result.ok) return failWith(result.error);
  const account = await withProfile(result.profileId, getMyAccount);
  return ok({ token: await createAppToken(result.profileId), account }, { status: 201 });
}
