import { readFile } from "node:fs/promises";
import path from "node:path";

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

import { avatarPngDataUrl } from "@/lib/avatars";
import { coverUrl } from "@/lib/books";
import { reviewByHandle } from "@/lib/db/queries";
import { relationship } from "@/lib/db/social";
import { formatRating } from "@/lib/format";
import { currentProfileId } from "@/lib/session";

/**
 * Imagem de compartilhamento de uma avaliação, no estilo Letterboxd.
 *   ?u=handle&b=OL123W&f=story|post|og
 * story 1080x1920 (Stories), post 1080x1350 (feed 4:5), og 1200x630 (prévia de link).
 * Perfil privado: só a própria pessoa e seguidores aprovados veem a review; para o resto
 * (inclusive robôs de prévia de link) sai um cartão sem o conteúdo.
 */

export const runtime = "nodejs";

const SIZES = { story: [1080, 1920], post: [1080, 1350], og: [1200, 630] } as const;
type Format = keyof typeof SIZES;

const TONES: Record<string, { bg: string; fg: string }> = {
  anil: { bg: "#1f1d45", fg: "#8f89ff" },
  ameixa: { bg: "#35172f", fg: "#e27ed4" },
  musgo: { bg: "#13301f", fg: "#5cc88a" },
  ambar: { bg: "#33250b", fg: "#f7b955" },
};

const STAR = "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z";

let fonts: { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" }[] | null = null;
async function loadFonts() {
  if (fonts) return fonts;
  const dir = path.join(process.cwd(), "node_modules/@fontsource/inter/files");
  const [regular, semibold, bold] = await Promise.all(
    ["400", "600", "700"].map((w) => readFile(path.join(dir, `inter-latin-${w}-normal.woff`))),
  );
  fonts = [
    { name: "Inter", data: regular, weight: 400, style: "normal" },
    { name: "Inter", data: semibold, weight: 600, style: "normal" },
    { name: "Inter", data: bold, weight: 700, style: "normal" },
  ];
  return fonts;
}

/** Mistura a cor do livro com o preto da marca: fundo escuro, mas com a identidade da capa. */
function mix(hex: string, amount: number, base = "#0b0b0d") {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(base)];
  return `rgb(${a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount))).join(",")})`;
}

async function coverDataUrl(coverId: number | null) {
  const url = coverUrl(coverId, "L");
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    // Capa inexistente na Open Library vem como GIF de 1px.
    if (buf.length < 1000) return null;
    return `data:${res.headers.get("content-type") ?? "image/jpeg"};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Corta no fim de uma palavra, com reticências. */
function excerpt(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", max)).replace(/[,.;:!?-]+$/, "") + "…";
}

function Stars({ value, size }: { value: number; size: number }) {
  return (
    <div style={{ display: "flex", gap: size * 0.12 }}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <div key={i} style={{ display: "flex", position: "relative", width: size, height: size }}>
            <svg width={size} height={size} viewBox="0 0 24 24" style={{ position: "absolute" }}>
              <path d={STAR} fill="rgba(255,255,255,0.14)" />
            </svg>
            {fill > 0 && (
              <div style={{ display: "flex", position: "absolute", width: size * fill, height: size, overflow: "hidden" }}>
                <svg width={size} height={size} viewBox="0 0 24 24">
                  <path d={STAR} fill="#f5a524" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect x="3" y="2" width="26" height="28" rx="6" fill="#8f89ff" />
      <path d="M10 12a4 4 0 0 1 4-4h15v16a6 6 0 0 1-6 6H10z" fill="#e27ed4" />
      <path d="M17 18a4 4 0 0 1 4-4h8v10a6 6 0 0 1-6 6h-6z" fill="#5cc88a" />
      <path d="M5.5 2h4v8.5l-2-1.6-2 1.6z" fill="#f5a524" />
    </svg>
  );
}

function Cover({ src, title, color, width }: { src: string | null; title: string; color: string; width: number }) {
  const height = width * 1.5;
  const style = {
    display: "flex",
    width,
    height,
    borderRadius: width * 0.03,
    boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 8px 24px rgba(0,0,0,0.4)",
  } as const;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) só aceita <img>
    return <img src={src} alt="" width={width} height={height} style={{ ...style, objectFit: "cover" }} />;
  }
  return (
    <div style={{ ...style, backgroundColor: color, padding: width * 0.1, alignItems: "flex-start", color: "white", fontSize: width * 0.1, fontWeight: 700 }}>
      {title}
    </div>
  );
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const format: Format = (["story", "post", "og"] as const).find((f) => f === params.get("f")) ?? "og";
  const [width, height] = SIZES[format];
  const data = await reviewByHandle(params.get("u") ?? "", params.get("b") ?? "");
  const host = request.nextUrl.host;

  // Perfil privado: a review só aparece para a própria pessoa e seguidores aprovados.
  let allowed = Boolean(data && !data.profile.isPrivate);
  if (data && data.profile.isPrivate) {
    const me = await currentProfileId();
    allowed = me === data.profile.id || (me ? (await relationship(me, data.profile.id)).following : false);
  }

  const cacheControl = data && !data.profile.isPrivate ? "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800" : "private, no-store";
  const imageOptions = { width, height, fonts: await loadFonts(), headers: { "Cache-Control": cacheControl } };

  if (!data || !allowed) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", backgroundColor: "#0b0b0d", color: "#f5f5f7", fontFamily: "Inter", gap: 28 }}>
          <Mark size={format === "og" ? 90 : 140} />
          <div style={{ fontSize: format === "og" ? 48 : 64, fontWeight: 700, letterSpacing: "-0.03em" }}>Estante</div>
          <div style={{ fontSize: format === "og" ? 26 : 34, color: "#9d9da4" }}>{data ? "Esta avaliação é de um perfil privado." : "Avaliação não encontrada."}</div>
        </div>
      ),
      imageOptions,
    );
  }

  const { entry, profile } = data;
  const rating = entry.rating === null ? null : Number(entry.rating);
  const color = /^#[0-9a-f]{6}$/i.test(entry.bookColor) ? entry.bookColor : "#3a2fd6";
  const [cover, photo] = await Promise.all([coverDataUrl(entry.bookCoverId), avatarPngDataUrl(profile.avatarUrl, 160)]);
  const tone = TONES[profile.tone] ?? TONES.anil;
  const initials = profile.name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const verb = entry.review ? "escreveu sobre" : "avaliou";
  const background = `linear-gradient(165deg, ${mix(color, 0.55)} 0%, ${mix(color, 0.22)} 45%, #0b0b0d 100%)`;

  const User = ({ scale }: { scale: number }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 18 * scale }}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) só aceita <img>
        <img src={photo} alt="" width={64 * scale} height={64 * scale} style={{ borderRadius: 999 }} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 64 * scale, height: 64 * scale, borderRadius: 999, backgroundColor: tone.bg, color: tone.fg, fontSize: 26 * scale, fontWeight: 700 }}>
          {initials || "?"}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 30 * scale, fontWeight: 600, color: "#f5f5f7" }}>{profile.name}</div>
        <div style={{ display: "flex", fontSize: 24 * scale, color: "rgba(245,245,247,0.6)" }}>{`@${profile.handle} ${verb}`}</div>
      </div>
    </div>
  );

  const Brand = ({ scale }: { scale: number }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 14 * scale }}>
      <Mark size={44 * scale} />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 30 * scale, fontWeight: 700, color: "#f5f5f7", letterSpacing: "-0.03em" }}>Estante</div>
        <div style={{ fontSize: 20 * scale, color: "rgba(245,245,247,0.55)" }}>{host}</div>
      </div>
    </div>
  );

  const Review = ({ size, max }: { size: number; max: number }) =>
    entry.review ? (
      <div style={{ display: "flex", fontSize: size, lineHeight: 1.45, color: "rgba(245,245,247,0.9)" }}>{`“${excerpt(entry.review, max)}”`}</div>
    ) : null;

  if (format === "og") {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", backgroundImage: background, fontFamily: "Inter", padding: 60, gap: 56 }}>
          <Cover src={cover} title={entry.bookTitle} color={color} width={330} />
          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", paddingTop: 6 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <User scale={0.85} />
              <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: "#f5f5f7", letterSpacing: "-0.03em", lineHeight: 1.1 }}>{excerpt(entry.bookTitle, 60)}</div>
              <div style={{ display: "flex", fontSize: 26, color: "rgba(245,245,247,0.65)" }}>{entry.bookAuthor}</div>
              {rating !== null && <Stars value={rating} size={42} />}
              <Review size={26} max={150} />
            </div>
            <Brand scale={0.8} />
          </div>
        </div>
      ),
      imageOptions,
    );
  }

  const story = format === "story";
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          height: "100%",
          backgroundImage: background,
          fontFamily: "Inter",
          padding: story ? "120px 90px 110px" : "80px 90px 70px",
        }}
      >
        <User scale={story ? 1.1 : 1} />
        <div style={{ display: "flex", marginTop: story ? 80 : 50 }}>
          <Cover src={cover} title={entry.bookTitle} color={color} width={story ? 520 : 400} />
        </div>
        <div style={{ display: "flex", marginTop: story ? 70 : 44, fontSize: story ? 60 : 52, fontWeight: 700, color: "#f5f5f7", letterSpacing: "-0.03em", textAlign: "center", lineHeight: 1.1 }}>
          {excerpt(entry.bookTitle, 70)}
        </div>
        <div style={{ display: "flex", marginTop: 14, fontSize: story ? 32 : 28, color: "rgba(245,245,247,0.65)" }}>
          {`${entry.bookAuthor}${entry.bookYear ? ` · ${entry.bookYear}` : ""}`}
        </div>
        {rating !== null && (
          <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: story ? 44 : 30 }}>
            <Stars value={rating} size={story ? 64 : 54} />
            <div style={{ fontSize: story ? 44 : 38, fontWeight: 700, color: "#f5a524" }}>{formatRating(rating)}</div>
          </div>
        )}
        {entry.review && (
          <div style={{ display: "flex", marginTop: story ? 50 : 32, textAlign: "center", justifyContent: "center" }}>
            <Review size={story ? 36 : 30} max={story ? 330 : 170} />
          </div>
        )}
        <div style={{ display: "flex", flex: 1 }} />
        <Brand scale={story ? 1.15 : 1} />
      </div>
    ),
    imageOptions,
  );
}
