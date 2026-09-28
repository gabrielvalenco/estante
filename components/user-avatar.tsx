import Link from "next/link";

import type { User } from "@/lib/data/social";
import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  anil: "bg-anil-soft text-anil",
  ameixa: "bg-ameixa-soft text-ameixa",
  musgo: "bg-musgo-soft text-musgo",
  ambar: "bg-ambar-soft text-ambar-ink",
};

/** Avatar com iniciais na cor do leitor. Sem foto, de propósito: nada de rosto de banco de imagens. */
export function UserAvatar({
  user,
  size = 32,
  href = true,
  className,
}: {
  user: Pick<User, "handle" | "name"> & { tone: string };
  size?: number;
  href?: boolean;
  className?: string;
}) {
  const initials =
    user.name
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  const avatar = (
    <span
      aria-hidden={href || undefined}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold select-none", TONES[user.tone] ?? TONES.anil, className)}
      style={{ width: size, height: size, fontSize: size * 0.38, letterSpacing: "-0.02em" }}
    >
      {initials}
    </span>
  );

  if (!href) return avatar;
  return (
    <Link href={`/u/${user.handle}`} aria-label={user.name} className="shrink-0 rounded-full">
      {avatar}
    </Link>
  );
}
