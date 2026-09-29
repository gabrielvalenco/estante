import "server-only";

import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";


/**
 * Fotos de perfil. Toda foto vira um quadrado de 256px em WebP (uns 10 a 25 KB), sem metadados
 * (sharp descarta EXIF, então nada de GPS ou modelo do celular). Guardadas no Vercel Blob com
 * cache longo: cada troca gera um endereço novo e a foto antiga é apagada.
 *
 * Sem BLOB_READ_WRITE_TOKEN: em desenvolvimento salva em public/uploads/avatars; em produção
 * o envio de foto fica desligado (as iniciais continuam aparecendo).
 */

// sharp (binário nativo) e o SDK do Blob só carregam quando uma foto é processada. Importados no topo,
// uma falha deles derrubaria tudo que importa este arquivo, inclusive o login (auth.ts).
const loadSharp = async () => (await import("sharp")).default;
const loadBlob = () => import("@vercel/blob");

export const AVATAR_SIZE = 256;
/** O navegador já manda a foto recortada e reduzida; isto é só o teto para quem chamar a action direto. */
export const AVATAR_MAX_BYTES = 900 * 1024;

const ACCEPTED = new Set(["jpeg", "png", "webp", "gif", "avif", "heif"]);
const LOCAL_DIR = path.join(process.cwd(), "public", "uploads", "avatars");
const LOCAL_PREFIX = "/uploads/avatars/";

export type AvatarStorage = "blob" | "local" | null;

export function avatarStorage(): AvatarStorage {
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  if (process.env.NODE_ENV === "development") return "local";
  return null;
}

/** Confere pelo conteúdo (não pela extensão) que é uma imagem e devolve o quadrado 256px em WebP. */
export async function optimizeAvatar(input: Buffer): Promise<Buffer | null> {
  try {
    // limitInputPixels barra "bombas" de descompressão; só o primeiro quadro de GIF animado.
    const sharp = await loadSharp();
    const image = sharp(input, { limitInputPixels: 50_000_000 });
    const meta = await image.metadata();
    if (!meta.format || !ACCEPTED.has(meta.format)) return null;
    return await image
      .rotate() // respeita a orientação da câmera antes de descartar o EXIF
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover", position: "attention" })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch (err) {
    console.error("[avatars] falha ao processar imagem", err);
    return null;
  }
}

/** Guarda a foto já otimizada e devolve o endereço público. */
export async function storeAvatar(profileId: string, webp: Buffer): Promise<string | null> {
  const storage = avatarStorage();
  const name = `${profileId}-${randomBytes(6).toString("hex")}.webp`;
  if (storage === "blob") {
    const { put } = await loadBlob();
    const blob = await put(`avatars/${name}`, webp, {
      access: "public",
      contentType: "image/webp",
      cacheControlMaxAge: 60 * 60 * 24 * 365, // endereço muda a cada troca, então pode ficar em cache
    });
    return blob.url;
  }
  if (storage === "local") {
    await mkdir(LOCAL_DIR, { recursive: true });
    await writeFile(path.join(LOCAL_DIR, name), webp);
    return LOCAL_PREFIX + name;
  }
  return null;
}

/** Apaga uma foto guardada por nós. Endereços de fora são ignorados; falhas não quebram o fluxo. */
export async function deleteAvatar(url: string | null | undefined) {
  if (!url) return;
  try {
    if (url.startsWith(LOCAL_PREFIX)) {
      const file = path.basename(url);
      if (/^[\w-]+\.webp$/.test(file)) await unlink(path.join(LOCAL_DIR, file));
    } else if (process.env.BLOB_READ_WRITE_TOKEN && new URL(url).hostname.endsWith(".blob.vercel-storage.com")) {
      const { del } = await loadBlob();
      await del(url);
    }
  } catch {
    // arquivo já não existia: nada a fazer
  }
}

/**
 * Endereços de foto aceitos dos provedores de login. Lista fechada: o servidor só busca imagem
 * nesses hosts, então um endereço forjado não faz o servidor acessar a rede interna (SSRF).
 */
function providerImageUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.port) return null;
  if (url.hostname === "avatars.githubusercontent.com") {
    url.searchParams.set("s", String(AVATAR_SIZE)); // pede já no tamanho certo
    return url;
  }
  if (/^lh\d\.googleusercontent\.com$/.test(url.hostname)) {
    // Google devolve "...=s96-c"; troca pelo tamanho que usamos.
    url.pathname = url.pathname.replace(/=s\d+(-c)?$/, `=s${AVATAR_SIZE}-c`);
    return url;
  }
  return null;
}

/** Baixa a foto do Google/GitHub, otimiza e guarda do nosso lado. Devolve null se algo falhar. */
export async function importProviderAvatar(profileId: string, image: string): Promise<string | null> {
  if (!avatarStorage()) return null;
  const url = providerImageUrl(image);
  if (!url) return null;
  try {
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) return null;
    if (Number(res.headers.get("content-length") ?? 0) > 5 * 1024 * 1024) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > 5 * 1024 * 1024) return null;
    const webp = await optimizeAvatar(bytes);
    return webp ? await storeAvatar(profileId, webp) : null;
  } catch (err) {
    console.error("[avatars] falha ao importar foto do provedor", err);
    return null;
  }
}

/**
 * A foto como data URL PNG, para imagens geradas com next/og (o satori não lê WebP).
 * Só lê fotos guardadas por nós: disco local em desenvolvimento ou o Vercel Blob.
 */
export async function avatarPngDataUrl(url: string | null | undefined, size: number): Promise<string | null> {
  if (!url) return null;
  try {
    let bytes: Buffer;
    if (url.startsWith(LOCAL_PREFIX)) {
      const file = path.basename(url);
      if (!/^[\w-]+\.webp$/.test(file)) return null;
      bytes = await readFile(path.join(LOCAL_DIR, file));
    } else {
      if (!new URL(url).hostname.endsWith(".blob.vercel-storage.com")) return null;
      const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) return null;
      bytes = Buffer.from(await res.arrayBuffer());
    }
    const sharp = await loadSharp();
    const png = await sharp(bytes).resize(size, size, { fit: "cover" }).png().toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
