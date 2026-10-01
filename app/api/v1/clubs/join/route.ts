import type { NextRequest } from "next/server";

import { joinClubAction } from "@/app/club-actions";
import { appUser, fail, ok, readJson } from "@/lib/api";

/** Entra num clube pelo código do convite: { code }. */
export async function POST(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = (await readJson(req)) as { code?: unknown } | null;
  const r = await joinClubAction(String(body?.code ?? ""));
  if (r.ok) return ok({ id: r.id });
  return fail(r.error, r.error === "not_found" ? 404 : r.error === "blocked" ? 403 : 409);
}
