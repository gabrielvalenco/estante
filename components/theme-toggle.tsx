"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const noop = () => () => {};

/**
 * Um botão só: alterna entre claro e escuro. Até o primeiro clique o site segue o sistema;
 * o ícone mostra para onde o clique leva (lua no claro, sol no escuro).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // O tema real só existe no navegador; antes de hidratar, o botão fica neutro.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  const label = dark ? "Usar tema claro" : "Usar tema escuro";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-10 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors outline-none hover:bg-sunken focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      {mounted && (dark ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />)}
    </button>
  );
}
