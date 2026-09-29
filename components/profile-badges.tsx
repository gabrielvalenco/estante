import { BadgeCheck, Crown, Lock } from "lucide-react";

import { PLATFORMS, socialUrl, type SocialLink } from "@/lib/socials";
import { cn } from "@/lib/utils";

/** Selo de fundador: só um perfil tem (definido pela migração). */
export function FounderBadge({ className }: { className?: string }) {
  return (
    <span
      title="Fundador da Estante"
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-ambar-soft px-2.5 py-1 text-xs font-semibold text-ambar-ink ring-1 ring-ambar/30",
        className,
      )}
    >
      <Crown className="size-3.5" aria-hidden />
      Fundador
    </span>
  );
}

export function PrivateBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-ink-3", className)} title="Perfil privado">
      <Lock className="size-3.5" aria-hidden />
      Privado
    </span>
  );
}

/**
 * Redes sociais do perfil. A URL é sempre montada a partir da plataforma + @ (nunca digitada),
 * então todo link aponta para o domínio oficial da rede. rel="me" ajuda outras redes a verificarem de volta.
 */
export function SocialLinks({ links, className }: { links: SocialLink[]; className?: string }) {
  if (!links.length) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
      {links.map((l) => (
        <li key={l.platform}>
          <a
            href={socialUrl(l)}
            target="_blank"
            rel="me noopener noreferrer nofollow"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-sunken px-3 text-[0.8125rem] text-ink-2 transition-colors hover:bg-line hover:text-ink"
          >
            <span className="font-medium text-ink">{PLATFORMS[l.platform].label}</span>
            <span className="text-ink-3">@{l.handle}</span>
            {l.verified && (
              <BadgeCheck className="size-4 text-musgo" aria-label="Verificado: o perfil da rede aponta para esta página" />
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}
