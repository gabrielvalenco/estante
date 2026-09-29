import type { NextRequest } from "next/server";

import { getReadingData, setProgressAction } from "@/app/reading-actions";
import { appUser, fail, failWith, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ bookId: string }> };

/** Marcador, citações e notas da pessoa neste livro, e o uso do plano. */
export async function GET(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const data = await getReadingData((await params).bookId);
  return data ? ok(data) : fail("not_found", 404);
}

/** Salva o marcador: { page, totalPages }. Página 0 sem total apaga o marcador. */
export async function PUT(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = (await readJson(req)) as { page?: unknown; totalPages?: unknown } | null;
  const r = await setProgressAction({ bookId: (await params).bookId, page: body?.page as number, totalPages: (body?.totalPages ?? null) as number | null });
  return r.ok ? ok({ progress: r.progress }) : failWith(r.error);
}
