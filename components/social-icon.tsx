import { Briefcase } from "lucide-react";
import { siBluesky, siGithub, siInstagram, siLetterboxd, siThreads, siTiktok, siX, siYoutube } from "simple-icons";

import type { Platform } from "@/lib/socials";
import { cn } from "@/lib/utils";

/**
 * Ícones oficiais das redes (Simple Icons, CC0). Importados um a um: só estes 8 entram no bundle.
 * Marcas de cor preta (X, Threads, TikTok, GitHub, Letterboxd) usam a cor do texto, para não
 * sumirem no modo escuro. O LinkedIn pediu para sair do Simple Icons, então usa um ícone neutro.
 */
const ICONS: Partial<Record<Platform, { path: string; color: string | null }>> = {
  instagram: { path: siInstagram.path, color: `#${siInstagram.hex}` },
  x: { path: siX.path, color: null },
  bluesky: { path: siBluesky.path, color: `#${siBluesky.hex}` },
  threads: { path: siThreads.path, color: null },
  tiktok: { path: siTiktok.path, color: null },
  youtube: { path: siYoutube.path, color: `#${siYoutube.hex}` },
  github: { path: siGithub.path, color: null },
  letterboxd: { path: siLetterboxd.path, color: null },
};

export function SocialIcon({
  platform,
  className,
  colored = true,
}: {
  platform: Platform;
  className?: string;
  /** false: sempre na cor do texto (ex.: dentro de um item selecionado). */
  colored?: boolean;
}) {
  const icon = ICONS[platform];
  if (!icon) return <Briefcase className={cn("size-4 shrink-0", className)} aria-hidden />;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={cn("size-4 shrink-0", className)}
      style={{ fill: colored && icon.color ? icon.color : "currentColor" }}
    >
      <path d={icon.path} />
    </svg>
  );
}
