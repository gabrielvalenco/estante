import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/safe-next";
import { getServerClient } from "@/lib/supabase/server";

/** Destino do link mágico e do OAuth: troca o código pela sessão e volta para onde a pessoa estava. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  const sb = await getServerClient();
  if (sb && code) {
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/entrar?erro=link&next=${encodeURIComponent(next)}`);
}
