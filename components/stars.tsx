"use client";

import { useState } from "react";

import { formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";

const STAR_PATH = "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z";

/** Estrelas de leitura (só exibição), com meia estrela. */
export function Stars({ value, size = 14, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-px", className)} role="img" aria-label={`${formatRating(value)} de 5 estrelas`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        if (fill <= 0) return null;
        return <StarShape key={i} fill={fill} size={size} />;
      })}
    </span>
  );
}

function StarShape({ fill, size, muted }: { fill: number; size: number; muted?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <path d={STAR_PATH} fill="var(--line-strong)" opacity={muted ? 1 : 0} />
      <path
        d={STAR_PATH}
        fill="var(--ambar)"
        style={fill < 1 ? { clipPath: `inset(0 ${(1 - fill) * 100}% 0 0)` } : undefined}
      />
    </svg>
  );
}

/**
 * Avaliação clicável de 0,5 a 5. Cada estrela tem duas metades clicáveis.
 * Clicar na nota atual limpa a avaliação. Setas do teclado ajustam de meia em meia.
 */
export function StarInput({
  value,
  onChange,
  size = 32,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  size?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value ?? 0;

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Sua nota"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={value ?? 0}
      aria-valuetext={value ? `${formatRating(value)} estrelas` : "Sem nota"}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(Math.min(5, (value ?? 0) + 0.5));
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          const next = (value ?? 0) - 0.5;
          onChange(next <= 0 ? null : next);
        }
      }}
      onMouseLeave={() => setHover(null)}
      className="inline-flex items-center gap-1 rounded-md"
    >
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, shown - i));
        return (
          <span key={i} className="relative transition-transform duration-150 hover:scale-110" style={{ width: size, height: size }}>
            <StarShape fill={fill} size={size} muted />
            {[0.5, 1].map((part) => {
              const v = i + part;
              return (
                <button
                  key={part}
                  type="button"
                  tabIndex={-1}
                  aria-hidden
                  onMouseEnter={() => setHover(v)}
                  onClick={() => onChange(value === v ? null : v)}
                  className={cn("absolute inset-y-0 w-1/2", part === 0.5 ? "left-0" : "right-0")}
                />
              );
            })}
          </span>
        );
      })}
    </div>
  );
}

