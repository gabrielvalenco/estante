import type { NextRequest } from "next/server";

import { getRetrospective } from "@/app/retrospective-actions";
import { appUser, fail, ok } from "@/lib/api";

/** Retrospectiva do ano (?year=2026). A parte completa vem só no Capa Dura (full: null no Brochura). */
export async function GET(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const raw = req.nextUrl.searchParams.get("year");
  const data = await getRetrospective(raw ? Number(raw) : undefined);
  return data ? ok(data) : fail("invalid", 400);
}
