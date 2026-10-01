import type { NextRequest } from "next/server";

import { searchInvitableAction } from "@/app/club-actions";
import { appUser, fail, ok } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** Seguidores de quem criou que ainda não estão no clube. ?q= filtra por nome ou @. Só quem criou. */
export async function GET(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const people = await searchInvitableAction((await params).id, req.nextUrl.searchParams.get("q") ?? "");
  return people ? ok({ people }) : fail("not_found", 404);
}
