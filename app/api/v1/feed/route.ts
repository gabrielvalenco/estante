import type { NextRequest } from "next/server";

import { getFollowingFeed } from "@/app/actions";
import { appUser, fail, ok } from "@/lib/api";

/** Atividade recente de quem a pessoa segue. */
export async function GET(req: NextRequest) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  return ok({ items: (await getFollowingFeed()) ?? [] });
}
