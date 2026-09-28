"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";
import { isSupabaseConfigured, SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

let client: SupabaseClient<Database> | null = null;

/** Cliente do navegador (um só por aba). `null` em modo demonstração. */
export function getBrowserClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured) return null;
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
