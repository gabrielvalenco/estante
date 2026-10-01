import type { NextRequest } from "next/server";

import { cancelInvitationAction } from "@/app/club-actions";
import { appUser, fail, ok } from "@/lib/api";

type Props = { params: Promise<{ id: string; handle: string }> };

/** Cancela um convite ainda sem resposta. Só quem criou. */
export async function DELETE(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const { id, handle } = await params;
  const r = await cancelInvitationAction(id, handle);
  return r.ok ? ok({ ok: true }) : fail("not_found", 404);
}
