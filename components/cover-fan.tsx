"use client";

import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";

import { getFollowingPicks } from "@/app/actions";
import { BookCover } from "@/components/book-cover";
import { coverUrl, type Book } from "@/lib/books";
import { useAuth } from "@/lib/auth";
import { useLibrary, useLibraryLoading } from "@/lib/library";
import { fanOrder, rank, seededRandom, tasteFrom, type FollowedPick, type ShelfSignal } from "@/lib/recommend";

/** O mínimo de cada livro que o leque precisa (sem sinopse: payload menor). */
export type FanBook = Pick<Book, "id" | "title" | "author" | "coverId" | "color" | "year" | "pages" | "genres">;

const SLOTS = 7;
const ROTATE_EVERY = 6500;

/**
 * Leque de capas do hero.
 * - Recomenda: com sinais (estante ou quem a pessoa segue), as capas são escolhidas para ela.
 * - Gira: a cada poucos segundos uma capa vira e dá lugar a outra. Pausa com o mouse em cima,
 *   com a aba em segundo plano e para quem prefere menos movimento. A imagem nova é carregada antes.
 * - Reage ao mouse: a capa vem para a frente, endireita, inclina na direção do cursor.
 * O servidor manda um leque inicial (varia com o tempo); a personalização entra depois, no navegador.
 */
export function CoverFan({ initial, catalog }: { initial: FanBook[]; catalog: FanBook[] }) {
  const auth = useAuth();
  const library = useLibrary();
  const libraryLoading = useLibraryLoading();

  const [slots, setSlots] = useState(initial);
  const [versions, setVersions] = useState<number[]>(() => initial.map(() => 0));
  const [personal, setPersonal] = useState<null | "estante" | "seguindo">(null);
  const [picks, setPicks] = useState<FollowedPick[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 30 });
  const queue = useRef<FanBook[]>([]);
  // Cópia do leque atual para os efeitos lerem sem depender do estado (e sem efeito colateral em updater).
  const current = useRef(initial);

  function place(next: FanBook[]) {
    const prev = current.current;
    current.current = next;
    setSlots(next);
    setVersions((v) => v.map((n, i) => (prev[i]?.id === next[i]?.id ? n : n + 1)));
  }
  const reduced = useRef(false);
  // Semente por visita: o sorteio muda a cada visita, mas fica estável durante ela.
  const [seed] = useState(() => Math.floor(Math.random() * 2 ** 31));

  const followingCount = auth.status === "user" ? auth.following.length : 0;

  // Favoritos de quem a pessoa segue (uma chamada leve, só se ela segue alguém).
  useEffect(() => {
    if (auth.status !== "user" || !followingCount) return;
    let cancelled = false;
    void getFollowingPicks()
      .then((p) => !cancelled && setPicks(p))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [auth.status, followingCount]);

  const ready = auth.status !== "loading" && !libraryLoading;

  const ranked = useMemo(() => {
    if (!ready) return null;
    const byId = new Map<string, FanBook>(catalog.map((b) => [b.id, b]));
    for (const p of picks) if (!byId.has(p.id)) byId.set(p.id, { ...p, genres: [] });
    const pool = [...byId.values()] as Book[];

    const shelf: ShelfSignal[] = Object.values(library).map((e) => ({
      bookId: e.book.id,
      author: e.book.author,
      status: e.status,
      rating: e.rating,
      liked: e.liked,
    }));
    const taste = tasteFrom(shelf, byId as Map<string, Book>);
    const fans = new Map(picks.map((p) => [p.id, p.fans]));
    return { list: rank(pool, taste, fans, seededRandom(seed)), hasSignals: shelf.length > 0 || picks.length > 0 };
  }, [ready, catalog, picks, library, seed]);

  // Aplica a recomendação uma vez por mudança de sinais: as melhores no centro, o resto vira fila de rotação.
  useEffect(() => {
    if (!ranked) return;
    const list = ranked.list.map((r) => r.book as FanBook);
    if (!ranked.hasSignals) {
      // Sem sinais: mantém o leque do servidor e gira pelo catálogo.
      const shown = new Set(current.current.map((b) => b.id));
      queue.current = list.filter((b) => !shown.has(b.id));
      return;
    }
    const top = fanOrder(list.slice(0, SLOTS));
    if (top.length < SLOTS) return;
    queue.current = list.slice(SLOTS);
    place(top);
    setPersonal(ranked.list.slice(0, SLOTS).some((r) => r.reason === "seguindo") ? "seguindo" : "estante");
  }, [ranked]);

  // Rotação: troca uma capa das pontas ou do meio (nunca a que está sob o mouse).
  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced.current) return;
    const timer = setInterval(async () => {
      if (document.hidden || active !== null || !queue.current.length) return;
      const next = queue.current.shift()!;
      // Carrega a imagem antes de trocar, para a capa nunca aparecer vazia no meio do giro.
      const url = coverUrl(next.coverId, "L");
      if (url) {
        const img = new Image();
        img.src = url;
        await img.decode().catch(() => {});
      }
      const prev = current.current;
      if (prev.some((b) => b.id === next.id)) return;
      const slot = Math.floor(Math.random() * SLOTS);
      queue.current.push(prev[slot]);
      const copy = [...prev];
      copy[slot] = next;
      place(copy);
    }, ROTATE_EVERY);
    return () => clearInterval(timer);
  }, [active]);

  function onMove(e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse" || reduced.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTilt({ rx: (0.5 - y) * 16, ry: (x - 0.5) * 18, gx: x * 100, gy: y * 100 });
  }

  function leave() {
    setActive(null);
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 30 });
  }

  const mid = (SLOTS - 1) / 2;

  return (
    <>
      <div
        className="relative mx-auto mt-14 flex max-w-5xl items-end justify-center px-4 [perspective:1400px] sm:mt-20"
        onPointerLeave={leave}
        aria-hidden
      >
        {slots.map((book, i) => {
          const d = i - mid;
          const isActive = active === i;
          const gap = active === null || isActive ? 0 : Math.sign(i - active) * (28 / Math.abs(i - active));
          const rest = `translate(${gap}px, ${Math.abs(d) ** 1.6 * 10}px) rotate(${d * 4}deg)`;
          const lifted = `translate(0px, -22px) rotate(0deg) scale(1.12) translateZ(60px)`;

          return (
            <Link
              key={i}
              href={`/livro/${book.id}`}
              tabIndex={-1}
              onPointerEnter={() => setActive(i)}
              onPointerMove={isActive ? onMove : undefined}
              className="w-[22%] shrink-0 [transform-style:preserve-3d] [&:nth-child(1)]:hidden [&:nth-child(7)]:hidden sm:w-[16%] sm:[&:nth-child(1)]:block sm:[&:nth-child(7)]:block"
              style={{
                marginInline: "-1.2%",
                zIndex: isActive ? 30 : 10 - Math.abs(d),
                transform: isActive ? lifted : rest,
                transition: "transform 520ms cubic-bezier(0.22, 1.2, 0.36, 1)",
              }}
            >
              <div
                className="relative rounded-[3px_6px_6px_3px] [transform-style:preserve-3d]"
                style={{
                  transform: isActive ? `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)` : "none",
                  transition: isActive ? "transform 120ms ease-out" : "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                {/* A chave muda quando a capa troca: o livro novo entra virando, como uma carta. */}
                <div key={`${book.id}-${versions[i]}`} className={versions[i] ? "animate-flip-in" : undefined}>
                  <BookCover
                    book={book}
                    size="L"
                    priority
                    className={isActive ? "shadow-[0_30px_60px_-18px_rgb(0_0_0/0.55),0_12px_24px_-12px_rgb(0_0_0/0.4)]" : undefined}
                  />
                </div>
                <span
                  className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
                  style={{
                    opacity: isActive ? 1 : 0,
                    background: `radial-gradient(circle at ${tilt.gx}% ${tilt.gy}%, rgb(255 255 255 / 0.28), transparent 55%)`,
                    mixBlendMode: "soft-light",
                  }}
                />
              </div>
            </Link>
          );
        })}
      </div>
      <p
        className="mt-6 flex h-5 items-center justify-center gap-1.5 text-[0.8125rem] text-ink-3 transition-opacity duration-500"
        style={{ opacity: personal ? 1 : 0 }}
        aria-live="polite"
      >
        {personal && (
          <>
            <Sparkles className="size-3.5 text-ambar" aria-hidden />
            {personal === "seguindo"
              ? "Escolhidos para você, pelo que você e quem você segue leem"
              : "Escolhidos para você, pelo que está na sua estante"}
          </>
        )}
      </p>
    </>
  );
}
