"use client";

import { Pencil } from "lucide-react";
import Link from "next/link";

import { useAuth } from "@/lib/auth";

/** No próprio perfil, um atalho para editar. A página é pública e em cache; isso só aparece no navegador do dono. */
export function OwnProfileActions({ handle }: { handle: string }) {
  const auth = useAuth();
  if (auth.status !== "user" || auth.profile.handle !== handle) return null;
  return (
    <Link href="/conta" className="inline-flex items-center gap-1 text-sm font-medium text-anil hover:text-anil-hover">
      <Pencil className="size-3.5" aria-hidden />
      Editar perfil
    </Link>
  );
}
