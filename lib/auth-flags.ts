/**
 * O que está ligado neste ambiente. Lido no servidor e repassado ao cliente pelo layout.
 * Sem banco ou sem AUTH_SECRET, o app roda em modo demonstração (estante no navegador, sem login).
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const hasSecret = Boolean(process.env.AUTH_SECRET);

const github = Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const devLogin = process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_LOGIN === "true";

export const authFlags = {
  github,
  devLogin,
  /** Contas funcionam: há banco, segredo e pelo menos uma forma de entrar. */
  accounts: hasDb && hasSecret && (github || devLogin),
};

export type AuthFlags = typeof authFlags;
