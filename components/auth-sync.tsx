"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";

import { getMyAccount } from "@/app/actions";
import { AuthFlagsContext, setAuth } from "@/lib/auth";
import type { AuthFlags } from "@/lib/auth-flags";
import { beginAccountLoad, connectAccount, disconnectAccount } from "@/lib/library";

/**
 * Liga o estado de autenticação e o modo da estante à sessão do Auth.js.
 * Sem contas configuradas, todo mundo é visitante e nem o SessionProvider é montado
 * (ele chamaria /api/auth/session, que não existe nesse modo).
 */
export function AuthProvider({ flags, children }: { flags: AuthFlags; children: React.ReactNode }) {
  return (
    <AuthFlagsContext.Provider value={flags}>
      {flags.accounts ? (
        <SessionProvider>
          <SessionSync />
          {children}
        </SessionProvider>
      ) : (
        <>
          <GuestOnly />
          {children}
        </>
      )}
    </AuthFlagsContext.Provider>
  );
}

function GuestOnly() {
  useEffect(() => {
    setAuth({ status: "guest" });
    disconnectAccount();
  }, []);
  return null;
}

function SessionSync() {
  const { status, data } = useSession();
  const userId = data?.user?.id;

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !userId) {
      setAuth({ status: "guest" });
      disconnectAccount();
      return;
    }

    let cancelled = false;
    beginAccountLoad();
    void getMyAccount().then(async (account) => {
      if (cancelled) return;
      if (!account) {
        // Sessão de um perfil que não existe mais (ex.: banco recriado).
        setAuth({ status: "guest" });
        disconnectAccount();
        return;
      }
      setAuth({ status: "user", profile: account.profile, following: account.following });
      await connectAccount(account.shelf);
    });
    return () => {
      cancelled = true;
    };
  }, [status, userId]);

  return null;
}
