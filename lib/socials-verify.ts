import "server-only";

import type { Platform } from "@/lib/socials";

/**
 * Confere, pela API pública da rede, se o perfil existe e se aponta de volta para a Estante.
 * - "missing": a rede diz que o perfil não existe (bloqueia o salvamento).
 * - "verified": existe e tem o link do perfil na Estante na bio ou no site.
 * - "unverified": existe (ou não deu para checar agora), mas sem o link de volta.
 * Rede fora do ar nunca impede salvar: vira "unverified".
 */
export type VerifyResult = "verified" | "unverified" | "missing";

const TIMEOUT = 4000;

/** Endereço público do perfil na Estante, sem protocolo: é o que procuramos na bio. */
export function profileAddress(handle: string) {
  const host =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/^https?:\/\//, "").replace(/\/$/, "") ??
    process.env.VERCEL_PROJECT_PRODUCTION_URL ??
    "localhost:3000";
  return `${host}/u/${handle}`.toLowerCase();
}

async function getJson(url: string): Promise<{ status: number; body: Record<string, unknown> | null }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT),
      headers: { accept: "application/json", "user-agent": "Estante (verificação de perfil)" },
      cache: "no-store",
    });
    return { status: res.status, body: res.ok ? ((await res.json()) as Record<string, unknown>) : null };
  } catch {
    return { status: 0, body: null };
  }
}

const mentions = (texts: unknown[], address: string) =>
  texts.some((t) => typeof t === "string" && t.toLowerCase().includes(address));

export async function verifySocial(platform: Platform, handle: string, estanteHandle: string): Promise<VerifyResult> {
  const address = profileAddress(estanteHandle);

  if (platform === "github") {
    const { status, body } = await getJson(`https://api.github.com/users/${encodeURIComponent(handle)}`);
    if (status === 404) return "missing";
    if (!body) return "unverified";
    return mentions([body.bio, body.blog], address) ? "verified" : "unverified";
  }

  if (platform === "bluesky") {
    const { status, body } = await getJson(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
    );
    if (status === 400 || status === 404) return "missing";
    if (!body) return "unverified";
    return mentions([body.description], address) ? "verified" : "unverified";
  }

  return "unverified";
}
