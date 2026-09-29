import type { NextRequest } from "next/server";

import { respondFollowRequest } from "@/app/social-actions";
import { appUser, fail, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ handle: string }> };

/** Aceita ({ accept: true }) ou recusa um pedido para seguir recebido de @handle. */
export async function POST(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const { handle } = await params;
  const body = (await readJson(req)) as { accept?: unknown } | null;
  if (typeof body?.accept !== "boolean") return fail("invalid", 400);
  const r = await respondFollowRequest(handle, body.accept);
  return r.ok ? ok({ ok: true }) : fail("not_found", 404);
}
