"use client";

import { useState } from "react";

/** Foto por cima das iniciais. Se não carregar, some e as iniciais aparecem. */
export function AvatarPhoto({ src, size }: { src: string; size: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // Já é um WebP de 256px servido com cache longo: o otimizador do Next não ganharia nada.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className="absolute inset-0 size-full object-cover"
    />
  );
}
