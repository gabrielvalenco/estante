import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import { stripe, syncSubscription } from "@/lib/billing";

export const runtime = "nodejs";

/**
 * Webhook do Stripe: renovações, cancelamentos e cobranças que falharam.
 * A assinatura do evento é conferida com STRIPE_WEBHOOK_SECRET antes de qualquer coisa,
 * então ninguém consegue se dar o plano mandando um evento falso.
 */
export async function POST(req: NextRequest) {
  const s = stripe();
  // trim: um espaço ou quebra de linha colados junto com o segredo na Vercel invalidam toda assinatura.
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = req.headers.get("stripe-signature");
  if (!s || !secret || !signature) return NextResponse.json({ error: "not_configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await s.webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch (err) {
    // O motivo aparece na entrega do Stripe e no log da Vercel; nunca inclui o segredo.
    const reason = !secret.startsWith("whsec_")
      ? "O segredo configurado não começa com whsec_: confira STRIPE_WEBHOOK_SECRET."
      : err instanceof Error && /timestamp/i.test(err.message)
        ? "Assinatura fora do prazo: confira o relógio do servidor."
        : "A assinatura não confere: STRIPE_WEBHOOK_SECRET não é o segredo deste destino.";
    console.error("[stripe webhook]", reason);
    return NextResponse.json({ error: "invalid_signature", reason }, { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(event.data.object);
      break;
    case "checkout.session.completed": {
      const id = event.data.object.subscription;
      if (typeof id === "string") await syncSubscription(await s.subscriptions.retrieve(id));
      break;
    }
  }
  return NextResponse.json({ received: true });
}
