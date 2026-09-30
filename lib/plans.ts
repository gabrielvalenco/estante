/**
 * Planos da Estante: Brochura (grátis), Capa Dura (assinatura) e Ex Libris (em breve).
 * Os limites e os recursos de cada plano ficam só aqui, e quem os aplica é o servidor, nunca a tela.
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
  /** Citações lidas de foto da página, por mês (usa IA: tem custo). */
  photoQuotesPerMonth: number;
};

/** Recursos que dependem do plano. */
export type Feature = "goodreadsImport" | "kindleImport" | "exportNotes" | "fullRetrospective";

type Plan = { name: string; limits: Limits; features: Record<Feature, boolean> };

export const PLANS: Record<PlanId, Plan> = {
  brochura: {
    name: "Brochura",
    limits: { quotes: 20, notesPerBook: 3, threadsPerMonth: 3, photoQuotesPerMonth: 0 },
    // Importar a estante do Goodreads é a porta de entrada: grátis para todo mundo.
    features: { goodreadsImport: true, kindleImport: false, exportNotes: false, fullRetrospective: false },
  },
  "capa-dura": {
    name: "Capa Dura",
    limits: { quotes: Infinity, notesPerBook: Infinity, threadsPerMonth: Infinity, photoQuotesPerMonth: 10 },
    features: { goodreadsImport: true, kindleImport: true, exportNotes: true, fullRetrospective: true },
  },
  "ex-libris": {
    name: "Ex Libris",
    limits: { quotes: Infinity, notesPerBook: Infinity, threadsPerMonth: Infinity, photoQuotesPerMonth: Infinity },
    features: { goodreadsImport: true, kindleImport: true, exportNotes: true, fullRetrospective: true },
  },
};

/** Limite para o JSON (Infinity vira null: "sem limite"). */
export const limitValue = (n: number) => (Number.isFinite(n) ? n : null);
