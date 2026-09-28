"use client";

import { Heart, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getFollowingFeed } from "@/app/actions";
import { BookCover } from "@/components/book-cover";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth, useAuthFlags } from "@/lib/auth";
import { toISODate } from "@/lib/dates";
import type { FeedItem } from "@/lib/db/types";
import { formatRelative } from "@/lib/format";

/** O que a atividade significa, em português de gente. */
function describe(item: FeedItem) {
  if (item.review) return "escreveu sobre";
  if (item.status === "lido") return item.rating ? "leu e avaliou" : "terminou de ler";
  if (item.status === "lendo") return "começou a ler";
  if (item.status === "quero-ler") return "quer ler";
  if (item.liked) return "curtiu";
  return "atualizou";
}

/** Feed de quem você segue. Depende da sessão, então é buscado no navegador. */
export function FollowingFeed() {
  const auth = useAuth();
  const { accounts } = useAuthFlags();
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const followingKey = auth.status === "user" ? auth.following.join(",") : "";

  useEffect(() => {
    if (auth.status !== "user") return;
    let cancelled = false;
    void getFollowingFeed().then((feed) => !cancelled && setItems(feed ?? []));
    return () => {
      cancelled = true;
    };
    // Recarrega quando a pessoa segue ou deixa de seguir alguém.
  }, [auth.status, followingKey]);

  if (!accounts) {
    return <Empty title="Seguir leitores precisa de conta">Esta versão roda sem banco de dados.</Empty>;
  }
  if (auth.status === "loading") return <FeedSkeleton />;
  if (auth.status === "guest") {
    return (
      <Empty title="Acompanhe o que seus amigos leem" action={<Button size="lg" render={<Link href="/entrar?next=/seguindo" />} nativeButton={false}>Entrar</Button>}>
        Entre para seguir leitores e ver aqui o que eles estão lendo, as notas e as reviews.
      </Empty>
    );
  }
  if (!auth.following.length) {
    return (
      <Empty
        title="Você ainda não segue ninguém"
        action={<Button size="lg" render={<Link href="/leitores" />} nativeButton={false}>Encontrar leitores</Button>}
      >
        Siga pessoas pelo perfil delas. O que elas lerem aparece aqui.
      </Empty>
    );
  }
  if (!items) return <FeedSkeleton />;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-title font-semibold text-ink">Seguindo</h1>
          <p className="mt-2 text-ink-3">
            O que {auth.following.length === 1 ? "a pessoa que você segue anda" : `as ${auth.following.length} pessoas que você segue andam`} lendo.
          </p>
        </div>
      </header>

      {items.length === 0 ? (
        <p className="mt-12 text-ink-3">Ninguém que você segue registrou uma leitura ainda.</p>
      ) : (
        <ol className="mt-10 max-w-3xl divide-y divide-line">
          {items.map((item) => (
            <li key={`${item.user.handle}-${item.book.id}`} className="flex gap-4 py-5 first:pt-0">
              <BookCover book={item.book} size="M" href={`/livro/${item.book.id}`} className="w-14 shrink-0 sm:w-16" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-ink-2">
                  <UserAvatar user={item.user} size={22} />
                  <Link href={`/u/${item.user.handle}`} className="font-semibold text-ink hover:underline">
                    {item.user.name}
                  </Link>
                  <span>{describe(item)}</span>
                  <Link href={`/livro/${item.book.id}`} className="font-semibold tracking-tight text-ink hover:underline">
                    {item.book.title}
                  </Link>
                </p>
                <p className="mt-1 flex items-center gap-2 text-[0.8125rem] text-ink-3">
                  {item.rating && <Stars value={item.rating} size={13} />}
                  {item.liked && <Heart className="size-3.5 fill-ameixa text-ameixa" aria-label="Curtiu" />}
                  <time dateTime={new Date(item.updatedAt).toISOString()}>
                    {formatRelative(toISODate(new Date(item.updatedAt)))}
                  </time>
                </p>
                {item.review && (
                  <p className="mt-2 line-clamp-4 text-[0.9375rem] leading-relaxed break-words whitespace-pre-line text-ink-2">{item.review}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}

function Empty({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-anil-soft text-anil">
        <Users className="size-6" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      <p className="mt-2 text-ink-3">{children}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div aria-busy aria-label="Carregando">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="mt-3 h-5 w-72" />
      <div className="mt-10 grid max-w-3xl gap-6">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="aspect-[2/3] w-16 shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
