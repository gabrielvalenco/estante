import type { NextRequest } from "next/server";

import { replyAction } from "@/app/discussion-actions";
import { appUser, fail, failWith, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** Responde a discussão: { body, page }. */
export async function POST(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = (await readJson(req, 12_000)) as { body?: unknown; page?: unknown } | null;
  if (!body) return fail("invalid", 400);
  const r = await replyAction((await params).id, { body: String(body.body ?? ""), page: Number(body.page ?? 0) });
  if (r.ok) return ok({ post: r.post }, { status: 201 });
  return r.error === "rate_limited" ? fail(r.error, 429) : failWith(r.error);
}
