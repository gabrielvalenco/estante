/**
 * Planos da Estante: Brochura (grátis), Capa Dura (assinatura) e Ex Libris (em breve).
 * Os limites ficam só aqui, e quem os aplica é o servidor, nunca a tela.
 * O plano de cada pessoa vem de lib/billing.ts (planOf).
 */

export type PlanId = "brochura" | "capa-dura" | "ex-libris";

type Limits = {
  /** Citações no total, somando todos os livros. */
  quotes: number;
  /** Notas por livro. */
  notesPerBook: number;
  /** Discussões novas por mês (responder é sempre livre). */
  threadsPerMonth: number;
};

export const PLANS: Record<PlanId, { name: string; limits: Limits }> = {
  brochura: { name: "Brochura", limits: { quotes: 20, notesPerBook: 3, threadsPerMonth: 3 } },
  "capa-dura": { name: "Capa Dura", limits: { quotes: Infinity, notesPerBook: Infinity, threadsPerMonth: Infinity } },
  "ex-libris": { name: "Ex Libris", limits: { quotes: Infinity, notesPerBook: Infinity, threadsPerMonth: Infinity } },
};


/** Limite para o JSON (Infinity vira null: "sem limite"). */
export const limitValue = (n: number) => (Number.isFinite(n) ? n : null);
