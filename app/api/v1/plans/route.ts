import { NextResponse } from "next/server";

import { billingEnabled } from "@/lib/billing";
import { ocrEnabled } from "@/lib/ocr";
import { limitValue, PLANS } from "@/lib/plans";

// Preços em centavos (BRL), os mesmos do scripts/stripe-setup.mjs.
const PRICES: Record<string, { month: number; year: number } | null> = {
  brochura: null,
  "capa-dura": { month: 690, year: 5900 },
  "ex-libris": { month: 1490, year: 11900 },
};

/** Planos para a tela do app: limites de cada um e se a assinatura já está aberta (chave do Stripe configurada). */
export function GET() {
  const plans = Object.entries(PLANS).map(([id, p]) => ({
    id,
    name: p.name,
    prices: PRICES[id] ?? null,
    limits: {
      quotes: limitValue(p.limits.quotes),
      notesPerBook: limitValue(p.limits.notesPerBook),
      threadsPerMonth: limitValue(p.limits.threadsPerMonth),
      photoQuotesPerMonth: limitValue(p.limits.photoQuotesPerMonth),
    },
  }));
  return NextResponse.json(
    { enabled: billingEnabled(), photoQuotes: ocrEnabled(), currency: "BRL", prices: { month: 690, year: 5900, currency: "BRL" }, plans },
    { headers: { "Cache-Control": "public, s-maxage=300" } },
  );
}
