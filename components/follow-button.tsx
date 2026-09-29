"use client";

import { Check, Clock, Lock, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { setFollowAction } from "@/app/actions";
import { followStateOf, setFollowState, useAuth, useAuthFlags, type FollowState } from "@/lib/auth";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Botão de seguir. Otimista: muda na hora e desfaz com aviso se o servidor recusar.
 * Perfil privado: vira "Pedir para seguir" e fica "Pedido enviado" até a pessoa aceitar.
 * Visitante vê "Seguir" levando ao login; no próprio perfil e com bloqueio, nada aparece.
 */
export function FollowButton({
  handle,
  isPrivate = false,
  size = "md",
  label,
  className,
}: {
  handle: string;
  isPrivate?: boolean;
  size?: "sm" | "md";
  /** Texto do estado "seguir" (ex.: "Seguir de volta" nas notificações). */
  label?: string;
  className?: string;
}) {
  const auth = useAuth();
  const { accounts } = useAuthFlags();
  const [busy, setBusy] = useState(false);

  if (!accounts || auth.status === "loading") return null;
  if (auth.status === "user" && (auth.profile.handle === handle || auth.blocked.includes(handle))) return null;

  const base = cn(
    "relative z-10 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition-colors active:scale-[0.97]",
    size === "sm" ? "h-8 px-3 text-[0.8125rem]" : "h-10 px-4 text-sm",
    className,
  );
  const followLabel = isPrivate ? "Pedir para seguir" : (label ?? "Seguir");
  const FollowIcon = isPrivate ? Lock : UserPlus;

  if (auth.status === "guest") {
    return (
      <Link href={`/entrar?next=${encodeURIComponent(`/u/${handle}`)}`} className={cn(base, "bg-anil text-on-brand hover:bg-anil-hover")}>
        <FollowIcon className="size-4" aria-hidden />
        {followLabel}
      </Link>
    );
  }

  const state = followStateOf(auth, handle);

  async function toggle() {
    const previous: FollowState = state;
    const optimistic: FollowState = state === "none" ? (isPrivate ? "requested" : "following") : "none";
    setBusy(true);
    setFollowState(handle, optimistic);
    const result = await setFollowAction(handle, optimistic !== "none").catch(() => ({ ok: false as const, error: "unavailable" as const }));
    setBusy(false);
    if (!result.ok) {
      setFollowState(handle, previous);
      toast.error(result.error === "blocked" ? "Não é possível seguir este perfil" : "Não foi possível atualizar", {
        description: result.error === "blocked" ? undefined : "Tente de novo em instantes.",
      });
      return;
    }
    // O servidor decide: se a pessoa virou privada nesse meio-tempo, o "seguir" vira pedido.
    setFollowState(handle, result.state);
    if (result.state === "requested" && previous === "none") toast("Pedido enviado", { description: `@${handle} precisa aceitar.` });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={state !== "none"}
      className={cn(base, state === "none" ? "bg-anil text-on-brand hover:bg-anil-hover" : "group/follow bg-sunken text-ink hover:bg-line")}
    >
      {state === "none" && (
        <>
          <FollowIcon className="size-4" aria-hidden />
          {followLabel}
        </>
      )}
      {state !== "none" && (
        <>
          {state === "following" ? (
            <Check className="size-4 group-hover/follow:hidden" aria-hidden />
          ) : (
            <Clock className="size-4 group-hover/follow:hidden" aria-hidden />
          )}
          <span className="group-hover/follow:hidden">{state === "following" ? "Seguindo" : "Pedido enviado"}</span>
          <span className="hidden group-hover/follow:inline">{state === "following" ? "Deixar de seguir" : "Cancelar pedido"}</span>
        </>
      )}
    </button>
  );
}

/**
 * Seguidores e seguindo do perfil, com o botão. O número de seguidores vem do servidor (página em cache)
 * e é ajustado na hora quando a pessoa segue ou deixa de seguir aqui (pedido pendente não conta).
 */
export function FollowSection({
  handle,
  followers,
  following,
  isPrivate,
}: {
  handle: string;
  followers: number;
  following: number;
  isPrivate: boolean;
}) {
  const auth = useAuth();
  const isFollowing = followStateOf(auth, handle) === "following";
  // Referência para o ajuste otimista: o número do servidor e se a pessoa seguia naquele momento.
  // Quando o servidor manda um número novo (a action revalida a página), a referência é refeita;
  // sem isso, o +1 otimista seria somado ao número que já inclui o follow.
  const [baseline, setBaseline] = useState<{ followers: number; following: boolean } | null>(null);
  if (auth.status === "user" && (baseline === null || baseline.followers !== followers)) {
    setBaseline({ followers, following: isFollowing });
  }
  const shown = followers + (baseline === null ? 0 : Number(isFollowing) - Number(baseline.following));

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
      <p className="tnum text-sm text-ink-3">
        <span className="font-semibold text-ink">{formatCount(Math.max(0, shown))}</span> {shown === 1 ? "seguidor" : "seguidores"}
        <span aria-hidden className="mx-2">
          ·
        </span>
        <span className="font-semibold text-ink">{formatCount(following)}</span> seguindo
      </p>
      <FollowButton handle={handle} isPrivate={isPrivate} size="sm" />
    </div>
  );
}
