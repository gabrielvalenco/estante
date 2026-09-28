"use client";

import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  addDays,
  addMonths,
  daysInMonth,
  formatLongDate,
  fromISODate,
  todayISO,
  toISODate,
} from "@/lib/dates";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Livro terminado num dia: vira um pontinho na cor da capa. */
export type DayMark = { title: string; color: string };

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_NAMES = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/**
 * Seletor de data da Estante, no lugar do calendário nativo do navegador.
 * - Dias em círculo, hoje com anel anil, o escolhido preenchido.
 * - Pontinhos nos dias em que a pessoa terminou outros livros (na cor da capa):
 *   o calendário vira um pequeno diário de leitura.
 * - Visão de meses para registrar leituras antigas sem clicar mês a mês.
 * - Teclado: setas, PageUp/PageDown (mês), Home/End (semana), Enter, Esc. Datas futuras bloqueadas.
 */
export function DatePicker({
  value,
  onChange,
  max = todayISO(),
  marks,
  label = "Data",
}: {
  value: string;
  onChange: (iso: string) => void;
  max?: string;
  marks?: Map<string, DayMark[]>;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={`${label}: ${formatLongDate(value)}. Alterar`}
        className={cn(
          "flex h-11 w-full items-center gap-3 rounded-xl border border-line bg-surface px-3 text-left text-[0.9375rem] text-ink outline-none transition-[border-color,box-shadow]",
          "hover:border-line-strong focus-visible:border-line-strong focus-visible:shadow-[0_0_0_4px_var(--anil-soft)]",
          open && "border-line-strong shadow-[0_0_0_4px_var(--anil-soft)]",
        )}
      >
        <CalendarDays className="size-[18px] shrink-0 text-anil" aria-hidden />
        <span className="flex-1 truncate">{formatLongDate(value)}</span>
        <span className="shrink-0 rounded-full bg-sunken px-2 py-0.5 text-xs font-medium text-ink-3">{formatRelative(value)}</span>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={8} className="w-[20rem] rounded-2xl p-0">
        <Calendar
          value={value}
          max={max}
          marks={marks}
          onSelect={(iso) => {
            onChange(iso);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function Calendar({
  value,
  max,
  marks,
  onSelect,
}: {
  value: string;
  max: string;
  marks?: Map<string, DayMark[]>;
  onSelect: (iso: string) => void;
}) {
  const today = todayISO();
  const [focused, setFocused] = useState(value);
  const [view, setView] = useState<"days" | "months">("days");
  const [direction, setDirection] = useState<1 | -1>(1);
  const [yearCursor, setYearCursor] = useState(() => fromISODate(value).getFullYear());
  const grid = useRef<HTMLDivElement>(null);
  const moved = useRef(false);

  const f = fromISODate(focused);
  const year = f.getFullYear();
  const month = f.getMonth();
  const maxDate = fromISODate(max);
  const atMaxMonth = year > maxDate.getFullYear() || (year === maxDate.getFullYear() && month >= maxDate.getMonth());

  // Leva o foco do teclado ao dia focado (só depois de navegar, não ao abrir com o mouse).
  useEffect(() => {
    if (!moved.current) return;
    grid.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused, view]);

  function move(to: string) {
    const clamped = to > max ? max : to;
    const from = fromISODate(focused);
    const next = fromISODate(clamped);
    if (next.getFullYear() !== from.getFullYear() || next.getMonth() !== from.getMonth()) {
      setDirection(clamped > focused ? 1 : -1);
    }
    moved.current = true;
    setFocused(clamped);
  }

  function onGridKey(e: KeyboardEvent) {
    const weekday = f.getDay();
    const keys: Record<string, () => string> = {
      ArrowLeft: () => addDays(focused, -1),
      ArrowRight: () => addDays(focused, 1),
      ArrowUp: () => addDays(focused, -7),
      ArrowDown: () => addDays(focused, 7),
      PageUp: () => addMonths(focused, e.shiftKey ? -12 : -1),
      PageDown: () => addMonths(focused, e.shiftKey ? 12 : 1),
      Home: () => addDays(focused, -weekday),
      End: () => addDays(focused, 6 - weekday),
    };
    if (keys[e.key]) {
      e.preventDefault();
      move(keys[e.key]());
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (focused <= max) onSelect(focused);
    }
  }

  // "Setembro de 2026": só a primeira letra maiúscula (o capitalize do CSS faria "Setembro De 2026").
  const monthLabel = f.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const firstWeekday = new Date(year, month, 1).getDay();
  const total = daysInMonth(year, month);
  const cells: (string | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: total }, (_, i) => toISODate(new Date(year, month, i + 1, 12))),
  ];
  const weeks = Array.from({ length: Math.ceil(cells.length / 7) }, (_, w) => cells.slice(w * 7, w * 7 + 7));

  return (
    <div className="select-none">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <button
          type="button"
          onClick={() => {
            setYearCursor(year);
            setView(view === "days" ? "months" : "days");
          }}
          aria-expanded={view === "months"}
          className="inline-flex h-9 items-center gap-1 rounded-full px-3 text-[0.9375rem] font-semibold tracking-tight text-ink transition-colors hover:bg-sunken"
        >
          {view === "days" ? monthTitle : yearCursor}
          <ChevronDown className={cn("size-4 text-ink-3 transition-transform duration-200", view === "months" && "rotate-180")} aria-hidden />
        </button>
        <div className="flex gap-1">
          <NavButton
            label={view === "days" ? "Mês anterior" : "Ano anterior"}
            onClick={() => (view === "days" ? move(addMonths(focused, -1)) : setYearCursor((y) => y - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </NavButton>
          <NavButton
            label={view === "days" ? "Próximo mês" : "Próximo ano"}
            disabled={view === "days" ? atMaxMonth : yearCursor >= maxDate.getFullYear()}
            onClick={() => (view === "days" ? move(addMonths(focused, 1)) : setYearCursor((y) => y + 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
          </NavButton>
        </div>
      </div>

      {view === "months" ? (
        <div className="grid grid-cols-3 gap-1.5 p-3 pt-2 animate-in fade-in-0 zoom-in-95 duration-200" ref={grid}>
          {MONTHS.map((m, i) => {
            const future = yearCursor > maxDate.getFullYear() || (yearCursor === maxDate.getFullYear() && i > maxDate.getMonth());
            const current = yearCursor === year && i === month;
            return (
              <button
                key={m}
                type="button"
                disabled={future}
                onClick={() => {
                  const day = Math.min(f.getDate(), daysInMonth(yearCursor, i));
                  moved.current = true;
                  setFocused(toISODate(new Date(yearCursor, i, day, 12)) > max ? max : toISODate(new Date(yearCursor, i, day, 12)));
                  setView("days");
                }}
                className={cn(
                  "h-11 rounded-xl text-sm font-medium capitalize transition-colors",
                  current ? "bg-anil text-on-brand" : "text-ink-2 hover:bg-sunken",
                  future && "pointer-events-none opacity-30",
                )}
              >
                {m}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-3 pb-2">
          <div className="grid grid-cols-7" aria-hidden>
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="flex h-8 items-center justify-center text-[0.6875rem] font-semibold tracking-wide text-ink-4">
                {d}
              </span>
            ))}
          </div>
          <div
            ref={grid}
            role="grid"
            aria-label={monthTitle}
            onKeyDown={onGridKey}
            key={`${year}-${month}`}
            className={cn("animate-in fade-in-0 duration-200", direction > 0 ? "slide-in-from-right-3" : "slide-in-from-left-3")}
          >
            {weeks.map((week, w) => (
              <div role="row" key={w} className="grid grid-cols-7">
                {week.map((iso, d) => {
                  if (!iso) return <span role="gridcell" key={d} />;
                  const selected = iso === value;
                  const isToday = iso === today;
                  const disabled = iso > max;
                  const dayMarks = marks?.get(iso) ?? [];
                  const date = fromISODate(iso);
                  return (
                    <div role="gridcell" key={d} aria-selected={selected} className="flex justify-center py-0.5">
                      <button
                        type="button"
                        data-date={iso}
                        tabIndex={iso === focused ? 0 : -1}
                        aria-disabled={disabled || undefined}
                        aria-current={isToday ? "date" : undefined}
                        aria-label={`${date.getDate()} de ${date.toLocaleDateString("pt-BR", { month: "long" })}, ${WEEKDAY_NAMES[date.getDay()]}${
                          dayMarks.length ? `, terminou ${dayMarks.map((m) => m.title).join(", ")}` : ""
                        }`}
                        title={dayMarks.length ? dayMarks.map((m) => m.title).join(" · ") : undefined}
                        onClick={() => !disabled && onSelect(iso)}
                        onFocus={() => setFocused(iso)}
                        className={cn(
                          "relative flex size-10 flex-col items-center justify-center rounded-full text-sm tabular-nums transition-[background-color,color,transform] duration-150 outline-none",
                          "focus-visible:ring-3 focus-visible:ring-anil/40",
                          selected
                            ? "bg-anil font-semibold text-on-brand shadow-[0_4px_12px_-4px_var(--anil)]"
                            : isToday
                              ? "font-semibold text-anil ring-1 ring-anil/60 ring-inset hover:bg-anil-soft"
                              : "text-ink hover:bg-sunken active:scale-95",
                          disabled && "cursor-not-allowed text-ink-4 opacity-40 hover:bg-transparent",
                        )}
                      >
                        <span className={dayMarks.length ? "-mt-1" : undefined}>{date.getDate()}</span>
                        {dayMarks.length > 0 && (
                          <span className="absolute bottom-1.5 flex gap-0.5" aria-hidden>
                            {dayMarks.slice(0, 3).map((m, i) => (
                              <span
                                key={i}
                                className="size-1 rounded-full"
                                style={{ backgroundColor: selected ? "var(--on-brand)" : m.color }}
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atalhos */}
      <div className="flex items-center gap-2 border-t border-line px-3 py-2.5">
        <QuickChip onClick={() => onSelect(today)} active={value === today}>
          Hoje
        </QuickChip>
        <QuickChip onClick={() => onSelect(addDays(today, -1))} active={value === addDays(today, -1)}>
          Ontem
        </QuickChip>
        {marks && marks.size > 0 && (
          <span className="ml-auto flex items-center gap-1.5 text-[0.6875rem] text-ink-4">
            <span className="size-1.5 rounded-full bg-musgo" aria-hidden />
            outras leituras
          </span>
        )}
      </div>
    </div>
  );
}

function NavButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-9 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-sunken disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

function QuickChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full px-3 text-[0.8125rem] font-medium transition-colors",
        active ? "bg-anil-soft text-anil" : "bg-sunken text-ink-2 hover:bg-line",
      )}
    >
      {children}
    </button>
  );
}
