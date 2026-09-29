import Link from "next/link";

import { AvatarPhoto } from "@/components/avatar-photo";
import type { User } from "@/lib/data/social";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  anil: "bg-anil-soft text-anil",
  ameixa: "bg-ameixa-soft text-ameixa",
  musgo: "bg-musgo-soft text-musgo",
  ambar: "bg-ambar-soft text-ambar-ink",
};

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

/**
 * Avatar do leitor: a foto, se houver, sobre as iniciais na cor escolhida. As iniciais ficam por
 * baixo enquanto a foto carrega e continuam lá se ela falhar. Fotos são 256px WebP (lib/avatars.ts).
 */
export function UserAvatar({
  user,
  size = 32,
  href = true,
  className,
}: {
  user: Pick<User, "handle" | "name"> & { tone: string; avatarUrl?: string | null };
  size?: number;
  href?: boolean;
  className?: string;
}) {
  const avatar = (
    <span
      aria-hidden={href || undefined}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold select-none",
        TONES[user.tone] ?? TONES.anil,
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.38, letterSpacing: "-0.02em" }}
    >
      {initialsOf(user.name)}
      {user.avatarUrl && <AvatarPhoto key={user.avatarUrl} src={user.avatarUrl} size={size} />}
    </span>
  );

  if (!href) return avatar;
  return (
    <Link href={`/u/${user.handle}`} aria-label={user.name} className="shrink-0 rounded-full">
      {avatar}
    </Link>
  );
}
