"use client";

import { Cloud, Heart, MonitorSmartphone } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { STATUS_STYLE } from "@/components/book-actions";
import { Mark } from "@/components/brand";
import { BookCover } from "@/components/book-cover";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { plural } from "@/lib/format";
import { STATUS_LABEL, useLibrary, useLibraryLoading, type Entry, type Status } from "@/lib/library";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

type Filter = "todos" | Status | "curtidos";

const noop = () => () => {};

/** A estante do visitante, lida do navegador. Antes da hidratação mostra o esqueleto, nunca o estado vazio. */
export function MyShelf() {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const auth = useAuth();
  const loading = useLibraryLoading();
  const library = useLibrary();
  const [filter, setFilter] = useState<Filter>("todos");

  const entries = Object.values(library).sort((a, b) => b.updatedAt - a.updatedAt);
  const count = (f: Filter) => entries.filter((e) => match(e, f)).length;
  const shown = entries.filter((e) => match(e, filter));

  const read = entries.filter((e) => e.status === "lido");
  const pages = read.reduce((sum, e) => sum + (e.book.pages ?? 0), 0);

  if (!hydrated || auth.status === "loading" || loading) return <ShelfSkeleton />;
  const synced = auth.status === "user";

  if (!entries.length) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <Mark size={56} className="mx-auto" />
        <h1 className="mt-6 text-title font-semibold text-ink">Sua estante está vazia</h1>
        <p className="mt-3 text-ink-3">
          Abra qualquer livro e marque como <span className="font-medium text-anil">quero ler</span>,{" "}
          <span className="font-medium text-ameixa">lendo</span> ou <span className="font-medium text-musgo">lido</span>. Ele
          aparece aqui na hora.
        </p>
        <Button size="lg" className="mt-8" render={<Link href="/livros" />} nativeButton={false}>
          Explorar livros
        </Button>
        {!synced && isSupabaseConfigured && (
          <p className="mt-6 text-sm text-ink-3">
            Já tem conta?{" "}
            <Link href="/entrar?next=/estante" className="font-medium text-anil">
              Entre para ver sua estante
            </Link>
          </p>
        )}
      </div>
    );
  }

  const filters: Filter[] = ["todos", "quero-ler", "lendo", "lido", "curtidos"];

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-title font-semibold text-ink">Minha estante</h1>
          <p className="tnum mt-2 text-ink-3">
            {plural(read.length, "livro lido", "livros lidos")}
            {pages > 0 && ` · ${pages.toLocaleString("pt-BR")} páginas`}
          </p>
        </div>
        <StorageNote synced={synced} handle={synced ? auth.profile?.handle : undefined} />
      </header>

      <div role="tablist" aria-label="Filtrar estante" className="scroller -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {filters.map((f) => {
          const active = filter === f;
          const style = f in STATUS_STYLE ? STATUS_STYLE[f as Status] : null;
          return (
            <button
              key={f}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-[0.8125rem] font-medium whitespace-nowrap transition-colors",
                active ? (style?.active ?? "bg-ink text-white") : "bg-sunken text-ink-2 hover:bg-line",
              )}
            >
              {f === "todos" ? "Todos" : f === "curtidos" ? "Curtidos" : STATUS_LABEL[f]}
              <span className={cn("tnum text-xs", active ? "opacity-75" : "text-ink-4")}>{count(f)}</span>
            </button>
          );
        })}
      </div>

      {shown.length ? (
        <ul className="mt-8 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-5">
          {shown.map((e) => (
            <li key={e.book.id} className="min-w-0 animate-in fade-in-0 duration-300">
              <BookCover book={e.book} href={`/livro/${e.book.id}`} />
              <div className="mt-2.5 flex items-center gap-1.5">
                {e.status && (
                  <span
                    className={cn("size-2 shrink-0 rounded-full", STATUS_STYLE[e.status].active)}
                    title={STATUS_LABEL[e.status]}
                    aria-label={STATUS_LABEL[e.status]}
                  />
                )}
                <p className="truncate text-[0.875rem] font-medium tracking-tight text-ink">{e.book.title}</p>
              </div>
              <div className="mt-1 flex h-4 items-center gap-1.5">
                {e.rating ? <Stars value={e.rating} size={12} /> : <span className="truncate text-xs text-ink-3">{e.book.author}</span>}
                {e.liked && <Heart className="size-3 shrink-0 fill-ameixa text-ameixa" aria-label="Curtiu" />}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-12 text-center text-ink-3">Nenhum livro aqui ainda.</p>
      )}
    </>
  );
}

/** Onde a estante está guardada, e o convite para entrar quando está só no navegador. */
function StorageNote({ synced, handle }: { synced: boolean; handle?: string }) {
  if (synced) {
    return (
      <p className="flex items-center gap-2 text-[0.8125rem] text-ink-3">
        <Cloud className="size-4 text-musgo" aria-hidden />
        Sincronizada com sua conta
        {handle && (
          <>
            <span aria-hidden>·</span>
            <Link href={`/u/${handle}`} className="font-medium text-anil">
              Ver perfil público
            </Link>
          </>
        )}
      </p>
    );
  }
  return (
    <div className="flex max-w-sm items-start gap-3 rounded-2xl bg-sunken p-3.5 text-[0.8125rem] text-ink-2">
      <MonitorSmartphone className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
      <p>
        Salva só neste navegador.
        {isSupabaseConfigured && (
          <>
            {" "}
            <Link href="/entrar?next=/estante" className="font-medium text-anil">
              Entre
            </Link>{" "}
            para guardar na sua conta e ter um perfil público.
          </>
        )}
      </p>
    </div>
  );
}

function match(e: Entry, f: Filter) {
  if (f === "todos") return true;
  if (f === "curtidos") return e.liked;
  return e.status === f;
}

function ShelfSkeleton() {
  return (
    <div aria-busy aria-label="Carregando sua estante">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="mt-3 h-5 w-40" />
      <div className="mt-8 flex gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-8 grid grid-cols-3 gap-x-4 gap-y-8 sm:grid-cols-4 lg:grid-cols-6 lg:gap-x-5">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="aspect-[2/3] w-full" />
        ))}
      </div>
    </div>
  );
}
