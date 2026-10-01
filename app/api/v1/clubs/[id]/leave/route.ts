import type { NextRequest } from "next/server";

import { leaveClubAction } from "@/app/club-actions";
import { appUser, fail, ok } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** Sai do clube (quem criou não sai: apaga pelo site). */
export async function POST(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const r = await leaveClubAction((await params).id);
  return r.ok ? ok({ ok: true }) : fail(r.error ?? "invalid", r.error === "not_found" ? 404 : 400);
}
