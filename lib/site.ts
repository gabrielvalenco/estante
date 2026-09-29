/** Nome e textos da marca num lugar só. Trocar o nome do app é trocar aqui. */
export const SITE = {
  name: "Estante",
  tagline: "Tudo o que você lê, num lugar só.",
  description:
    "Registre o que você lê, dê nota, escreva reviews curtas e descubra livros pelo que seus amigos estão lendo.",
  repo: "https://github.com/gabrielvalenco/estante",
  /** Leitor de exemplo que representa "você" nas telas de demonstração. */
  demoUser: "marina",
  /**
   * Controlador dos dados e canal de contato da LGPD (política de privacidade).
   * Ficam em variáveis de ambiente para não gravar dados pessoais no código.
   */
  controller: process.env.NEXT_PUBLIC_CONTROLLER_NAME || "o responsável pelo projeto Estante",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
  /** Data da versão atual da política e dos termos. */
  legalUpdatedAt: "2026-09-29",
} as const;
