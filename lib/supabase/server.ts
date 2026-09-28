import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Cliente com a sessão de quem está acessando (lê cookies, então a rota vira dinâmica).
 * Use só onde a resposta depende do usuário: callback de login, configurações da conta.
 */
export async function getServerClient(): Promise<SupabaseClient<Database> | null> {
  if (!isSupabaseConfigured) return null;
  const store = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Chamado de um Server Component: quem renova a sessão é o middleware.
        }
      },
    },
  });
}

let publicClient: SupabaseClient<Database> | null = null;

/**
 * Cliente anônimo, sem cookies, para dados públicos (perfis e reviews).
 * Não força a rota a ser dinâmica, então as páginas continuam em cache com revalidação.
 */
export function getPublicClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  publicClient ??= createClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return publicClient;
}
