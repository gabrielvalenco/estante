/**
 * Planos da Estante. Por enquanto todo mundo está no Brochura (grátis); Capa Dura e Ex Libris
 * entram quando houver cobrança. Os limites ficam só aqui, e quem os aplica é o servidor
 * (app/reading-actions.ts), nunca a tela.
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

/** Plano de um perfil. Sem assinaturas ainda: sempre Brochura. */
export async function planOf(profileId: string): Promise<PlanId> {
  void profileId; // vai consultar a tabela de assinaturas
  return "brochura";
}

/** Limite para o JSON (Infinity vira null: "sem limite"). */
export const limitValue = (n: number) => (Number.isFinite(n) ? n : null);
