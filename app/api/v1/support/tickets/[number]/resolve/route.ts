import type { NextRequest } from "next/server";

import { resolveTicketAction } from "@/app/support-actions";
import { fail, ok } from "@/lib/api";

type Props = { params: Promise<{ number: string }> };

/** Marca o próprio pedido como resolvido. */
export async function POST(_req: NextRequest, { params }: Props) {
  const r = await resolveTicketAction({ number: Number((await params).number) });
  return r.ok ? ok({ ok: true }) : fail("not_found", 404);
}
