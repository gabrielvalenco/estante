import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { bearerFrom, verifyAppToken } from "@/lib/app-token";

/**
 * Helpers da API do app (/api/v1). Regras:
 *   - quem escreve é identificado só pelo token Bearer, nunca pelo cookie do site: um site
 *     malicioso não consegue fazer o navegador de alguém chamar estas rotas logado (CSRF);
 *   - a lógica é a mesma das server actions do site (app/*actions.ts), que leem o id do token
 *     via currentProfileId(); aqui só se traduz para HTTP.
 */

export type ApiError = { error: string };

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "private, no-store", ...init?.headers } });
}

export function fail(error: string, status: number) {
  return NextResponse.json({ error } satisfies ApiError, { status, headers: { "Cache-Control": "private, no-store" } });
}

/** Status HTTP de cada erro devolvido pelas actions. */
const STATUS: Record<string, number> = {
  unauthenticated: 401,
  invalid: 400,
  invalid_input: 400,
  invalid_credentials: 401,
  locked: 429,
  email_taken: 409,
  handle_taken: 409,
  name_taken: 409,
  handle_unavailable: 400,
  not_found: 404,
  self: 400,
  blocked: 403,
  too_big: 413,
  unavailable: 503,
  rate_limited: 429,
  forbidden: 403,
};

export const failWith = (error: string) => fail(error, STATUS[error] ?? 400);

/** Id do perfil pelo token; null quando não há token ou ele é inválido. */
export async function appUser(req: NextRequest): Promise<string | null> {
  const token = bearerFrom(req.headers.get("authorization"));
  return token ? verifyAppToken(token) : null;
}

/** Corpo JSON com limite de tamanho; null se inválido. */
export async function readJson(req: NextRequest, maxBytes = 16_000): Promise<unknown> {
  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > maxBytes) return null;
  try {
    const text = await req.text();
    return text.length > maxBytes ? null : JSON.parse(text);
  } catch {
    return null;
  }
}

/** Livro sem a sinopse, para listas (a sinopse vem só na página do livro). */
export function bookSummary(b: { id: string; title: string; author: string; year: number | null; pages: number | null; coverId: number | null; color: string; genres: string[] }) {
  const { id, title, author, year, pages, coverId, color, genres } = b;
  return { id, title, author, year, pages, coverId, color, genres };
}
