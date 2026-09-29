import "server-only";

import { auth } from "@/auth";

/** Id do perfil de quem está logado, sempre da sessão (nunca de um parâmetro vindo do navegador). */
export async function currentProfileId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}
