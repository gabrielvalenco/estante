/** Formatação em português do Brasil. */

export function formatRating(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: v % 1 ? 1 : 0, maximumFractionDigits: 1 });
}

/** Média sempre com uma casa: "4,0", nunca "4". */
export function formatAverage(v: number) {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function formatCount(n: number) {
  if (n >= 1000) {
    return `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: n >= 10000 ? 0 : 1 })} mil`;
  }
  return n.toLocaleString("pt-BR");
}

const TODAY = "2026-09-28";

/** "hoje", "ontem", "há 3 dias", "12 de set." */
export function formatRelative(iso: string, today = TODAY) {
  const days = Math.round((Date.parse(today) - Date.parse(iso)) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  return formatDay(iso);
}

export function formatDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

/** "Setembro de 2026" */
export function formatMonth(iso: string) {
  const s = new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;
}
