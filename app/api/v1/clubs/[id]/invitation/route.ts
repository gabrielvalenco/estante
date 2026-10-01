import type { NextRequest } from "next/server";

import { getClubInvitation, respondInvitationAction } from "@/app/club-actions";
import { appUser, fail, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** O convite direto que a pessoa recebeu para este clube (prévia). */
export async function GET(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const invitation = await getClubInvitation((await params).id);
  return invitation ? ok(invitation) : fail("not_found", 404);
}

/** Responde o convite: { accept: true } entra no clube; false recusa. */
export async function POST(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = (await readJson(req)) as { accept?: unknown } | null;
  const r = await respondInvitationAction((await params).id, body?.accept === true);
  if (r.ok) return ok({ ok: true });
  return fail(r.error, r.error === "not_found" ? 404 : r.error === "blocked" ? 403 : 409);
}
