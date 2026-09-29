import type { NextRequest } from "next/server";

import { createAnnotationAction, listAnnotations, listProgress } from "@/app/reading-actions";
import { appUser, fail, failWith, ok, readJson } from "@/lib/api";

/** Todas as anotações (?kind=quote|note) e os marcadores de todos os livros. */
export async function GET(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const kind = req.nextUrl.searchParams.get("kind");
  const [data, progress] = await Promise.all([listAnnotations(kind === "quote" || kind === "note" ? kind : undefined), listProgress()]);
  return data ? ok({ ...data, progress }) : fail("unauthenticated", 401);
}

/**
 * Nova citação ou nota: { book, kind, text, comment?, page? }.
 * Passou do limite do plano: 402 com { error: "limit_quotes" | "limit_notes", usage }.
 */
export async function POST(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = await readJson(req, 12_000);
  if (!body) return fail("invalid", 400);
  const r = await createAnnotationAction(body as Parameters<typeof createAnnotationAction>[0]);
  if (r.ok) return ok({ annotation: r.annotation, usage: r.usage }, { status: 201 });
  if (r.error === "limit_quotes" || r.error === "limit_notes") return ok({ error: r.error, usage: r.usage }, { status: 402 });
  return failWith(r.error);
}
