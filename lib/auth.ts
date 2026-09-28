"use client";

import { useSyncExternalStore } from "react";

import type { Tables } from "@/lib/supabase/database.types";

export type Profile = Tables<"profiles">;

/**
 * Estado de autenticação compartilhado pela aba.
 * Quem escreve aqui é o <AuthSync />, montado uma vez no layout.
 */
export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "user"; userId: string; email: string | null; profile: Profile | null };

let state: AuthState = { status: "loading" };
const listeners = new Set<() => void>();
const SERVER: AuthState = { status: "loading" };

export function setAuth(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
}

export function getAuth() {
  return state;
}

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => SERVER,
  );
}

export function updateProfile(profile: Profile) {
  if (state.status === "user") setAuth({ ...state, profile });
}
