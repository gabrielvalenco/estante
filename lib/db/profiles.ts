import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import { deleteAvatar, importProviderAvatar } from "@/lib/avatars";
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
  const baseName = name.trim().slice(0, 55) || "Leitor";

  for (let attempt = 0; attempt < 12; attempt++) {
    const handle = attempt === 0 && !reserved.has(base) ? base : `${base}${Math.floor(1000 + Math.random() * 9000)}`;
    // Nome também é único: se já existe, "Ana Souza" vira "Ana Souza 2", "Ana Souza 3"... (dá para trocar depois).
    const suffix = await nameSuffix(baseName);
    const [created] = await db
      .insert(profiles)
      .values({
        providerId,
        handle,
        name: suffix ? `${baseName} ${suffix}` : baseName,
        tone: TONES[Math.floor(Math.random() * TONES.length)],
      })
      // Conflito de @, de nome (duas contas criadas juntas) ou do mesmo provedor em duas abas: tenta de novo.
      .onConflictDoNothing()
      .returning();
    if (created) return created;

    const raced = await db.query.profiles.findFirst({ where: eq(profiles.providerId, providerId) });
    if (raced) return raced;
  }
  throw new Error("Não foi possível criar o perfil");
}

/** Menor número que deixa o nome livre (0 = o nome já está livre). Compara sem maiúsculas, como o índice. */
async function nameSuffix(name: string) {
  const taken = await db!
    .select({ name: profiles.name })
    .from(profiles)
    .where(sql`lower(${profiles.name}) = lower(${name}) or lower(${profiles.name}) like lower(${name}) || ' %'`);
  const used = new Set(taken.map((t) => t.name.toLowerCase()));
  if (!used.has(name.toLowerCase())) return 0;
  for (let n = 2; ; n++) if (!used.has(`${name} ${n}`.toLowerCase())) return n;
}

/**
 * Foto do Google/GitHub como foto inicial. Só quando a pessoa ainda não tem foto e nunca removeu
 * uma (avatar_opt_out): assim, quem tirou a foto não a vê voltar no próximo login.
 */
export async function adoptProviderAvatar(profileId: string, image: string | null | undefined) {
  if (!db || !image) return;
  const current = await db.query.profiles.findFirst({
    where: eq(profiles.id, profileId),
    columns: { avatarUrl: true, avatarOptOut: true },
  });
  if (!current || current.avatarUrl || current.avatarOptOut) return;

  const url = await importProviderAvatar(profileId, image);
  if (!url) return;
  // Só grava se continuar sem foto (a pessoa pode ter enviado uma nesse meio tempo).
  const [saved] = await db
    .update(profiles)
    .set({ avatarUrl: url })
    .where(and(eq(profiles.id, profileId), isNull(profiles.avatarUrl), eq(profiles.avatarOptOut, false)))
    .returning({ handle: profiles.handle });
  if (!saved) await deleteAvatar(url);
}
