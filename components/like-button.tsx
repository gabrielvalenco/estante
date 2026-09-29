"use client";

import { Heart } from "lucide-react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

export function LikeButton({ liked, onToggle }: { liked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={liked}
      aria-label={liked ? "Descurtir o livro" : "Curtir o livro"}
      className={cn(
        "inline-flex size-12 items-center justify-center rounded-full transition-colors",
        liked ? "bg-ameixa-soft text-ameixa" : "bg-sunken text-ink-3 hover:text-ink-2",
      )}
    >
      <motion.span key={String(liked)} initial={liked ? { scale: 0.6 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 600, damping: 14 }}>
        <Heart className={cn("size-[22px]", liked && "fill-current")} aria-hidden />
      </motion.span>
    </button>
  );
}
