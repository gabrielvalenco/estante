/**
 * Configuração do Supabase.
 * Sem as variáveis, o app roda em modo demonstração: a estante fica no navegador
 * e as telas de login explicam isso. Assim um fork ou preview sem banco continua funcionando.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

/** Login com GitHub só aparece quando o provedor foi configurado no painel do Supabase. */
export const githubEnabled = process.env.NEXT_PUBLIC_AUTH_GITHUB === "true";
