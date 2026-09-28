import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";

import { ensureProfile } from "@/lib/db/profiles";
import { authFlags } from "@/lib/auth-flags";

/**
 * Login com Auth.js. Sessão em JWT (sem tabelas de sessão): o token guarda só o id do perfil.
 * Na primeira entrada, o perfil é criado a partir dos dados do provedor.
 */

const providers: NextAuthConfig["providers"] = [];

if (authFlags.github) providers.push(GitHub); // lê AUTH_GITHUB_ID e AUTH_GITHUB_SECRET

// Login de teste para desenvolvimento local: entra com um nome, sem senha.
// Nunca é registrado em produção (authFlags.devLogin exige NODE_ENV=development).
if (authFlags.devLogin) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Leitor de teste",
      credentials: { name: { label: "Nome" } },
      authorize: (credentials) => {
        const name = String(credentials?.name ?? "").trim().slice(0, 60);
        if (!name) return null;
        const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "").slice(0, 20) || "leitor";
        return { id: slug, name };
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
      if (account) {
        const login = typeof profile?.login === "string" ? profile.login : undefined;
        const created = await ensureProfile({
          providerId: `${account.provider}:${account.providerAccountId}`,
          name: user.name ?? login ?? "Leitor",
          login: login ?? user.name ?? undefined,
        });
        token.profileId = created.id;
      }
      return token;
    },
    session({ session, token }) {
      if (typeof token.profileId === "string") session.user.id = token.profileId;
      return session;
    },
  },
});
