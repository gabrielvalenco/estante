"use client";

import { Library, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AccountMenu } from "@/components/account-menu";
import { NotificationsBell } from "@/components/notifications";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/brand";
import { SearchCombobox } from "@/components/search-combobox";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
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
  const auth = useAuth();
  const nav = auth.status === "user" ? [...NAV, { href: "/seguindo", label: "Seguindo" }] : NAV;
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
          {nav.map((item) => {
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

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
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
              pathname === "/estante" ? "bg-ink text-on-ink" : "bg-sunken text-ink hover:bg-line",
            )}
          >
            <Library className="size-[18px]" />
            <span className="hidden sm:inline">Minha estante</span>
            {count > 0 && (
              <span
                className={cn(
                  "tnum -mr-1 min-w-5 rounded-full px-1.5 text-center text-xs leading-5",
                  pathname === "/estante" ? "bg-on-ink/20" : "bg-anil text-on-brand",
                )}
              >
                {count}
              </span>
            )}
          </Link>
          <ThemeToggle />
          <NotificationsBell />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}

function HeaderSearch() {
  const params = useSearchParams();
  const pathname = usePathname();
  // Na página de busca, o campo do header começa com o termo pesquisado.
  return <SearchCombobox variant="header" defaultValue={pathname === "/busca" ? (params.get("q") ?? "") : ""} />;
}
