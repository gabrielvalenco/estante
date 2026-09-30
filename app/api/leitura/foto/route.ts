import { and, count, eq, gte } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";

import { bearerFrom } from "@/lib/app-token";
import { planOf } from "@/lib/billing";
import { db } from "@/lib/db";
import { pageScans } from "@/lib/db/schema";
import { ocrEnabled, readPagePhoto } from "@/lib/ocr";
import { limitValue, PLANS } from "@/lib/plans";
import { currentProfileId } from "@/lib/session";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;

/** Início do mês no horário de Brasília (o limite é "por mês" para quem usa). */
function monthStart() {
  const [y, m] = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }).split("-");
  return new Date(`${y}-${m}-01T00:00:00-03:00`);
}

async function usageOf(me: string) {
  const plan = PLANS[await planOf(me)];
  const [{ n }] = await db!.select({ n: count() }).from(pageScans).where(and(eq(pageScans.userId, me), gte(pageScans.createdAt, monthStart())));
  return { planName: plan.name, used: n, limit: limitValue(plan.limits.photoQuotesPerMonth) };
}

/** Pedido com cookie de sessão só vale vindo do próprio site (outro site não gasta a cota de ninguém). */
function sameOriginOrToken(req: NextRequest) {
  if (bearerFrom(req.headers.get("authorization"))) return true;
  const origin = req.headers.get("origin");
  return Boolean(origin && new URL(origin).host === req.nextUrl.host);
}

/** Uso do mês e se o recurso está ligado (para a tela mostrar o botão certo). */
export async function GET() {
  const me = await currentProfileId();
  if (!me || !db) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({ enabled: ocrEnabled(), ...(await usageOf(me)) }, { headers: { "Cache-Control": "private, no-store" } });
}

/**
 * Lê uma foto de página (multipart, campo "file") e devolve { text, page } para a pessoa revisar.
 * Cada leitura conta no limite do mês do plano. A foto não é guardada.
 */
export async function POST(req: NextRequest) {
  const me = await currentProfileId();
  if (!me || !db) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!sameOriginOrToken(req)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!ocrEnabled()) return NextResponse.json({ error: "unavailable" }, { status: 503 });

  const usage = await usageOf(me);
  if (usage.limit === 0) return NextResponse.json({ error: "plan", ...usage }, { status: 402 });
  if (usage.limit !== null && usage.used >= usage.limit) return NextResponse.json({ error: "limit", ...usage }, { status: 402 });

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES + 100_000) return NextResponse.json({ error: "too_big" }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_big" }, { status: 413 });

  // Reduz (texto de livro continua legível em 1600px), gira pela câmera e tira os metadados (GPS etc.).
  let image: Buffer;
  try {
    image = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 60_000_000 })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  // Conta antes de chamar a IA: a leitura tem custo mesmo quando a foto não serve.
  await db.insert(pageScans).values({ userId: me });
  const result = await readPagePhoto(image, "image/jpeg");
  const after = { ...usage, used: usage.used + 1 };
  if (!result.ok) {
    const status = result.error === "unavailable" ? 503 : 422;
    return NextResponse.json({ error: result.error, ...after }, { status });
  }
  return NextResponse.json({ text: result.text, page: result.page, ...after }, { headers: { "Cache-Control": "private, no-store" } });
}
