import type { NextRequest } from "next/server";

import { previewInvite } from "@/app/club-actions";
import { appUser, fail, ok } from "@/lib/api";

type Props = { params: Promise<{ code: string }> };

/** Prévia do convite: nome, livro, quantas pessoas e se a pessoa já está no clube. */
export async function GET(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const invite = await previewInvite((await params).code);
  return invite ? ok(invite) : fail("not_found", 404);
}
