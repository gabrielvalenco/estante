import type { NextRequest } from "next/server";

import { getNotifications } from "@/app/social-actions";
import { appUser, fail, ok } from "@/lib/api";

/** Notificações (seguidores, pedidos, curtidas em reviews, leituras de amigos) e o total não lido. */
export async function GET(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  return ok((await getNotifications()) ?? { items: [], unread: 0 });
}
