"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { AVATAR_MAX_BYTES, deleteAvatar, optimizeAvatar, storeAvatar } from "@/lib/avatars";
import { db } from "@/lib/db";
import { entries, followRequests, follows, passwordLogins, profiles } from "@/lib/db/schema";
import { toProfile, type Profile } from "@/lib/db/types";
import { hashPassword, verifyPassword } from "@/lib/password";
import { currentProfileId } from "@/lib/session";
import { MAX_SOCIALS, parseHandle, PLATFORM_KEYS, PLATFORMS, type SocialLink } from "@/lib/socials";
import { verifySocial } from "@/lib/socials-verify";

/**
 * Ações da conta: privacidade, senha, redes sociais e exclusão (LGPD).
 * Mesmas regras de app/actions.ts: id sempre da sessão, entrada sempre validada.
 */

/** Páginas públicas onde o conteúdo da pessoa aparece: perfil, home, leitores e cada livro que ela avaliou. */
async function revalidateEverywhere(profileId: string, handle: string) {
  revalidatePath(`/u/${handle}`);
  revalidatePath("/");
  revalidatePath("/leitores");
  const books = await db!.select({ id: entries.bookId }).from(entries).where(eq(entries.userId, profileId)).limit(500);
  books.forEach((b) => {
    revalidatePath(`/livro/${b.id}`);
    // Página pública de cada avaliação (o link compartilhado nas redes).
    revalidatePath(`/u/${handle}/livro/${b.id}`);
  });
}

// ------------------------------------------------------------
// Perfil privado
// ------------------------------------------------------------

/**
 * Liga ou desliga o perfil privado. Ao abrir o perfil, os pedidos pendentes viram follows
 * (quem pediu para seguir passa a seguir). Revalida as páginas onde as reviews aparecem.
 */
export async function setPrivacyAction(isPrivate: boolean): Promise<{ ok: true; profile: Profile } | { ok: false }> {
  const me = await currentProfileId();
  if (!me || !db || typeof isPrivate !== "boolean") return { ok: false };

  const [updated] = await db.update(profiles).set({ isPrivate }).where(eq(profiles.id, me)).returning();
  if (!updated) return { ok: false };

  if (!isPrivate) {
    const pending = await db.delete(followRequests).where(eq(followRequests.targetId, me)).returning();
    if (pending.length) {
      await db
        .insert(follows)
        .values(pending.map((p) => ({ followerId: p.requesterId, followingId: me })))
        .onConflictDoNothing();
    }
  }
  await revalidateEverywhere(me, updated.handle);
  return { ok: true, profile: toProfile(updated) };
}

// ------------------------------------------------------------
// Senha
// ------------------------------------------------------------

const PasswordChange = z.object({ current: z.string().min(1).max(72), next: z.string().min(8).max(72) });

/** Troca a senha de quem entra com e-mail e senha. Exige a senha atual. */
export async function changePasswordAction(
  input: z.input<typeof PasswordChange>,
): Promise<{ ok: true } | { ok: false; error: "unauthenticated" | "no_password" | "wrong_current" | "weak" | "same" | "locked" }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const parsed = PasswordChange.safeParse(input);
  if (!parsed.success) return { ok: false, error: "weak" };
  const { current, next } = parsed.data;

  const login = await db.query.passwordLogins.findFirst({ where: eq(passwordLogins.profileId, me) });
  if (!login) return { ok: false, error: "no_password" };
  if (login.lockedUntil && login.lockedUntil > new Date()) return { ok: false, error: "locked" };

  if (!(await verifyPassword(current, login.passwordHash))) {
    // Mesmo contador do login: 5 erros seguidos bloqueiam por 15 minutos.
    const attempts = login.failedAttempts + 1;
    await db
      .update(passwordLogins)
      .set({ failedAttempts: attempts >= 5 ? 0 : attempts, lockedUntil: attempts >= 5 ? new Date(Date.now() + 15 * 60_000) : null })
      .where(eq(passwordLogins.profileId, me));
    return { ok: false, error: attempts >= 5 ? "locked" : "wrong_current" };
  }
  if (current === next) return { ok: false, error: "same" };

  await db
    .update(passwordLogins)
    .set({ passwordHash: await hashPassword(next), failedAttempts: 0, lockedUntil: null })
    .where(eq(passwordLogins.profileId, me));
  return { ok: true };
}

// ------------------------------------------------------------
// Redes sociais
// ------------------------------------------------------------

const SocialInput = z
  .array(z.object({ platform: z.enum(PLATFORM_KEYS as [string, ...string[]]), handle: z.string().max(300) }))
  .max(MAX_SOCIALS);

export type SocialError = { index: number; message: string };

/**
 * Salva até 3 redes. Cada @ é validado para a plataforma (a URL é montada pelo app).
 * GitHub e Bluesky são conferidos na API pública: perfil inexistente é recusado, e se o
 * perfil tiver o link da Estante na bio/site, ganha o selo de verificado.
 */
export async function updateSocialsAction(
  input: { platform: string; handle: string }[],
): Promise<{ ok: true; profile: Profile } | { ok: false; errors: SocialError[] }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, errors: [{ index: -1, message: "Entre de novo para salvar." }] };
  const parsed = SocialInput.safeParse(input.filter((s) => s.handle.trim()));
  if (!parsed.success) return { ok: false, errors: [{ index: -1, message: "No máximo 3 redes." }] };

  const mine = await db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { handle: true } });
  if (!mine) return { ok: false, errors: [{ index: -1, message: "Conta não encontrada." }] };

  const errors: SocialError[] = [];
  const seen = new Set<string>();
  const links: SocialLink[] = [];

  await Promise.all(
    parsed.data.map(async (s, index) => {
      const platform = s.platform as SocialLink["platform"];
      const handle = parseHandle(platform, s.handle);
      const label = PLATFORMS[platform].label;
      if (!handle) {
        errors.push({ index, message: `Isso não parece um @ válido do ${label}.` });
        return;
      }
      if (seen.has(platform)) {
        errors.push({ index, message: `Você já adicionou um ${label}.` });
        return;
      }
      seen.add(platform);
      const check = await verifySocial(platform, handle, mine.handle);
      if (check === "missing") {
        errors.push({ index, message: `Não encontramos @${handle} no ${label}.` });
        return;
      }
      links[index] = { platform, handle, verified: check === "verified" };
    }),
  );

  if (errors.length) return { ok: false, errors: errors.sort((a, b) => a.index - b.index) };

  const [updated] = await db
    .update(profiles)
    .set({ socials: links.filter(Boolean) })
    .where(eq(profiles.id, me))
    .returning();
  revalidatePath(`/u/${updated.handle}`);
  return { ok: true, profile: toProfile(updated) };
}

// ------------------------------------------------------------
// Foto de perfil
// ------------------------------------------------------------

export type AvatarResult = { ok: true; profile: Profile } | { ok: false; error: "unauthenticated" | "unavailable" | "too_big" | "invalid" };

/**
 * Troca a foto. O navegador já manda o recorte quadrado reduzido; aqui a imagem é conferida
 * pelo conteúdo e processada de novo (256px WebP, sem metadados), então nada do arquivo
 * original chega ao armazenamento. A foto anterior é apagada.
 */
export async function uploadAvatarAction(form: FormData): Promise<AvatarResult> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false, error: "unauthenticated" };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "invalid" };
  if (file.size > AVATAR_MAX_BYTES) return { ok: false, error: "too_big" };

  const webp = await optimizeAvatar(Buffer.from(await file.arrayBuffer()));
  if (!webp) return { ok: false, error: "invalid" };
  const url = await storeAvatar(me, webp);
  if (!url) return { ok: false, error: "unavailable" };

  const previous = await db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { avatarUrl: true } });
  const [updated] = await db.update(profiles).set({ avatarUrl: url, avatarOptOut: false }).where(eq(profiles.id, me)).returning();
  if (!updated) {
    await deleteAvatar(url);
    return { ok: false, error: "unauthenticated" };
  }
  await deleteAvatar(previous?.avatarUrl);
  await revalidateEverywhere(me, updated.handle);
  return { ok: true, profile: toProfile(updated) };
}

/** Tira a foto (volta para as iniciais) e marca para não importar a do Google/GitHub de novo. */
export async function removeAvatarAction(): Promise<{ ok: true; profile: Profile } | { ok: false }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false };
  const previous = await db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { avatarUrl: true } });
  const [updated] = await db.update(profiles).set({ avatarUrl: null, avatarOptOut: true }).where(eq(profiles.id, me)).returning();
  if (!updated) return { ok: false };
  await deleteAvatar(previous?.avatarUrl);
  await revalidateEverywhere(me, updated.handle);
  return { ok: true, profile: toProfile(updated) };
}

// ------------------------------------------------------------
// Excluir conta (LGPD, art. 18, VI)
// ------------------------------------------------------------

/**
 * Apaga a conta e tudo ligado a ela (estante, reviews, seguidores, reações, notificações,
 * login por senha): as chaves estrangeiras têm ON DELETE CASCADE. Exige digitar o @ para confirmar.
 */
export async function deleteAccountAction(confirmHandle: string): Promise<{ ok: boolean }> {
  const me = await currentProfileId();
  if (!me || !db) return { ok: false };
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { handle: true, avatarUrl: true } });
  if (!profile || confirmHandle.trim().replace(/^@/, "") !== profile.handle) return { ok: false };

  const books = await db.select({ id: entries.bookId }).from(entries).where(eq(entries.userId, me)).limit(500);
  await db.delete(profiles).where(and(eq(profiles.id, me), eq(profiles.handle, profile.handle)));
  await deleteAvatar(profile.avatarUrl);

  revalidatePath(`/u/${profile.handle}`);
  revalidatePath("/");
  revalidatePath("/leitores");
  books.forEach((b) => revalidatePath(`/livro/${b.id}`));
  return { ok: true };
}
