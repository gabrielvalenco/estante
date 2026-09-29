"use client";

import { Crown, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getSuggestedReaders, type SuggestedReader } from "@/app/social-actions";
import { FollowButton } from "@/components/follow-button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth, useAuthFlags } from "@/lib/auth";
import { cn } from "@/lib/utils";

/**
 * "Quem seguir": leitores próximos no gosto (amaram os mesmos livros) ou na rede
 * (seguidos por quem você segue). Sem localização. Visitante vê os mais seguidos.
 */
export function SuggestedReaders({ title = "Sugestões para você", className }: { title?: string; className?: string }) {
  const auth = useAuth();
  const { accounts } = useAuthFlags();
  const [items, setItems] = useState<SuggestedReader[] | null>(null);

  useEffect(() => {
    if (!accounts || auth.status === "loading") return;
    let cancelled = false;
    void getSuggestedReaders(6)
      .then((r) => !cancelled && setItems(r))
      .catch(() => !cancelled && setItems([]));
    return () => {
      cancelled = true;
    };
    // Só recarrega ao entrar/sair: seguir alguém da lista não a esvazia na hora.
  }, [accounts, auth.status]);

  if (!accounts || (items && items.length === 0)) return null;

  return (
    <section className={cn("", className)}>
      <h2 className="flex items-center gap-2 text-section font-semibold text-ink">
        <Sparkles className="size-5 text-ambar" aria-hidden />
        {auth.status === "user" ? title : "Leitores em destaque"}
      </h2>
      <p className="mt-1 text-sm text-ink-3">
        {auth.status === "user" ? "Pelo que vocês leem e por quem vocês seguem em comum." : "Os mais seguidos na Estante."}
      </p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items === null
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <Skeleton className="h-[4.5rem] w-full rounded-2xl" />
              </li>
            ))
          : items.map((r) => (
              <li
                key={r.handle}
                className="relative flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong"
              >
                <UserAvatar user={r} size={44} href={false} />
                <div className="min-w-0 flex-1">
                  <Link href={`/u/${r.handle}`} className="flex items-center gap-1.5 font-semibold tracking-tight text-ink after:absolute after:inset-0">
                    <span className="truncate">{r.name}</span>
                    {r.founder && <Crown className="size-3.5 shrink-0 text-ambar-ink" aria-label="Fundador" />}
                    {r.isPrivate && <Lock className="size-3 shrink-0 text-ink-4" aria-label="Perfil privado" />}
                  </Link>
                  <p className="truncate text-[0.8125rem] text-ink-3">{r.reason}</p>
                </div>
                <FollowButton handle={r.handle} isPrivate={r.isPrivate} size="sm" />
              </li>
            ))}
      </ul>
    </section>
  );
}
