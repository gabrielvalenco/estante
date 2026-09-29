import type { NextRequest } from "next/server";

import { getPrivateProfileContent } from "@/app/social-actions";
import { appUser, fail, ok } from "@/lib/api";
import { getProfileView } from "@/lib/profiles";

type Props = { params: Promise<{ handle: string }> };

/**
 * Perfil de um leitor. Perfil privado vem sem conteúdo, a não ser que o token seja
 * da própria pessoa ou de um seguidor aprovado (mesma regra do site).
 */
export async function GET(req: NextRequest, { params }: Props) {
  const { handle } = await params;
  if (!/^[a-z0-9_]{3,20}$/.test(handle)) return fail("not_found", 404);
  const view = await getProfileView(handle);
  if (!view) return fail("not_found", 404);

  let access: "public" | "granted" | "login" | "not_follower" | "blocked" = "public";
  if (view.isPrivate) {
    access = "login";
    if (await appUser(req)) {
      const r = await getPrivateProfileContent(handle);
      if (r.ok) {
        view.content = r.content;
        access = "granted";
      } else access = r.reason === "not_found" ? "login" : r.reason;
    }
  }
  return ok({ profile: view, access });
}
