import type { NextRequest } from "next/server";

import { createClubAction, listMyClubs } from "@/app/club-actions";
import { appUser, fail, ok, readJson } from "@/lib/api";

/** Clubes de que a pessoa participa e se o plano deixa criar outro. */
export async function GET(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const data = await listMyClubs();
  return data ? ok(data) : fail("unauthenticated", 401);
}

/** Cria um clube: { name, description?, book? }. Só no Ex Libris (402 nos outros planos). */
export async function POST(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = await readJson(req);
  if (!body) return fail("invalid", 400);
  const r = await createClubAction(body as Parameters<typeof createClubAction>[0]);
  if (r.ok) return ok({ id: r.id }, { status: 201 });
  return fail(r.error, r.error === "plan" || r.error === "limit_clubs" ? 402 : 400);
}
