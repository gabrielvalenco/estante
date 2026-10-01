import type { NextRequest } from "next/server";

import { inviteFollowerAction } from "@/app/club-actions";
import { appUser, fail, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

const STATUS: Record<string, number> = { not_found: 404, not_follower: 403, blocked: 403, already_member: 409, full: 409, limit_invites: 429 };

/** Convida um seguidor: { handle }. A pessoa recebe uma notificação e decide se entra. */
export async function POST(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = (await readJson(req)) as { handle?: unknown } | null;
  const r = await inviteFollowerAction((await params).id, String(body?.handle ?? ""));
  return r.ok ? ok({ ok: true }, { status: 201 }) : fail(r.error, STATUS[r.error] ?? 400);
}
