/**
 * Redes sociais do perfil. A pessoa escolhe a plataforma e digita só o @; a URL é montada aqui.
 * Assim não existe "link aleatório": o endereço sempre aponta para o domínio oficial da rede.
 * Colar a URL completa também funciona, desde que seja do domínio daquela rede.
 */

export const PLATFORMS = {
  instagram: { label: "Instagram", pattern: /^[a-z0-9._]{1,30}$/i, url: (h: string) => `https://instagram.com/${h}`, domains: ["instagram.com"] },
  x: { label: "X", pattern: /^[a-z0-9_]{1,15}$/i, url: (h: string) => `https://x.com/${h}`, domains: ["x.com", "twitter.com"] },
  bluesky: {
    label: "Bluesky",
    pattern: /^(?=.{3,253}$)[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i,
    url: (h: string) => `https://bsky.app/profile/${h}`,
    domains: ["bsky.app"],
  },
  threads: { label: "Threads", pattern: /^[a-z0-9._]{1,30}$/i, url: (h: string) => `https://www.threads.net/@${h}`, domains: ["threads.net", "threads.com"] },
  tiktok: { label: "TikTok", pattern: /^[a-z0-9._]{2,24}$/i, url: (h: string) => `https://www.tiktok.com/@${h}`, domains: ["tiktok.com"] },
  youtube: { label: "YouTube", pattern: /^[a-z0-9._-]{3,30}$/i, url: (h: string) => `https://www.youtube.com/@${h}`, domains: ["youtube.com"] },
  github: {
    label: "GitHub",
    pattern: /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/i,
    url: (h: string) => `https://github.com/${h}`,
    domains: ["github.com"],
  },
  letterboxd: { label: "Letterboxd", pattern: /^[a-z0-9_]{2,15}$/i, url: (h: string) => `https://letterboxd.com/${h}`, domains: ["letterboxd.com"] },
  linkedin: { label: "LinkedIn", pattern: /^[a-z0-9-]{3,100}$/i, url: (h: string) => `https://www.linkedin.com/in/${h}`, domains: ["linkedin.com"] },
} as const;

export type Platform = keyof typeof PLATFORMS;
export const PLATFORM_KEYS = Object.keys(PLATFORMS) as Platform[];
export const MAX_SOCIALS = 3;

/** Plataformas em que conseguimos confirmar que o perfil é da pessoa (API pública). */
export const VERIFIABLE: Platform[] = ["github", "bluesky"];

export type SocialLink = {
  platform: Platform;
  handle: string;
  /** true quando o perfil da rede tem um link de volta para o perfil na Estante. */
  verified: boolean;
};

export function socialUrl(link: Pick<SocialLink, "platform" | "handle">) {
  return PLATFORMS[link.platform].url(link.handle);
}

/**
 * Transforma o que a pessoa digitou em @ limpo: aceita "@fulano", "fulano" ou a URL da própria rede.
 * Devolve null se o formato não for válido para a plataforma ou se a URL for de outro site.
 */
export function parseHandle(platform: Platform, input: string): string | null {
  const def = PLATFORMS[platform];
  let value = input.trim();
  if (!value) return null;

  if (/^(https?:)?\/\//i.test(value) || /^[a-z0-9.-]+\.[a-z]{2,}\//i.test(value)) {
    let url: URL;
    try {
      url = new URL(/^https?:/i.test(value) ? value : `https://${value.replace(/^\/\//, "")}`);
    } catch {
      return null;
    }
    const host = url.hostname.replace(/^(www|m|mobile)\./, "").toLowerCase();
    if (!(def.domains as readonly string[]).includes(host)) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const segment = platform === "bluesky" ? parts[1] : platform === "linkedin" ? parts[1] : parts[0];
    if (!segment) return null;
    value = segment;
  }

  value = value.replace(/^@/, "");
  if (platform === "bluesky") value = value.toLowerCase();
  return def.pattern.test(value) ? value : null;
}
