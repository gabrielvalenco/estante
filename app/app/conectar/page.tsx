import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppConnectActions } from "@/components/app-connect";
import { Mark } from "@/components/brand";
import { UserAvatar } from "@/components/user-avatar";
import { isAppRedirect, isChallenge } from "@/lib/app-token";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { currentProfileId } from "@/lib/session";

export const metadata: Metadata = { title: "Entrar no app", robots: { index: false } };

type Props = { searchParams: Promise<{ challenge?: string; redirect?: string }> };

/**
 * Entrar no app pelo site: o app abre esta página num navegador seguro. Sem sessão, vai para o
 * login do site (Google, GitHub ou senha) e volta para cá; com sessão, a pessoa confirma a conta.
 */
export default async function ConnectAppPage({ searchParams }: Props) {
  const { challenge, redirect: back } = await searchParams;
  if (!isChallenge(challenge) || !isAppRedirect(back)) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold text-ink">Link inválido</h1>
        <p className="mt-2 text-ink-3">Volte ao app da Estante e toque em entrar de novo.</p>
      </Shell>
    );
  }

  const here = `/app/conectar?${new URLSearchParams({ challenge, redirect: back })}`;
  const me = await currentProfileId();
  if (!me || !db) redirect(`/entrar?next=${encodeURIComponent(here)}`);
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, me),
    columns: { handle: true, name: true, tone: true, avatarUrl: true },
  });
  if (!profile) redirect(`/entrar?next=${encodeURIComponent(here)}`);

  return (
    <Shell>
      <h1 className="text-xl font-semibold text-ink">Entrar no app</h1>
      <p className="mt-2 text-ink-3">O app da Estante vai usar esta conta. Sua estante, notas e clubes aparecem lá também.</p>
      <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-canvas p-4 text-left">
        <UserAvatar user={profile} size={44} href={false} />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{profile.name}</p>
          <p className="truncate text-sm text-ink-3">@{profile.handle}</p>
        </div>
      </div>
      <AppConnectActions challenge={challenge} redirect={back} here={here} />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page animate-fade-up flex justify-center pt-12 pb-16 sm:pt-20">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-card sm:p-8">
        <Mark size={40} className="mx-auto mb-5" />
        {children}
      </div>
    </div>
  );
}
