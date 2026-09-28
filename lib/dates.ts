/**
 * Datas de calendário (AAAA-MM-DD) no fuso de quem está usando.
 * Nunca use `toISOString()` para "hoje": ele está em UTC, e no Brasil (UTC-3)
 * depois das 21h já seria amanhã.
 */

const pad = (n: number) => String(n).padStart(2, "0");

export function toISODate(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO() {
  return toISODate(new Date());
}

/** "2026-09-28" -> Date ao meio-dia local (meio-dia evita pular de dia em horário de verão). */
export function fromISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(iso: string, days: number) {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Soma meses mantendo o dia quando possível (31/jan + 1 mês = 28 ou 29/fev). */
export function addMonths(iso: string, months: number) {
  const d = fromISODate(iso);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toISODate(d);
}

export function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

export function formatLongDate(iso: string) {
  return fromISODate(iso).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
}
