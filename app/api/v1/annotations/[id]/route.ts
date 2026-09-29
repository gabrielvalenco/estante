import type { NextRequest } from "next/server";

import { deleteAnnotationAction, updateAnnotationAction } from "@/app/reading-actions";
import { appUser, fail, failWith, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** Edita texto, comentário ou página: { text?, comment?, page? }. */
export async function PATCH(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = await readJson(req, 12_000);
  if (!body) return fail("invalid", 400);
  const r = await updateAnnotationAction((await params).id, body as Parameters<typeof updateAnnotationAction>[1]);
  return r.ok ? ok({ annotation: r.annotation }) : failWith(r.error);
}

export async function DELETE(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const r = await deleteAnnotationAction((await params).id);
  return r.ok ? ok({ ok: true }) : fail("not_found", 404);
}
