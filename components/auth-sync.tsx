"use client";

import { useEffect } from "react";

import { setAuth } from "@/lib/auth";
import { connectAccount, disconnectAccount } from "@/lib/library";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Ouve a sessão do Supabase e mantém o estado de autenticação e a estante no modo certo.
 * Montado uma vez no layout. Sem Supabase configurado, todo mundo é visitante.
 */
export function AuthSync() {
  useEffect(() => {
    const sb = getBrowserClient();
    if (!sb) {
      setAuth({ status: "guest" });
      return;
    }

    let currentUser: string | null = null;

    async function apply(user: { id: string; email?: string } | null) {
      if (!user) {
        currentUser = null;
        setAuth({ status: "guest" });
        disconnectAccount();
        return;
      }
      if (user.id === currentUser) return;
      currentUser = user.id;
      setAuth({ status: "user", userId: user.id, email: user.email ?? null, profile: null });
      const [{ data: profile }] = await Promise.all([
        sb!.from("profiles").select("*").eq("id", user.id).single(),
        connectAccount(user.id),
      ]);
      if (currentUser === user.id) setAuth({ status: "user", userId: user.id, email: user.email ?? null, profile });
    }

    // O evento INITIAL_SESSION chega logo na inscrição, com ou sem sessão.
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      // Fora do callback: chamadas ao Supabase dentro dele podem travar a fila de auth.
      setTimeout(() => void apply(session?.user ?? null), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return null;
}
