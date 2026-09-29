"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getPrivateProfileContent } from "@/app/social-actions";
import { FollowButton } from "@/components/follow-button";
import { ProfileBody } from "@/components/profile-body";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { followStateOf, useAuth } from "@/lib/auth";
import type { ProfileContent } from "@/lib/profiles";

type State = { status: "loading" } | { status: "ok"; content: ProfileContent } | { status: "locked"; reason: string };

/**
 * Conteúdo de perfil privado. Nunca está no HTML da página: o navegador pede ao servidor,
 * que só entrega para a própria pessoa e seguidores aprovados.
 */
export function PrivateProfileGate({ handle, name, goal }: { handle: string; name: string; goal: number }) {
  const auth = useAuth();
  const [state, setState] = useState<State>({ status: "loading" });
  const followState = followStateOf(auth, handle);
  const firstName = name.split(" ")[0];

  useEffect(() => {
    if (auth.status === "loading") return;
    let cancelled = false;
    setState({ status: "loading" });
    void getPrivateProfileContent(handle).then((r) => {
      if (cancelled) return;
      setState(r.ok ? { status: "ok", content: r.content } : { status: "locked", reason: r.reason });
    });
    return () => {
      cancelled = true;
    };
    // Refaz quando a pessoa passa a seguir (pedido aceito chega no próximo carregamento).
  }, [auth.status, handle, followState]);

  if (state.status === "loading") {
    return (
      <div className="mt-8" aria-busy aria-label="Carregando">
        <Skeleton className="h-20 w-full max-w-md rounded-xl" />
        <Skeleton className="mt-6 h-20 w-full rounded-2xl" />
      </div>
    );
  }
  if (state.status === "ok") return <ProfileBody content={state.content} goal={goal} firstName={firstName} />;

  return (
    <div className="mt-10 flex max-w-md flex-col items-start rounded-3xl border border-line bg-surface p-6">
      <span className="flex size-12 items-center justify-center rounded-full bg-sunken text-ink-2">
        <Lock className="size-5" aria-hidden />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-ink">Este perfil é privado</h2>
      <p className="mt-1 text-[0.9375rem] text-ink-3">
        {state.reason === "blocked"
          ? "Este conteúdo não está disponível."
          : followState === "requested"
            ? `Seu pedido foi enviado. Quando ${firstName} aceitar, a estante aparece aqui.`
            : `Siga ${firstName} para ver a estante, o diário e as reviews.`}
      </p>
      <div className="mt-5">
        {state.reason === "login" ? (
          <Button render={<Link href={`/entrar?next=${encodeURIComponent(`/u/${handle}`)}`} />} nativeButton={false}>
            Entrar para pedir
          </Button>
        ) : state.reason === "not_follower" ? (
          <FollowButton handle={handle} isPrivate />
        ) : null}
      </div>
    </div>
  );
}
