import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { authFlags } from "@/lib/auth-flags";
import { signInWithPassword, signUpWithPassword, type PasswordAuthError } from "@/lib/db/password-auth";
import { adoptProviderAvatar, ensureProfile } from "@/lib/db/profiles";

/**
 * Login com Auth.js. Sessão em JWT (sem tabelas de sessão): o token guarda só o id do perfil.
 * Na primeira entrada por GitHub ou Google, o perfil é criado a partir dos dados do provedor.
 * Contas de provedores diferentes não são unidas pelo e-mail, de propósito: unir por e-mail
 * deixaria alguém entrar na conta de outra pessoa cadastrando o mesmo endereço em outro lugar.
 */

/** Erro de senha que chega à tela com um código (`result.code` no signIn do cliente). */
class PasswordError extends CredentialsSignin {
  constructor(code: PasswordAuthError) {
    super();
    this.code = code;
  }
}

const providers: NextAuthConfig["providers"] = [];

if (authFlags.github) providers.push(GitHub); // AUTH_GITHUB_ID e AUTH_GITHUB_SECRET
if (authFlags.google) providers.push(Google); // AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET

if (authFlags.password) {
  providers.push(
    Credentials({
      id: "password",
      name: "E-mail e senha",
      credentials: { email: {}, password: {}, name: {}, mode: {} },
      authorize: async (credentials) => {
        const result =
          credentials?.mode === "signup" ? await signUpWithPassword(credentials) : await signInWithPassword(credentials);
        if (!result.ok) throw new PasswordError(result.error);
        // Para senha, o id devolvido já é o id do perfil (ver callback jwt).
        return { id: result.profileId, name: result.name };
      },
    }),
  );
}

// Login de teste para desenvolvimento local: entra com um nome, sem senha.
// Nunca é registrado em produção (authFlags.devLogin exige NODE_ENV=development).
if (authFlags.devLogin) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Leitor de teste",
      // image: só para testar a importação da foto do provedor (lib/avatars.ts).
      credentials: { name: { label: "Nome" }, image: {} },
      authorize: (credentials) => {
        const name = String(credentials?.name ?? "").trim().slice(0, 60);
        if (!name) return null;
        const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "").slice(0, 20) || "leitor";
        const image = typeof credentials?.image === "string" && credentials.image ? credentials.image : undefined;
        return { id: slug, name, image };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/entrar", error: "/entrar" },
  callbacks: {
    async jwt({ token, account, user, profile }) {
      // `account` só vem no momento do login.
      if (account?.provider === "password") {
        // O perfil já foi criado ou conferido em authorize; user.id é o id dele.
        token.profileId = user.id;
      } else if (account) {
        const email = typeof profile?.email === "string" ? profile.email : undefined;
        const login =
          (typeof profile?.login === "string" && profile.login) || // GitHub
          email?.split("@")[0] || // Google
          user.name ||
          undefined;
        const created = await ensureProfile({
          providerId: `${account.provider}:${account.providerAccountId}`,
          name: user.name ?? login ?? "Leitor",
          login,
        });
        token.profileId = created.id;
        // Primeira entrada: a foto do Google/GitHub vira a foto do perfil (copiada para o nosso Blob).
        await adoptProviderAvatar(created.id, user.image);
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.profileId === "string") session.user.id = token.profileId;
      return session;
    },
  },
});
