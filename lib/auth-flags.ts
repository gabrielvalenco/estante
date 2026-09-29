/**
 * O que está ligado neste ambiente. Lido no servidor e repassado ao cliente pelo layout.
 * Sem banco ou sem AUTH_SECRET, o app roda em modo demonstração (estante no navegador, sem login).
 */
const hasDb = Boolean(process.env.DATABASE_URL);
const hasSecret = Boolean(process.env.AUTH_SECRET);
const ready = hasDb && hasSecret;

const github = ready && Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
const google = ready && Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
/** E-mail e senha só dependem do banco: está sempre disponível quando há contas. */
const password = ready;
/** Envio de foto de perfil: precisa do Vercel Blob (em desenvolvimento, salva no disco). */
const avatars = ready && (Boolean(process.env.BLOB_READ_WRITE_TOKEN) || process.env.NODE_ENV === "development");
const devLogin = ready && process.env.NODE_ENV === "development" && process.env.ENABLE_DEV_LOGIN === "true";

export const authFlags = {
  github,
  google,
  password,
  devLogin,
  avatars,
  /** Contas funcionam: há banco e segredo (e-mail e senha sempre servem de porta de entrada). */
  accounts: ready,
};

export type AuthFlags = typeof authFlags;
