import "server-only";

import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "@/lib/db/schema";

/**
 * Conexão com o Postgres (Neon em produção, Docker no desenvolvimento).
 * Sem DATABASE_URL o app roda em modo demonstração e `db` é null.
 */
export const isDbConfigured = Boolean(process.env.DATABASE_URL);

type DB = PostgresJsDatabase<typeof schema>;

// Em desenvolvimento o Next recarrega módulos; guardar no globalThis evita abrir conexões a cada save.
const globalForDb = globalThis as unknown as { estanteDb?: DB };

function create(): DB | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  // `prepare: false` porque o pooler do Neon (PgBouncer) não suporta prepared statements.
  const client = postgres(url, { prepare: false, max: process.env.NODE_ENV === "production" ? 1 : 5 });
  return drizzle(client, { schema });
}

export const db: DB | null = globalForDb.estanteDb ?? create();
if (db && process.env.NODE_ENV !== "production") globalForDb.estanteDb = db;
