import { NextResponse } from "next/server";

import { FAQ, SUPPORT_EMAIL, SUPPORT_TOPICS, TOPIC_LABELS } from "@/lib/support";

/** Perguntas frequentes, assuntos e e-mail de suporte (a mesma fonte do site). */
export function GET() {
  return NextResponse.json(
    { email: SUPPORT_EMAIL, topics: SUPPORT_TOPICS.map((id) => ({ id, label: TOPIC_LABELS[id] })), faq: FAQ },
    { headers: { "Cache-Control": "public, s-maxage=3600" } },
  );
}
