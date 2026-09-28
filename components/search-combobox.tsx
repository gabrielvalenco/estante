"use client";

import { ArrowRight, Loader2, Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/books";
import { highlight, matchesPrefix, searchSeed } from "@/lib/search";
import { cn } from "@/lib/utils";

type Suggestion = Pick<Book, "id" | "title" | "author" | "year" | "coverId" | "color">;

const MAX = 7;
const DEBOUNCE = 250;

/**
 * Busca com prévia enquanto digita (padrão combobox da WAI-ARIA).
 * Duas camadas: os livros da base de exemplo aparecem na hora, sem rede;
 * depois de uma pausa na digitação, chegam os da Open Library.
 * Setas navegam, Enter abre, Esc fecha. O último item leva à busca completa.
 */
export function SearchCombobox({
  variant,
  defaultValue = "",
  autoFocus,
}: {
  variant: "header" | "page";
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const id = useId();
  const listId = `${id}-lista`;
  const rootRef = useRef<HTMLFormElement>(null);

  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [remote, setRemote] = useState<{ q: string; books: Suggestion[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const query = q.trim();
  const local = searchSeed(query, 5);
  // Enquanto a resposta nova não chega, mantém da anterior o que ainda bate com o texto (sem piscar a lista).
  const remoteBooks = (remote?.books ?? []).filter((b) => matchesPrefix(query, `${b.title} ${b.author}`));
  const seen = new Set(local.map((b) => b.id));
  const suggestions: Suggestion[] = [...local, ...remoteBooks.filter((b) => !seen.has(b.id))].slice(0, MAX);
  const showList = open && query.length >= 2;
  // Índice extra no fim: "Ver todos os resultados".
  const total = suggestions.length + 1;

  // Busca na Open Library depois de uma pausa na digitação. Cancela a anterior se a pessoa continuar digitando.
  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = (await res.json()) as { books: Suggestion[] };
        setRemote({ q: query, books: data.books });
      } catch {
        // Abortada ou sem rede: fica só com os resultados locais.
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Fecha ao clicar fora.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Mudou de página: fecha e, no header, limpa o campo (a página de busca tem o próprio).
  useEffect(() => {
    setOpen(false);
    setActiveIndex(-1);
    if (variant === "header" && pathname !== "/busca") setQ("");
  }, [pathname, variant]);

  function go(href: string) {
    setOpen(false);
    setActiveIndex(-1);
    (document.activeElement as HTMLElement | null)?.blur();
    router.push(href);
  }

  const searchAll = () => go(query ? `/busca?q=${encodeURIComponent(query)}` : "/busca");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (showList && activeIndex >= 0 && activeIndex < suggestions.length) go(`/livro/${suggestions[activeIndex].id}`);
    else searchAll();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => (i <= 0 ? total - 1 : i - 1));
    } else if (e.key === "Escape") {
      if (showList) {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  const optionId = (i: number) => `${id}-opcao-${i}`;
  const isHeader = variant === "header";

  return (
    <form
      ref={rootRef}
      role="search"
      onSubmit={submit}
      className={cn("relative", isHeader ? "hidden sm:block" : "mx-auto max-w-2xl")}
    >
      <Search
        className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-4", isHeader ? "left-3 size-4" : "left-5 size-5")}
        aria-hidden
      />
      <input
        type="search"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        aria-label="Buscar livro ou autor"
        value={q}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        placeholder={isHeader ? "Buscar livro ou autor" : "Título, autor ou ISBN"}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className={cn(
          "w-full text-ink outline-none placeholder:text-ink-4 [&::-webkit-search-cancel-button]:hidden",
          isHeader
            ? "h-9 w-48 rounded-full bg-sunken pr-3 pl-9 text-sm transition-[width,background-color,box-shadow] duration-300 ease-out focus:w-72 focus:bg-surface focus:shadow-[0_0_0_1px_var(--line-strong),0_0_0_4px_var(--anil-soft)] lg:w-56 lg:focus:w-80"
            : "h-14 rounded-full border border-line bg-surface pr-5 pl-13 text-base shadow-card focus:border-line-strong focus:shadow-[0_0_0_4px_var(--anil-soft)]",
        )}
      />

      {showList && (
        <div
          className={cn(
            "absolute top-full z-50 mt-2 overflow-hidden rounded-2xl border border-line bg-popover shadow-[0_18px_48px_-12px_rgb(0_0_0/0.25)] animate-in fade-in-0 zoom-in-95 duration-150",
            isHeader ? "right-0 w-[min(26rem,calc(100vw-2rem))]" : "inset-x-0",
          )}
        >
          <ul id={listId} role="listbox" aria-label="Sugestões" className="max-h-[min(70vh,32rem)] overflow-y-auto p-1.5">
            {suggestions.map((book, i) => (
              <li
                key={book.id}
                id={optionId(i)}
                role="option"
                aria-selected={activeIndex === i}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => go(`/livro/${book.id}`)}
                onPointerEnter={() => setActiveIndex(i)}
                className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2", activeIndex === i && "bg-sunken")}
              >
                <div className="w-9 shrink-0">
                  <BookCover book={book} size="S" priority />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[0.9375rem] font-medium tracking-tight text-ink">
                    <Highlighted text={book.title} query={query} />
                  </p>
                  <p className="truncate text-[0.8125rem] text-ink-3">
                    <Highlighted text={book.author} query={query} />
                    {book.year && ` · ${book.year}`}
                  </p>
                </div>
              </li>
            ))}

            {loading && (
              <li role="presentation" className="flex items-center gap-2 px-3 py-2.5 text-[0.8125rem] text-ink-3" aria-live="polite">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Buscando mais na Open Library...
              </li>
            )}
            {!loading && suggestions.length === 0 && (
              <li role="presentation" className="px-3 py-2.5 text-[0.8125rem] text-ink-3" aria-live="polite">
                Nenhuma sugestão para &ldquo;{query}&rdquo;
              </li>
            )}

            <li
              id={optionId(suggestions.length)}
              role="option"
              aria-selected={activeIndex === suggestions.length}
              onPointerDown={(e) => e.preventDefault()}
              onClick={searchAll}
              onPointerEnter={() => setActiveIndex(suggestions.length)}
              className={cn(
                "mt-1 flex cursor-pointer items-center justify-between gap-3 rounded-xl border-t border-line px-3 py-2.5 text-sm text-anil",
                activeIndex === suggestions.length && "bg-sunken",
              )}
            >
              <span className="truncate">
                Ver todos os resultados para <span className="font-semibold">&ldquo;{query}&rdquo;</span>
              </span>
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </li>
          </ul>
        </div>
      )}
    </form>
  );
}

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlight(text, query).map((part, i) =>
        part.match ? (
          <mark key={i} className="bg-transparent font-semibold text-anil">
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  );
}
