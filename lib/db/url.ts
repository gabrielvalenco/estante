/**
 * Normaliza a connection string do Postgres.
 *
 * O Neon entrega a URL com `channel_binding=require`, um parâmetro do libpq que o driver
 * `postgres` não entende: ele o repassa ao servidor como configuração e a conexão falha.
 * Removemos só esse parâmetro; `sslmode=require` continua valendo.
 */
export function normalizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url) return url;
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("channel_binding");
    return parsed.toString();
  } catch {
    return url;
  }
}
