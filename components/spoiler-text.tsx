"use client";

import { EyeOff } from "lucide-react";
import { useState } from "react";

/** Review com spoiler fica escondida até a pessoa escolher ler. */
export function SpoilerText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  if (open) return <p className="animate-in fade-in-0 duration-300">{text}</p>;
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex items-center gap-2 rounded-full bg-sunken px-3 py-1.5 text-[0.8125rem] font-medium text-ink-2 transition-colors hover:bg-line"
    >
      <EyeOff className="size-3.5" aria-hidden />
      Esta review tem spoiler. Mostrar mesmo assim
    </button>
  );
}
