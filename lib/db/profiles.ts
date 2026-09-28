import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { profiles, RESERVED_HANDLES, type ProfileRow } from "@/lib/db/schema";

const TONES = ["anil", "ameixa", "musgo", "ambar"] as const;

function baseHandle(login: string | undefined) {
  const base = (login ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 14);
  return base.length >= 3 ? base : "leitor";
}

/**
 * Perfil de quem acabou de entrar: devolve o existente ou cria um novo,
 * com o @ derivado do login do provedor e um número no fim se já estiver em uso.
 */
export async function ensureProfile({
  providerId,
  name,
  login,
}: {
  providerId: string;
  name: string;
  login?: string;
}): Promise<ProfileRow> {
  if (!db) throw new Error("Banco não configurado");

  const existing = await db.query.profiles.findFirst({ where: eq(profiles.providerId, providerId) });
  if (existing) return existing;

  const base = baseHandle(login);
  const reserved = new Set<string>(RESERVED_HANDLES);

  for (let attempt = 0; attempt < 8; attempt++) {
    const handle = attempt === 0 && !reserved.has(base) ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    const [created] = await db
      .insert(profiles)
      .values({
        providerId,
        handle,
        name: name.trim().slice(0, 60) || "Leitor",
        tone: TONES[Math.floor(Math.random() * TONES.length)],
      })
      // Conflito de @ (ou do mesmo provedor em duas abas ao mesmo tempo): tenta de novo.
      .onConflictDoNothing()
      .returning();
    if (created) return created;

    const raced = await db.query.profiles.findFirst({ where: eq(profiles.providerId, providerId) });
    if (raced) return raced;
  }
  throw new Error("Não foi possível criar o perfil");
}
