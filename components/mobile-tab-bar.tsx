"use client";

import { BookOpen, House, Library, Search, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { cn } from "@/lib/utils";

/**
 * Barra de abas do celular (padrão de app: Letterboxd, Instagram). Tira a navegação do topo,
 * que fica só com logo, sino e avatar. Só aparece abaixo de 768px; no desktop, a navegação
 * continua no header. Respeita a área segura do iPhone (a barrinha de gestos).
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const auth = useAuth();
  const library = useLibrary();
  const count = Object.values(library).filter((e) => e.status).length;
  const loggedIn = auth.status === "user";

  const tabs = [
    { href: "/", label: "Início", icon: House, match: (p: string) => p === "/" },
    { href: "/livros", label: "Livros", icon: BookOpen, match: (p: string) => p.startsWith("/livro") || p.startsWith("/listas") },
    { href: "/busca", label: "Buscar", icon: Search, match: (p: string) => p.startsWith("/busca") },
    { href: "/estante", label: "Estante", icon: Library, match: (p: string) => p === "/estante", badge: count },
    loggedIn
      ? { href: "/seguindo", label: "Seguindo", icon: Users, match: (p: string) => p.startsWith("/seguindo") }
      : { href: "/leitores", label: "Leitores", icon: Users, match: (p: string) => p.startsWith("/leitores") },
  ];

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {tabs.map(({ href, label, icon: Icon, match, badge }) => {
          const active = match(pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors active:scale-95",
                  active ? "text-anil" : "text-ink-3 hover:text-ink",
                )}
              >
                <span className="relative">
                  <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  {badge ? (
                    <span className="tnum absolute -top-1.5 -right-3 min-w-4 rounded-full bg-anil px-1 text-center text-[0.625rem] leading-4 font-semibold text-on-brand ring-2 ring-canvas">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
