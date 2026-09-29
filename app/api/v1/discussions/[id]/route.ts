import type { NextRequest } from "next/server";

import { deleteThreadAction, getThread } from "@/app/discussion-actions";
import { appUser, fail, ok } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** Uma discussão com as respostas. ?spoilers=1 mostra o que está além da página da pessoa. */
export async function GET(req: NextRequest, { params }: Props) {
  const data = await getThread((await params).id, req.nextUrl.searchParams.get("spoilers") === "1");
  return data ? ok(data) : fail("not_found", 404);
}

/** Apaga a própria discussão. */
export async function DELETE(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const r = await deleteThreadAction((await params).id);
  return r.ok ? ok({ ok: true }) : fail("not_found", 404);
}
