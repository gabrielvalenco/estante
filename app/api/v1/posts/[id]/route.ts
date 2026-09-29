import type { NextRequest } from "next/server";

import { deletePostAction } from "@/app/discussion-actions";
import { appUser, fail, ok } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** Apaga a própria resposta. */
export async function DELETE(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const r = await deletePostAction((await params).id);
  return r.ok ? ok({ ok: true }) : fail("not_found", 404);
}
