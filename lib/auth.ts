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
  | {
      status: "user";
      profile: Profile;
      /** Handles de quem a pessoa segue, pediu para seguir (perfis privados) e bloqueou. */
      following: string[];
      requested: string[];
      blocked: string[];
      /** Entra com e-mail e senha (mostra "Mudar senha"). */
      hasPassword: boolean;
    };

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

export type FollowState = "following" | "requested" | "none";

export function followStateOf(auth: AuthState, handle: string): FollowState {
  if (auth.status !== "user") return "none";
  if (auth.following.includes(handle)) return "following";
  if (auth.requested.includes(handle)) return "requested";
  return "none";
}

/** Atualiza seguindo/pedido para um @ (otimista; o botão desfaz se o servidor recusar). */
export function setFollowState(handle: string, next: FollowState) {
  if (state.status !== "user") return;
  const following = state.following.filter((h) => h !== handle);
  const requested = state.requested.filter((h) => h !== handle);
  if (next === "following") following.push(handle);
  if (next === "requested") requested.push(handle);
  setAuth({ ...state, following, requested });
}

/** Marca um @ como bloqueado ou não; bloquear também desfaz seguir e pedidos. */
export function setBlocked(handle: string, blocked: boolean) {
  if (state.status !== "user") return;
  const rest = state.blocked.filter((h) => h !== handle);
  setAuth({
    ...state,
    blocked: blocked ? [...rest, handle] : rest,
    following: blocked ? state.following.filter((h) => h !== handle) : state.following,
    requested: blocked ? state.requested.filter((h) => h !== handle) : state.requested,
  });
}

// O que está ligado neste ambiente (contas, GitHub, login de teste), vindo do servidor.
export const AuthFlagsContext = createContext<AuthFlags>({ accounts: false, github: false, google: false, password: false, devLogin: false });

export function useAuthFlags() {
  return useContext(AuthFlagsContext);
}
