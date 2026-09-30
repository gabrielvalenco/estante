"use server";

import { retrospectiveOf, type Retrospective } from "@/lib/retrospective";
import { currentProfileId } from "@/lib/session";

/** Retrospectiva de quem está logado. Sem ano: o ano corrente (horário de Brasília). */
export async function getRetrospective(year?: number): Promise<Retrospective | null> {
  const me = await currentProfileId();
  if (!me) return null;
  const current = Number(new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }).slice(0, 4));
  const y = year ?? current;
  if (!Number.isInteger(y) || y < 2000 || y > current) return null;
  return retrospectiveOf(me, y);
}
