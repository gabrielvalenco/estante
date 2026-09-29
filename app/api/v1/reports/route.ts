import type { NextRequest } from "next/server";

import { reportAction } from "@/app/discussion-actions";
import { appUser, fail, ok, readJson } from "@/lib/api";

/** Denuncia uma discussão ou resposta: { kind: "thread" | "post", id, reason? }. */
export async function POST(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const body = (await readJson(req)) as { kind?: unknown; id?: unknown; reason?: unknown } | null;
  if (body?.kind !== "thread" && body?.kind !== "post") return fail("invalid", 400);
  const r = await reportAction(body.kind, String(body.id ?? ""), String(body.reason ?? ""));
  return r.ok ? ok({ ok: true }) : fail("invalid", 400);
}
