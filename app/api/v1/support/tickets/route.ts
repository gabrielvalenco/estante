import type { NextRequest } from "next/server";

import { listMyTickets } from "@/app/support-actions";
import { fail, failWith, ok, readJson } from "@/lib/api";
import { createTicket } from "@/lib/support-server";

/** Pedidos de suporte de quem está logado. */
export async function GET() {
  const tickets = await listMyTickets();
  return tickets ? ok({ tickets }) : fail("unauthenticated", 401);
}

/**
 * Abre um pedido: { topic, subject, body, email?, name?, appVersion? }. Sem token, o e-mail é obrigatório
 * e a resposta inclui o `token` do link privado (/ajuda/pedido/:token).
 */
export async function POST(req: NextRequest) {
  const body = (await readJson(req, 12_000)) as Record<string, unknown> | null;
  if (!body) return fail("invalid", 400);
  const appVersion = typeof body.appVersion === "string" ? body.appVersion.slice(0, 20) : null;
  const r = await createTicket(
    {
      topic: body.topic as never,
      subject: String(body.subject ?? ""),
      body: String(body.body ?? ""),
      email: typeof body.email === "string" ? body.email : undefined,
      name: typeof body.name === "string" ? body.name : undefined,
    },
    { platform: "app", appVersion },
  );
  return r.ok ? ok({ number: r.number, token: r.token }, { status: 201 }) : failWith(r.error);
}
