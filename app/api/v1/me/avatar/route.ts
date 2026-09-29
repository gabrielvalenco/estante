import type { NextRequest } from "next/server";

import { removeAvatarAction, uploadAvatarAction } from "@/app/account-actions";
import { appUser, fail, failWith, ok } from "@/lib/api";
import { AVATAR_MAX_BYTES } from "@/lib/avatars";

/** Troca a foto: multipart com o campo "file" (o app já manda recortada e reduzida). */
export async function POST(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  if (Number(req.headers.get("content-length") ?? 0) > AVATAR_MAX_BYTES + 10_000) return fail("too_big", 413);
  const form = await req.formData().catch(() => null);
  if (!form) return fail("invalid", 400);
  const r = await uploadAvatarAction(form);
  return r.ok ? ok({ profile: r.profile }) : failWith(r.error);
}

/** Remove a foto (volta para as iniciais). */
export async function DELETE(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const r = await removeAvatarAction();
  return r.ok ? ok({ profile: r.profile }) : fail("unavailable", 503);
}
