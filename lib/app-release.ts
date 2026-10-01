import "server-only";

/**
 * O APK do app fica nos Releases do GitHub (repositório público estante-app). O endereço de
 * download nunca muda: sempre entrega o mais novo. A versão e o tamanho vêm da API do GitHub,
 * com cache de 1 hora; sem release publicado (ou com a API fora), a página mostra "em breve".
 */
export const APP_DOWNLOAD_URL = "https://github.com/gabrielvalenco/estante-app/releases/latest/download/estante.apk";

export type AppRelease = { version: string; sizeMb: number; publishedAt: string };

export async function latestAppRelease(): Promise<AppRelease | null> {
  try {
    const r = await fetch("https://api.github.com/repos/gabrielvalenco/estante-app/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const data = (await r.json()) as { tag_name?: string; published_at?: string; assets?: { name: string; size: number }[] };
    const apk = data.assets?.find((a) => a.name === "estante.apk");
    if (!data.tag_name || !apk) return null;
    return { version: data.tag_name.replace(/^v/, ""), sizeMb: Math.round((apk.size / 1024 / 1024) * 10) / 10, publishedAt: data.published_at ?? "" };
  } catch {
    return null;
  }
}
