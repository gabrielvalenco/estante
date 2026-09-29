import type { NextRequest } from "next/server";

import { saveEntryAction } from "@/app/actions";
import { appUser, fail, failWith, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ bookId: string }> };

/**
 * Salva o registro de um livro na estante (status, nota, curtida, review, data).
 * Corpo igual ao do site: { book, status, rating, liked, review, finishedOn, updatedAt }.
 * Registro vazio remove o livro da estante.
 */
export async function PUT(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const { bookId } = await params;
  const body = (await readJson(req)) as { book?: { id?: unknown } } | null;
  if (!body || body.book?.id !== bookId) return fail("invalid", 400);
  const r = await saveEntryAction(body as Parameters<typeof saveEntryAction>[0]);
  return r.ok ? ok({ ok: true }) : failWith(r.error);
}
