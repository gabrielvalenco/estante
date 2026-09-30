import { readFile } from "node:fs/promises";
import path from "node:path";

import { coverUrl } from "@/lib/books";

/** Peças das imagens geradas com next/og (satori): fontes, capa, estrelas e a marca. */

const STAR = "M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95z";

let fonts: { name: string; data: Buffer; weight: 400 | 600 | 700; style: "normal" }[] | null = null;
export async function loadFonts() {
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
export function mix(hex: string, amount: number, base = "#0b0b0d") {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(base)];
  return `rgb(${a.map((v, i) => Math.round(v * amount + b[i] * (1 - amount))).join(",")})`;
}

export async function coverDataUrl(coverId: number | null, size: "M" | "L" = "L") {
  const url = coverUrl(coverId, size);
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
export function excerpt(text: string, max: number) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return clean.slice(0, clean.lastIndexOf(" ", max)).replace(/[,.;:!?-]+$/, "") + "…";
}

export function Stars({ value, size }: { value: number; size: number }) {
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

export function Mark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <rect x="3" y="2" width="26" height="28" rx="6" fill="#8f89ff" />
      <path d="M10 12a4 4 0 0 1 4-4h15v16a6 6 0 0 1-6 6H10z" fill="#e27ed4" />
      <path d="M17 18a4 4 0 0 1 4-4h8v10a6 6 0 0 1-6 6h-6z" fill="#5cc88a" />
      <path d="M5.5 2h4v8.5l-2-1.6-2 1.6z" fill="#f5a524" />
    </svg>
  );
}

export function Cover({ src, title, color, width }: { src: string | null; title: string; color: string; width: number }) {
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
