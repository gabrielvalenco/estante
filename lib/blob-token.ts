/**
 * Token do Vercel Blob. Ao conectar o store, a Vercel cria BLOB_READ_WRITE_TOKEN, mas deixa trocar
 * o prefixo (ex.: ESTANTE_READ_WRITE_TOKEN). Aceita qualquer nome terminado em _READ_WRITE_TOKEN
 * cujo valor tenha o formato de token do Blob.
 */
export function blobToken(): string | undefined {
  if (process.env.BLOB_READ_WRITE_TOKEN) return process.env.BLOB_READ_WRITE_TOKEN;
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_READ_WRITE_TOKEN") && value?.startsWith("vercel_blob_rw_")) return value;
  }
  return undefined;
}
