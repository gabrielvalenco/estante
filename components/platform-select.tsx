"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";

import { SocialIcon } from "@/components/social-icon";
import { PLATFORM_KEYS, PLATFORMS, type Platform } from "@/lib/socials";
import { cn } from "@/lib/utils";

/**
 * Seletor de rede social: ícone + nome, com a lista das redes e as já usadas desabilitadas
 * ("já adicionada"). Base UI Select: teclado, digitar para pular ("gi" → GitHub) e leitor de tela.
 */
export function PlatformSelect({
  value,
  onChange,
  used,
}: {
  value: Platform;
  onChange: (p: Platform) => void;
  /** Redes já escolhidas nas outras linhas. */
  used: Set<Platform>;
}) {
  return (
    <SelectPrimitive.Root<Platform>
      value={value}
      onValueChange={(v) => v && onChange(v)}
      items={PLATFORM_KEYS.map((p) => ({ value: p, label: PLATFORMS[p].label }))}
    >
      <SelectPrimitive.Trigger
        aria-label="Rede"
        className="flex h-11 w-40 shrink-0 items-center gap-2.5 rounded-xl border border-line bg-surface pr-2.5 pl-3 text-[0.9375rem] text-ink outline-none transition-[border-color,box-shadow] hover:border-line-strong focus-visible:border-line-strong focus-visible:shadow-[0_0_0_4px_var(--anil-soft)] data-popup-open:border-line-strong data-popup-open:shadow-[0_0_0_4px_var(--anil-soft)]"
      >
        <SocialIcon platform={value} className="size-[18px]" />
        <SelectPrimitive.Value className="flex-1 truncate text-left">{(v: Platform) => PLATFORMS[v].label}</SelectPrimitive.Value>
        <ChevronsUpDown className="size-4 shrink-0 text-ink-4" aria-hidden />
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Positioner sideOffset={6} align="start" alignItemWithTrigger={false} className="isolate z-50">
          <SelectPrimitive.Popup className="max-h-(--available-height) w-60 origin-(--transform-origin) overflow-y-auto rounded-2xl bg-popover p-1.5 text-popover-foreground shadow-[0_18px_48px_-12px_rgb(0_0_0/0.25)] ring-1 ring-line duration-150 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0">
            <SelectPrimitive.List>
              {PLATFORM_KEYS.map((p) => {
                const taken = p !== value && used.has(p);
                return (
                  <SelectPrimitive.Item
                    key={p}
                    value={p}
                    disabled={taken}
                    className={cn(
                      "flex cursor-default items-center gap-3 rounded-xl px-2.5 py-2 text-[0.9375rem] text-ink outline-none select-none",
                      "data-highlighted:bg-sunken data-disabled:opacity-40",
                    )}
                  >
                    <span className="flex size-8 items-center justify-center rounded-lg bg-sunken">
                      <SocialIcon platform={p} className="size-[18px]" />
                    </span>
                    <SelectPrimitive.ItemText className="flex-1">{PLATFORMS[p].label}</SelectPrimitive.ItemText>
                    {taken ? (
                      <span className="text-xs text-ink-4">já adicionada</span>
                    ) : (
                      <SelectPrimitive.ItemIndicator>
                        <Check className="size-4 text-anil" aria-hidden />
                      </SelectPrimitive.ItemIndicator>
                    )}
                  </SelectPrimitive.Item>
                );
              })}
            </SelectPrimitive.List>
          </SelectPrimitive.Popup>
        </SelectPrimitive.Positioner>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
