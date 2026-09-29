import type { NextRequest } from "next/server";

import { setFollowAction } from "@/app/actions";
import { appUser, fail, failWith, ok, readJson } from "@/lib/api";

type Props = { params: Promise<{ handle: string }> };

/** Segue (follow: true) ou deixa de seguir. Perfil privado vira pedido: state "requested". */
export async function POST(req: NextRequest, { params }: Props) {
  if (!(await appUser(req))) return fail("unauthenticated", 401);
  const { handle } = await params;
  const body = (await readJson(req)) as { follow?: unknown } | null;
  if (typeof body?.follow !== "boolean") return fail("invalid", 400);
  const r = await setFollowAction(handle, body.follow);
  return r.ok ? ok({ state: r.state }) : failWith(r.error);
}
