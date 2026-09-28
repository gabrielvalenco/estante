"use client";

import { Library, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";

import { AccountMenu } from "@/components/account-menu";
import { Wordmark } from "@/components/brand";
import { cn } from "@/lib/utils";
import { useLibrary } from "@/lib/library";

const NAV = [
  { href: "/livros", label: "Livros" },
  { href: "/listas", label: "Listas" },
  { href: "/leitores", label: "Leitores" },
];

/**
 * Header de 56px, fixo, com vidro fosco. A borda inferior só aparece depois
 * que a página rola, como na Apple: parado, o header se funde com o conteúdo.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const library = useLibrary();
  const count = Object.values(library).filter((e) => e.status).length;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-14 border-b bg-canvas/80 backdrop-blur-xl backdrop-saturate-150 transition-colors duration-200",
        scrolled ? "border-line" : "border-transparent",
      )}
    >
      <div className="container-page flex h-full items-center gap-6">
        <Wordmark />

        <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm transition-colors",
                  active ? "bg-sunken font-medium text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={<div className="hidden h-9 w-64 sm:block" />}>
            <HeaderSearch />
          </Suspense>
          <Link
            href="/busca"
            aria-label="Buscar livros"
            className="inline-flex size-10 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sunken sm:hidden"
          >
            <Search className="size-[18px]" />
          </Link>
          <Link
            href="/estante"
            aria-current={pathname === "/estante" ? "page" : undefined}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-full pr-3.5 pl-3 text-sm font-medium transition-colors",
              pathname === "/estante" ? "bg-ink text-white" : "bg-sunken text-ink hover:bg-line",
            )}
          >
            <Library className="size-[18px]" />
            <span className="hidden sm:inline">Minha estante</span>
            {count > 0 && (
              <span
                className={cn(
                  "tnum -mr-1 min-w-5 rounded-full px-1.5 text-center text-xs leading-5",
                  pathname === "/estante" ? "bg-white/20" : "bg-anil text-white",
                )}
              >
                {count}
              </span>
            )}
          </Link>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

function HeaderSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();
  const [q, setQ] = useState(pathname === "/busca" ? (params.get("q") ?? "") : "");

  useEffect(() => {
    if (pathname !== "/busca") setQ("");
  }, [pathname]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const value = q.trim();
    router.push(value ? `/busca?q=${encodeURIComponent(value)}` : "/busca");
  }

  return (
    <form role="search" onSubmit={submit} className="relative hidden sm:block">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-4" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar livro ou autor"
        aria-label="Buscar livro ou autor"
        className="h-9 w-48 rounded-full bg-sunken pr-3 pl-9 text-sm text-ink transition-[width,background-color,box-shadow] duration-300 ease-out outline-none placeholder:text-ink-4 focus:w-64 focus:bg-surface focus:shadow-[0_0_0_1px_var(--line-strong),0_0_0_4px_var(--anil-soft)] lg:w-56 lg:focus:w-72"
      />
    </form>
  );
}
