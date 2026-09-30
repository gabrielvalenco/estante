import { NextResponse } from "next/server";

import { billingEnabled } from "@/lib/billing";
import { ocrEnabled } from "@/lib/ocr";
import { limitValue, PLANS } from "@/lib/plans";

/** Planos para a tela do app: limites de cada um e se a assinatura já está aberta (chave do Stripe configurada). */
export function GET() {
  const plans = Object.entries(PLANS).map(([id, p]) => ({
    id,
    name: p.name,
    limits: {
      quotes: limitValue(p.limits.quotes),
      notesPerBook: limitValue(p.limits.notesPerBook),
      threadsPerMonth: limitValue(p.limits.threadsPerMonth),
      photoQuotesPerMonth: limitValue(p.limits.photoQuotesPerMonth),
    },
  }));
  return NextResponse.json(
    { enabled: billingEnabled(), photoQuotes: ocrEnabled(), prices: { month: 690, year: 5900, currency: "BRL" }, plans },
    { headers: { "Cache-Control": "public, s-maxage=300" } },
  );
}
