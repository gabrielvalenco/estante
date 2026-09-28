/** Só aceita caminhos internos para o redirecionamento pós-login ("/livro/..."), nunca "//site.com" ou URLs completas. */
export function safeNext(next: string | null | undefined, fallback = "/estante") {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
