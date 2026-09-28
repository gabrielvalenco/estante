"use client";

import { Check, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { setFollowAction } from "@/app/actions";
import { setFollowing, useAuth, useAuthFlags } from "@/lib/auth";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Botão de seguir. Otimista: muda na hora e desfaz com aviso se o servidor recusar.
 * Visitante vê "Seguir" levando ao login; no próprio perfil, nada aparece.
 */
export function FollowButton({ handle, size = "md", className }: { handle: string; size?: "sm" | "md"; className?: string }) {
  const auth = useAuth();
  const { accounts } = useAuthFlags();
  const [busy, setBusy] = useState(false);

  if (!accounts || auth.status === "loading") return null;
  if (auth.status === "user" && auth.profile.handle === handle) return null;

  const base = cn(
    "relative z-10 inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-medium transition-colors active:scale-[0.97]",
    size === "sm" ? "h-8 px-3 text-[0.8125rem]" : "h-10 px-4 text-sm",
    className,
  );

  if (auth.status === "guest") {
    return (
      <Link href={`/entrar?next=${encodeURIComponent(`/u/${handle}`)}`} className={cn(base, "bg-anil text-on-brand hover:bg-anil-hover")}>
        <UserPlus className="size-4" aria-hidden />
        Seguir
      </Link>
    );
  }

  const following = auth.following.includes(handle);

  async function toggle() {
    const next = !following;
    setBusy(true);
    setFollowing(handle, next);
    const result = await setFollowAction(handle, next).catch(() => ({ ok: false as const }));
    setBusy(false);
    if (!result.ok) {
      setFollowing(handle, !next);
      toast.error("Não foi possível atualizar", { description: "Tente de novo em instantes." });
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={following}
      className={cn(
        base,
        following ? "group/follow bg-sunken text-ink hover:bg-line" : "bg-anil text-on-brand hover:bg-anil-hover",
      )}
    >
      {following ? (
        <>
          <Check className="size-4 group-hover/follow:hidden" aria-hidden />
          <span className="group-hover/follow:hidden">Seguindo</span>
          <span className="hidden group-hover/follow:inline">Deixar de seguir</span>
        </>
      ) : (
        <>
          <UserPlus className="size-4" aria-hidden />
          Seguir
        </>
      )}
    </button>
  );
}

/**
 * Seguidores e seguindo do perfil, com o botão. O número de seguidores vem do servidor (página em cache)
 * e é ajustado na hora quando a pessoa segue ou deixa de seguir aqui.
 */
export function FollowSection({ handle, followers, following }: { handle: string; followers: number; following: number }) {
  const auth = useAuth();
  const isFollowing = auth.status === "user" && auth.following.includes(handle);
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
        <span aria-hidden className="mx-2">·</span>
        <span className="font-semibold text-ink">{formatCount(following)}</span> seguindo
      </p>
      <FollowButton handle={handle} size="sm" />
    </div>
  );
}
