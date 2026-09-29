import type { NextRequest } from "next/server";

import { markNotificationsRead } from "@/app/social-actions";
import { appUser, fail, ok } from "@/lib/api";

/** Marca todas as notificações como lidas. */
export async function POST(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  await markNotificationsRead();
  return ok({ ok: true });
}
