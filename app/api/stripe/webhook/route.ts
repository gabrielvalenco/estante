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
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!s || !secret || !signature) return NextResponse.json({ error: "not_configured" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = await s.webhooks.constructEventAsync(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
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
