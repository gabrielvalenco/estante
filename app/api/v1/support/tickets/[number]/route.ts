import type { NextRequest } from "next/server";

import { getTicket } from "@/app/support-actions";
import { fail, ok } from "@/lib/api";

type Props = { params: Promise<{ number: string }> };

/** Um pedido de quem está logado, com as mensagens. */
export async function GET(_req: NextRequest, { params }: Props) {
  const ticket = await getTicket({ number: Number((await params).number) });
  return ticket ? ok(ticket) : fail("not_found", 404);
}
