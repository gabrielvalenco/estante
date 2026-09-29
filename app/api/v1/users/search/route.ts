import type { NextRequest } from "next/server";

import { ok } from "@/lib/api";
import { searchReaders } from "@/lib/db/queries";

/** Busca de leitores por nome ou @. */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2 || q.length > 40) return ok({ readers: [] });
  return ok({ readers: await searchReaders(q, 10) });
}
