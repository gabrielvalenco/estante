import Link from "next/link";

import { cn } from "@/lib/utils";
import { SITE } from "@/lib/site";

/**
 * Mark da Estante: três camadas que dividem o mesmo canto, uma para cada
 * estado de leitura (anil = quero ler, ameixa = lendo, musgo = lido),
 * e um marcador âmbar, a cor da avaliação.
 */
export function Mark({ className, size = 24 }: { className?: string; size?: number }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 32 32" className={cn("shrink-0", className)}>
      <rect x="3" y="2" width="26" height="28" rx="6" fill="var(--anil)" />
      <path d="M10 12a4 4 0 0 1 4-4h15v16a6 6 0 0 1-6 6H10z" fill="var(--ameixa)" />
      <path d="M17 18a4 4 0 0 1 4-4h8v10a6 6 0 0 1-6 6h-6z" fill="var(--musgo)" />
      <path d="M5.5 2h4v8.5l-2-1.6-2 1.6z" fill="var(--ambar)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${SITE.name}, página inicial`}
      className={cn("inline-flex min-h-11 items-center gap-2 rounded-md", className)}
    >
      <Mark />
      <span className="text-[1.1875rem] leading-none font-semibold tracking-[-0.035em] text-ink">{SITE.name}</span>
    </Link>
  );
}
