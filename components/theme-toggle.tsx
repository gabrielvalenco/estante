"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "system", label: "Automático", icon: Monitor },
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
] as const;

const noop = () => () => {};

/** Seletor de aparência em pílula: automático, claro ou escuro. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // O tema salvo só existe no navegador; antes de hidratar, nenhum botão aparece marcado.
  const mounted = useSyncExternalStore(noop, () => true, () => false);

  return (
    <div role="radiogroup" aria-label="Aparência" className={cn("inline-flex rounded-full bg-sunken p-1", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-full transition-colors",
              active ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
