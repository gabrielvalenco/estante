import type { NextRequest } from "next/server";

import { replyTicketAction } from "@/app/support-actions";
import { fail, failWith, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ number: string }> };

/** Responde no próprio pedido: { body }. Reabre se estava respondido ou resolvido. */
export async function POST(req: NextRequest, { params }: Props) {
  const body = (await readJson(req, 12_000)) as { body?: unknown } | null;
  if (!body) return fail("invalid", 400);
  const r = await replyTicketAction({ number: Number((await params).number) }, String(body.body ?? ""));
  return r.ok ? ok({ ok: true }, { status: 201 }) : failWith(r.error);
}
