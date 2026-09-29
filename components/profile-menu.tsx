"use client";

import { Ban, Link2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { setBlockAction } from "@/app/social-actions";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { setBlocked, useAuth } from "@/lib/auth";

/** Menu "…" do perfil: copiar link e bloquear/desbloquear (com "Desfazer" no aviso). */
export function ProfileMenu({ handle, canBlock }: { handle: string; canBlock: boolean }) {
  const auth = useAuth();
  const isMe = auth.status === "user" && auth.profile.handle === handle;
  const blocked = auth.status === "user" && auth.blocked.includes(handle);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}/u/${handle}`).catch(() => {});
    toast("Link do perfil copiado");
  }

  async function block(next: boolean) {
    setBlocked(handle, next);
    const result = await setBlockAction(handle, next).catch(() => ({ ok: false }));
    if (!result.ok) {
      setBlocked(handle, !next);
      toast.error("Não foi possível atualizar");
      return;
    }
    toast(next ? `Você bloqueou @${handle}` : `Você desbloqueou @${handle}`, {
      description: next ? "Vocês deixaram de se seguir e @" + handle + " não pode mais interagir com você." : undefined,
      action: next ? { label: "Desfazer", onClick: () => void block(false) } : undefined,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Mais opções do perfil"
        className="inline-flex size-8 items-center justify-center rounded-full text-ink-3 transition-colors outline-none hover:bg-sunken hover:text-ink focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-56 rounded-2xl p-1.5">
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={copy}>
          <Link2 /> Copiar link do perfil
        </DropdownMenuItem>
        {canBlock && auth.status === "user" && !isMe && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant={blocked ? "default" : "destructive"} className="rounded-lg px-2.5 py-2" onClick={() => block(!blocked)}>
              <Ban /> {blocked ? `Desbloquear @${handle}` : `Bloquear @${handle}`}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Aviso no topo do perfil de alguém que eu bloqueei. */
export function BlockedNotice({ handle }: { handle: string }) {
  const auth = useAuth();
  if (auth.status !== "user" || !auth.blocked.includes(handle)) return null;
  return (
    <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-sunken px-4 py-3 text-sm text-ink-2">
      <Ban className="size-4 text-ink-3" aria-hidden />
      Você bloqueou @{handle}. Esta pessoa não pode seguir você nem reagir às suas reviews.
      <button
        type="button"
        className="font-medium text-anil hover:text-anil-hover"
        onClick={async () => {
          setBlocked(handle, false);
          const r = await setBlockAction(handle, false).catch(() => ({ ok: false }));
          if (!r.ok) setBlocked(handle, true);
        }}
      >
        Desbloquear
      </button>
    </p>
  );
}
