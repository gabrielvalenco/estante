import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FollowSection } from "@/components/follow-button";
import { OwnProfileActions } from "@/components/own-profile-actions";
import { PrivateProfileGate } from "@/components/private-profile-gate";
import { FounderBadge, PrivateBadge, SocialLinks } from "@/components/profile-badges";
import { ProfileBody } from "@/components/profile-body";
import { BlockedNotice, ProfileMenu } from "@/components/profile-menu";
import { UserAvatar } from "@/components/user-avatar";
import { USERS } from "@/lib/data/social";
import { getProfileView } from "@/lib/profiles";

type Props = { params: Promise<{ handle: string }> };

// Perfis de demonstração saem prontos do build; os reais são gerados no primeiro acesso
// e atualizados quando a pessoa mexe na estante (revalidatePath) ou a cada 5 minutos.
export const revalidate = 300;

export function generateStaticParams() {
  return USERS.map((u) => ({ handle: u.handle }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const profile = await getProfileView((await params).handle);
  if (!profile) return { title: "Leitor não encontrado" };
  return {
    title: `${profile.name} (@${profile.handle})`,
    // Perfil privado não aparece em buscadores.
    robots: profile.isPrivate ? { index: false, follow: false } : undefined,
  };
}

export default async function ProfilePage({ params }: Props) {
  const profile = await getProfileView((await params).handle);
  if (!profile) notFound();

  const firstName = profile.name.split(" ")[0];

  return (
    <div className="container-page animate-fade-up pt-10 sm:pt-14">
      {/* Cabeçalho: sempre público (nome, @, bio, redes, seguidores) */}
      <header className="flex items-start gap-5">
        <UserAvatar user={profile} size={88} href={false} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-title font-semibold break-words text-ink">{profile.name}</h1>
            {profile.founder && <FounderBadge />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-3">
            @{profile.handle}
            {profile.isPrivate && <PrivateBadge />}
            <OwnProfileActions handle={profile.handle} />
            {!profile.isDemo && <ProfileMenu handle={profile.handle} canBlock />}
          </p>
          {profile.bio && <p className="mt-2 max-w-md text-[0.9375rem] leading-relaxed text-ink-2">{profile.bio}</p>}
          <SocialLinks links={profile.socials} className="mt-3" />
          {profile.followers !== null && profile.following !== null ? (
            <FollowSection handle={profile.handle} followers={profile.followers} following={profile.following} isPrivate={profile.isPrivate} />
          ) : (
            <p className="mt-4 inline-flex rounded-full bg-sunken px-3 py-1 text-xs font-medium text-ink-3">Leitor de demonstração</p>
          )}
        </div>
      </header>

      {!profile.isDemo && <BlockedNotice handle={profile.handle} />}

      {profile.content ? (
        <ProfileBody
          content={profile.content}
          goal={profile.goal}
          firstName={firstName}
          lists={profile.lists}
          showLists={profile.isDemo}
        />
      ) : (
        <PrivateProfileGate handle={profile.handle} name={profile.name} goal={profile.goal} />
      )}
    </div>
  );
}
