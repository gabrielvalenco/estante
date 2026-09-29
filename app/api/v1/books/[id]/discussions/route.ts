import type { NextRequest } from "next/server";

import { createThreadAction, listThreads } from "@/app/discussion-actions";
import { appUser, fail, failWith, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** Discussões do livro. Sem token, vale como visitante (só o que é sem spoiler). ?spoilers=1 mostra tudo. */
export async function GET(req: NextRequest, { params }: Props) {
  const data = await listThreads((await params).id, req.nextUrl.searchParams.get("spoilers") === "1");
  return data ? ok(data) : fail("not_found", 404);
}

/** Nova discussão: { bookTitle, title, body, page }. Limite do plano: 402 com usage. */
export async function POST(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = (await readJson(req, 12_000)) as { bookTitle?: unknown; title?: unknown; body?: unknown; page?: unknown } | null;
  if (!body) return fail("invalid", 400);
  const r = await createThreadAction({
    book: { id: (await params).id, title: String(body.bookTitle ?? "") },
    title: String(body.title ?? ""),
    body: String(body.body ?? ""),
    page: Number(body.page ?? 0),
  });
  if (r.ok) return ok({ thread: r.thread, usage: r.usage }, { status: 201 });
  if (r.error === "limit_threads") return ok({ error: r.error, usage: r.usage }, { status: 402 });
  return r.error === "rate_limited" ? fail(r.error, 429) : failWith(r.error);
}
