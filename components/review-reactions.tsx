"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { getMyReactions, reactToReviewAction } from "@/app/social-actions";
import { ShareReviewButton } from "@/components/share-review";
import { useAuth, useAuthFlags } from "@/lib/auth";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Minhas reações, compartilhadas pela página. Cada card pede a sua chave; os pedidos
 * do mesmo instante viram uma única chamada ao servidor (uma página com 50 reviews = 1 request).
 */
const mine = new Map<string, 1 | -1 | 0>();
const listeners = new Set<() => void>();
let pending = new Set<string>();
let timer: ReturnType<typeof setTimeout> | null = null;
let version = 0;

function emit() {
  version++;
  listeners.forEach((l) => l());
}

function request(key: string) {
  if (mine.has(key) || pending.has(key)) return;
  pending.add(key);
  timer ??= setTimeout(async () => {
    const keys = [...pending];
    pending = new Set();
    timer = null;
    const result = await getMyReactions(keys).catch(() => ({}) as Record<string, 1 | -1>);
    keys.forEach((k) => mine.set(k, (result as Record<string, 1 | -1>)[k] ?? 0));
    emit();
  }, 0);
}

function useMine(key: string) {
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
    () => 0,
  );
  return mine.get(key);
}

/** Curtir / não curtir uma review de verdade. Otimista, com os números vindos do servidor no fim. */
export function ReviewReactions({
  handle,
  bookId,
  likes,
  dislikes,
  share,
}: {
  handle: string;
  bookId: string;
  likes: number;
  dislikes: number;
  /** Dados para o botão "Compartilhar", que só aparece na própria review. */
  share?: { title: string; rating: number | null; version: number };
}) {
  const auth = useAuth();
  const { accounts } = useAuthFlags();
  const key = `${handle}:${bookId}`;
  const current = useMine(key) ?? 0;
  const [counts, setCounts] = useState({ likes, dislikes });
  const [busy, setBusy] = useState(false);
  const isOwn = auth.status === "user" && auth.profile.handle === handle;

  useEffect(() => {
    if (auth.status === "user" && !isOwn) request(key);
  }, [auth.status, isOwn, key]);

  async function react(value: 1 | -1) {
    if (auth.status !== "user" || isOwn || busy) return;
    const previous = current;
    const next = current === value ? 0 : value;
    // Ajuste otimista dos números.
    setCounts((c) => ({
      likes: c.likes - (previous === 1 ? 1 : 0) + (next === 1 ? 1 : 0),
      dislikes: c.dislikes - (previous === -1 ? 1 : 0) + (next === -1 ? 1 : 0),
    }));
    mine.set(key, next);
    emit();
    setBusy(true);
    const result = await reactToReviewAction(handle, bookId, next).catch(() => ({ ok: false as const, error: "unavailable" as const }));
    setBusy(false);
    if (!result.ok) {
      mine.set(key, previous);
      emit();
      setCounts({ likes, dislikes });
      toast.error(result.error === "forbidden" ? "Não é possível reagir a esta review" : "Não foi possível salvar sua reação");
      return;
    }
    setCounts({ likes: result.likes, dislikes: result.dislikes });
  }

  const button = (value: 1 | -1) => {
    const active = current === value;
    const Icon = value === 1 ? ThumbsUp : ThumbsDown;
    const label = value === 1 ? "Curtir a review" : "Não curti a review";
    const count = value === 1 ? counts.likes : counts.dislikes;
    const className = cn(
      "inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
      active ? (value === 1 ? "bg-anil-soft text-anil" : "bg-sunken text-ink") : "text-ink-3 hover:bg-sunken hover:text-ink-2",
      (isOwn || !accounts) && "pointer-events-none",
    );
    const content = (
      <>
        <Icon className={cn("size-3.5", active && value === 1 && "fill-current")} aria-hidden />
        <span className="tnum">{formatCount(count)}</span>
      </>
    );
    if (auth.status === "guest" && accounts) {
      return (
        <Link href={`/entrar?next=${encodeURIComponent(`/livro/${bookId}`)}`} aria-label={`${label}: entre para reagir`} className={className}>
          {content}
        </Link>
      );
    }
    return (
      <button
        type="button"
        onClick={() => react(value)}
        aria-pressed={active}
        aria-label={isOwn ? `${label} (${count}). Sua review` : `${label} (${count})`}
        disabled={isOwn || busy}
        className={className}
      >
        {content}
      </button>
    );
  };

  return (
    <div className="mt-2 -ml-2.5 flex items-center gap-0.5">
      {button(1)}
      {button(-1)}
      {isOwn && share && (
        <ShareReviewButton handle={handle} bookId={bookId} title={share.title} rating={share.rating} version={share.version} variant="icon" />
      )}
    </div>
  );
}
