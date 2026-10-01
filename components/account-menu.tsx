"use client";

import { ChartColumnBig, Gem, Library, LifeBuoy, LogOut, MessagesSquare, Moon, NotebookPen, Settings, Sun, UserRound, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth, useAuthFlags } from "@/lib/auth";

/** "Entrar" para visitantes; avatar com menu para quem está logado. */
export function AccountMenu() {
  const auth = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const flags = useAuthFlags();
  const { resolvedTheme, setTheme } = useTheme();

  if (!flags.accounts) return null;
  if (auth.status === "loading") return <span className="size-10 shrink-0" aria-hidden />;

  if (auth.status === "guest") {
    const next = pathname === "/" || pathname === "/entrar" ? "" : `?next=${encodeURIComponent(pathname)}`;
    return (
      <Link
        href={`/entrar${next}`}
        className="inline-flex h-10 shrink-0 items-center rounded-full px-3.5 text-sm font-medium text-anil transition-colors hover:bg-anil-soft"
      >
        Entrar
      </Link>
    );
  }

  const { profile } = auth;

  async function leave() {
    await signOut({ redirect: false });
    toast("Você saiu da sua conta");
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu da conta"
        className="shrink-0 rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <UserAvatar user={profile} size={36} href={false} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-60 rounded-2xl p-1.5">
        <div className="px-2.5 py-2">
          <p className="truncate text-sm font-semibold text-ink">{profile.name}</p>
          <p className="truncate text-xs text-ink-3">@{profile.handle}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push(`/u/${profile.handle}`)}>
          <UserRound /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/estante")}>
          <Library /> Minha estante
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/anotacoes")}>
          <NotebookPen /> Anotações
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/retrospectiva")}>
          <ChartColumnBig /> Retrospectiva
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/clubes")}>
          <MessagesSquare /> Clubes
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/seguindo")}>
          <Users /> Seguindo
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/conta")}>
          <Settings /> Configurações
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/planos")}>
          <Gem /> Planos
        </DropdownMenuItem>
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={() => router.push("/ajuda")}>
          <LifeBuoy /> Ajuda
        </DropdownMenuItem>
        {/* No celular o botão de tema sai do header e vem para cá. */}
        <DropdownMenuItem className="rounded-lg px-2.5 py-2 md:hidden" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? <Sun /> : <Moon />} {resolvedTheme === "dark" ? "Tema claro" : "Tema escuro"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="rounded-lg px-2.5 py-2" onClick={leave}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
