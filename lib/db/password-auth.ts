import "server-only";

import { randomUUID } from "node:crypto";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/lib/db";
import { ensureProfile } from "@/lib/db/profiles";
import { passwordLogins, profiles } from "@/lib/db/schema";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/password";

/** Erros que a tela de login sabe explicar. Nenhum deles revela se um e-mail tem conta. */
export type PasswordAuthError = "invalid_input" | "invalid_credentials" | "email_taken" | "locked";

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const Email = z.string().trim().toLowerCase().max(254).pipe(z.email());
// 72 é o limite prático de vários algoritmos de senha; mantemos para não aceitar algo que pareça seguro e não é.
const Password = z.string().min(8).max(72);

export const SignUpInput = z.object({ email: Email, password: Password, name: z.string().trim().min(1).max(60) });
export const SignInInput = z.object({ email: Email, password: z.string().min(1).max(72) });

type Ok = { ok: true; profileId: string; name: string };
type Fail = { ok: false; error: PasswordAuthError };

/**
 * Cria a conta e o perfil. O e-mail fica só em password_logins: o provider_id do perfil
 * é aleatório, para o endereço nunca aparecer junto com dados públicos.
 */
export async function signUpWithPassword(input: unknown): Promise<Ok | Fail> {
  const parsed = SignUpInput.safeParse(input);
  if (!parsed.success || !db) return { ok: false, error: "invalid_input" };
  const { email, password, name } = parsed.data;

  const existing = await db.query.passwordLogins.findFirst({ where: eq(passwordLogins.email, email), columns: { email: true } });
  if (existing) return { ok: false, error: "email_taken" };

  const passwordHash = await hashPassword(password);
  const profile = await ensureProfile({ providerId: `password:${randomUUID()}`, name, login: email.split("@")[0] });

  const [created] = await db
    .insert(passwordLogins)
    .values({ email, profileId: profile.id, passwordHash })
    .onConflictDoNothing()
    .returning({ email: passwordLogins.email });

  if (!created) {
    // Outra aba criou a mesma conta ao mesmo tempo: não sobrescrevemos a senha de ninguém
    // e apagamos o perfil órfão que acabamos de criar.
    await db.delete(profiles).where(eq(profiles.id, profile.id));
    return { ok: false, error: "email_taken" };
  }
  return { ok: true, profileId: profile.id, name: profile.name };
}

/** Confere e-mail e senha, com bloqueio temporário depois de várias tentativas erradas. */
export async function signInWithPassword(input: unknown): Promise<Ok | Fail> {
  const parsed = SignInInput.safeParse(input);
  if (!parsed.success || !db) return { ok: false, error: "invalid_credentials" };
  const { email, password } = parsed.data;

  const login = await db.query.passwordLogins.findFirst({ where: eq(passwordLogins.email, email) });

  if (!login) {
    // Mesmo custo de tempo de uma senha errada.
    await verifyPassword(password, await dummyHash());
    return { ok: false, error: "invalid_credentials" };
  }

  if (login.lockedUntil && login.lockedUntil > new Date()) return { ok: false, error: "locked" };

  if (!(await verifyPassword(password, login.passwordHash))) {
    const attempts = login.failedAttempts + 1;
    await db
      .update(passwordLogins)
      .set({
        failedAttempts: attempts >= MAX_ATTEMPTS ? 0 : attempts,
        lockedUntil: attempts >= MAX_ATTEMPTS ? sql`now() + make_interval(mins => ${LOCK_MINUTES})` : null,
      })
      .where(eq(passwordLogins.email, email));
    return { ok: false, error: attempts >= MAX_ATTEMPTS ? "locked" : "invalid_credentials" };
  }

  if (login.failedAttempts || login.lockedUntil) {
    await db.update(passwordLogins).set({ failedAttempts: 0, lockedUntil: null }).where(eq(passwordLogins.email, email));
  }
  const profile = await db.query.profiles.findFirst({ where: eq(profiles.id, login.profileId), columns: { name: true } });
  return { ok: true, profileId: login.profileId, name: profile?.name ?? "Leitor" };
}
