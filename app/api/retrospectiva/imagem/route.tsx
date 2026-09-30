import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { formatRating } from "@/lib/format";
import { Cover, coverDataUrl, loadFonts, Mark } from "@/lib/og";
import { retrospectiveOf } from "@/lib/retrospective";
import { currentProfileId } from "@/lib/session";

/**
 * Imagem da retrospectiva para compartilhar: ?ano=2026&f=story|post.
 * Só a própria pessoa gera a dela (os números da estante podem ser de um perfil privado),
 * e a resposta não fica em cache público.
 */

export const runtime = "nodejs";

const SIZES = { story: [1080, 1920], post: [1080, 1350] } as const;

export async function GET(req: NextRequest) {
  const me = await currentProfileId();
  if (!me || !db) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const year = Number(req.nextUrl.searchParams.get("ano"));
  const format = req.nextUrl.searchParams.get("f") === "post" ? "post" : "story";
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const [retro, profile] = await Promise.all([
    retrospectiveOf(me, year),
    db.query.profiles.findFirst({ where: eq(profiles.id, me), columns: { handle: true } }),
  ]);
  if (!retro || !profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [width, height] = SIZES[format];
  const story = format === "story";
  const { basic } = retro;
  const tiles = basic.covers.slice(0, story ? 9 : 6);
  const covers = await Promise.all(tiles.map((b) => coverDataUrl(b.coverId, "M")));
  const tile = story ? 250 : 220;
  const goalPct = basic.goal ? Math.min(100, Math.round((basic.booksRead / basic.goal) * 100)) : null;

  const stats = [
    basic.pagesKnown ? { value: basic.pagesRead.toLocaleString("pt-BR"), label: "páginas" } : null,
    basic.avgRating !== null ? { value: formatRating(basic.avgRating), label: "nota média (de 5)" } : null,
    goalPct !== null ? { value: `${goalPct}%`, label: `da meta de ${basic.goal}` } : null,
  ].filter((s): s is { value: string; label: string } => s !== null);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: story ? "110px 90px 90px" : "80px 80px 70px",
          background: "linear-gradient(160deg, #2a2378 0%, #16133d 45%, #0b0b0d 100%)",
          color: "#f5f5f7",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mark size={52} />
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, letterSpacing: "-0.03em" }}>Estante</div>
        </div>

        <div style={{ display: "flex", marginTop: story ? 80 : 50, fontSize: story ? 44 : 38, color: "rgba(245,245,247,0.7)", fontWeight: 600 }}>
          {retro.inProgress ? `Minha leitura em ${year}, até agora` : `Minha leitura em ${year}`}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 10 }}>
          <div style={{ display: "flex", fontSize: story ? 260 : 200, fontWeight: 700, letterSpacing: "-0.06em", lineHeight: 1 }}>{String(basic.booksRead)}</div>
          <div style={{ display: "flex", fontSize: story ? 56 : 46, fontWeight: 600, color: "#8f89ff" }}>{basic.booksRead === 1 ? "livro lido" : "livros lidos"}</div>
        </div>

        {stats.length > 0 && (
          <div style={{ display: "flex", gap: story ? 56 : 44, marginTop: story ? 50 : 36 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: story ? 58 : 48, fontWeight: 700 }}>{s.value}</div>
                <div style={{ display: "flex", fontSize: story ? 28 : 24, color: "rgba(245,245,247,0.6)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {tiles.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 22, marginTop: story ? 70 : 44, width: tile * 3 + 44 }}>
            {tiles.map((b, i) => (
              <Cover key={b.id} src={covers[i]} title={b.title} color={b.color} width={tile} />
            ))}
          </div>
        )}

        <div style={{ display: "flex", flex: 1 }} />
        {basic.topRated && (
          <div style={{ display: "flex", fontSize: story ? 32 : 28, color: "rgba(245,245,247,0.75)" }}>
            {`Favorito do ano: ${basic.topRated.title}`}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18, fontSize: story ? 28 : 24, color: "rgba(245,245,247,0.55)" }}>
          <div style={{ display: "flex" }}>{`@${profile.handle}`}</div>
          <div style={{ display: "flex" }}>{req.nextUrl.host}</div>
        </div>
      </div>
    ),
    { width, height, fonts: await loadFonts(), headers: { "Cache-Control": "private, no-store" } },
  );
}
