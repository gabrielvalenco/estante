"use client";

import Link from "next/link";
import { useRef, useState, type PointerEvent } from "react";

import { BookCover } from "@/components/book-cover";
import type { Book } from "@/lib/books";

/**
 * Leque de capas do hero, como cartas na mão.
 * Ao passar o mouse, a capa vem para a frente, endireita, sobe e inclina na direção
 * do cursor (com um reflexo de luz acompanhando). As vizinhas abrem espaço.
 * Duas camadas: a externa cuida de posição e elevação (transição lenta, com mola);
 * a interna só da inclinação (transição curta, para seguir o mouse sem atraso).
 */
export function CoverFan({ books }: { books: Book[] }) {
  const [active, setActive] = useState<number | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, gx: 50, gy: 30 });
  const reduced = useRef<boolean | null>(null);
  const mid = (books.length - 1) / 2;

  function prefersReducedMotion() {
    reduced.current ??= window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return reduced.current;
  }

  function onMove(e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    setTilt({ rx: (0.5 - y) * 16, ry: (x - 0.5) * 18, gx: x * 100, gy: y * 100 });
  }

  function leave() {
    setActive(null);
    setTilt({ rx: 0, ry: 0, gx: 50, gy: 30 });
  }

  return (
    <div
      className="relative mx-auto mt-14 flex max-w-5xl items-end justify-center px-4 [perspective:1400px] sm:mt-20"
      onPointerLeave={leave}
      aria-hidden
    >
      {books.map((book, i) => {
        const d = i - mid;
        const isActive = active === i;
        // Vizinhas se afastam da capa ativa; quanto mais perto, mais se afastam.
        const gap = active === null || isActive ? 0 : Math.sign(i - active) * (28 / Math.abs(i - active));

        const rest = `translate(${gap}px, ${Math.abs(d) ** 1.6 * 10}px) rotate(${d * 4}deg)`;
        const lifted = `translate(0px, -22px) rotate(0deg) scale(1.12) translateZ(60px)`;

        return (
          <Link
            key={book.id}
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
              <BookCover
                book={book}
                size="L"
                priority
                className={isActive ? "shadow-[0_30px_60px_-18px_rgb(0_0_0/0.55),0_12px_24px_-12px_rgb(0_0_0/0.4)]" : undefined}
              />
              {/* Reflexo de luz que acompanha o cursor. */}
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
  );
}
