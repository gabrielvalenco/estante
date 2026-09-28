import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/** Renova o token de sessão do Supabase a cada navegação, mantendo os cookies em dia. */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Não coloque nada entre a criação do cliente e esta chamada: é ela que renova a sessão.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Só páginas que dependem da sessão. As públicas ficam em cache sem passar por aqui.
  matcher: ["/entrar", "/conta/:path*", "/auth/:path*", "/estante"],
};
