"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

import type { AuthFlags } from "@/lib/auth-flags";
import type { Profile } from "@/lib/db/types";

export type { Profile };

/**
 * Estado de autenticação compartilhado pela aba.
 * Quem escreve aqui é o <AuthSync />, montado uma vez no layout.
 */
export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "user"; profile: Profile; /** Handles de quem a pessoa segue. */ following: string[] };

let state: AuthState = { status: "loading" };
const listeners = new Set<() => void>();
const SERVER: AuthState = { status: "loading" };

export function setAuth(next: AuthState) {
  state = next;
  listeners.forEach((l) => l());
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

/** Atualiza a lista de quem a pessoa segue (otimista; o botão desfaz se o servidor recusar). */
export function setFollowing(handle: string, follow: boolean) {
  if (state.status !== "user") return;
  const rest = state.following.filter((h) => h !== handle);
  setAuth({ ...state, following: follow ? [...rest, handle] : rest });
}

// O que está ligado neste ambiente (contas, GitHub, login de teste), vindo do servidor.
export const AuthFlagsContext = createContext<AuthFlags>({ accounts: false, github: false, google: false, password: false, devLogin: false });

export function useAuthFlags() {
  return useContext(AuthFlagsContext);
}
