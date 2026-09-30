"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

type Datum = { label: string; fullLabel: string; value: number };

/**
 * Barras de uma série só (sem legenda: o título nomeia a série). Pontas de 4px arredondadas
 * saindo da linha de base, 2px de respiro entre barras, rótulo só na maior, tooltip em cada
 * barra (mouse e teclado) e a opção de ver como tabela. Cores validadas nos dois temas.
 */
export function BarChart({
  data,
  title,
  category,
  unit,
  tone = "anil",
  height = 140,
}: {
  data: Datum[];
  title: string;
  /** Nome da coluna de rótulos na tabela (ex.: "Mês"). */
  category: string;
  unit: [singular: string, plural: string];
  tone?: "anil" | "ambar";
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.findIndex((d) => d.value === max && d.value > 0);
  const fill = tone === "anil" ? "bg-[#3a2fd6] dark:bg-[#766ef0]" : "bg-[#9a5b00] dark:bg-[#c98418]";
  const describe = (d: Datum) => `${d.fullLabel}: ${d.value} ${d.value === 1 ? unit[0] : unit[1]}`;

  return (
    <figure className="grid gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <figcaption className="text-sm font-semibold text-ink">{title}</figcaption>
        <button type="button" onClick={() => setTable((t) => !t)} className="text-xs font-medium text-ink-3 hover:text-ink hover:underline">
          {table ? "Ver como gráfico" : "Ver como tabela"}
        </button>
      </div>

      {table ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-3">
              <th className="py-1 font-medium">{category}</th>
              <th className="py-1 text-right font-medium">{unit[1][0].toUpperCase() + unit[1].slice(1)}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.map((d) => (
              <tr key={d.fullLabel}>
                <td className="py-1.5 text-ink-2">{d.fullLabel}</td>
                <td className="tnum py-1.5 text-right text-ink">{d.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative" onMouseLeave={() => setActive(null)}>
          {/* pt-5: espaço para o rótulo da maior barra não encostar no título */}
          <div className="flex items-end gap-[2px] border-b border-line pt-5" style={{ height }} role="list" aria-label={title}>
            {data.map((d, i) => (
              <div
                key={d.fullLabel}
                role="listitem"
                tabIndex={0}
                aria-label={describe(d)}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                // Área de toque do tamanho da coluna inteira, maior que a barra.
                className="group relative flex h-full flex-1 cursor-default items-end justify-center outline-none"
              >
                {i === peak && active === null && (
                  <span className="tnum absolute text-xs font-medium text-ink-2" style={{ bottom: `calc(${(d.value / max) * 100}% + 4px)` }}>
                    {d.value}
                  </span>
                )}
                <span
                  className={cn(
                    "w-full max-w-9 rounded-t-[4px] transition-opacity",
                    d.value ? fill : "bg-transparent",
                    active !== null && active !== i ? "opacity-40" : "opacity-100",
                    "group-focus-visible:ring-2 group-focus-visible:ring-anil group-focus-visible:ring-offset-2",
                  )}
                  style={{ height: d.value ? `${Math.max(4, (d.value / max) * 100)}%` : 0 }}
                />
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-[2px]" aria-hidden>
            {data.map((d) => (
              <span key={d.fullLabel} className="flex-1 text-center text-[0.6875rem] text-ink-4">
                {d.label}
              </span>
            ))}
          </div>
          {active !== null && (
            <div
              role="tooltip"
              className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs whitespace-nowrap shadow-card"
              style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
            >
              <span className="font-medium text-ink">{data[active].fullLabel}</span>
              <span className="tnum text-ink-3">
                {" "}
                · {data[active].value} {data[active].value === 1 ? unit[0] : unit[1]}
              </span>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
