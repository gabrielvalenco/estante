import type { NextRequest } from "next/server";

import { getClub } from "@/app/club-actions";
import { appUser, fail, ok } from "@/lib/api";

type Props = { params: Promise<{ id: string }> };

/** Um clube com membros e o progresso de cada um no livro do clube. Só membros (senão 404). */
export async function GET(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const club = await getClub((await params).id);
  return club ? ok(club) : fail("not_found", 404);
}
