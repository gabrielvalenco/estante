"use client";

import { BookOpen, Bookmark, Check, PenLine } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

import { LikeButton } from "@/components/like-button";
import { LogDialog } from "@/components/log-dialog";
import { StarInput } from "@/components/stars";
import { Button } from "@/components/ui/button";
import type { Book } from "@/lib/books";
import { saveEntry, STATUS_LABEL, useEntry, type Status } from "@/lib/library";
import { cn } from "@/lib/utils";

export const STATUS_STYLE: Record<Status, { icon: typeof Check; active: string; soft: string; text: string }> = {
  "quero-ler": { icon: Bookmark, active: "bg-anil text-white", soft: "bg-anil-soft", text: "text-anil" },
  lendo: { icon: BookOpen, active: "bg-ameixa text-white", soft: "bg-ameixa-soft", text: "text-ameixa" },
  lido: { icon: Check, active: "bg-musgo text-white", soft: "bg-musgo-soft", text: "text-musgo" },
};

const TOAST: Record<Status, string> = {
  "quero-ler": "Guardado em Quero ler",
  lendo: "Boa leitura!",
  lido: "Marcado como lido",
};

/** Painel de ações da página do livro. Tudo é salvo na hora, sem botão de "salvar". */
export function BookActions({ book }: { book: Book }) {
  const entry = useEntry(book.id);
  const status = entry?.status ?? null;

  function setStatus(next: Status) {
    const value = status === next ? null : next;
    saveEntry(book, {
      status: value,
      finishedOn: value === "lido" ? (entry?.finishedOn ?? new Date().toISOString().slice(0, 10)) : entry?.finishedOn ?? null,
    });
    if (value) toast(TOAST[value], { description: book.title });
    else toast("Removido da sua estante", { description: book.title });
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div role="group" aria-label="Status de leitura" className="grid grid-cols-3 gap-2">
        {(Object.keys(STATUS_LABEL) as Status[]).map((s) => {
          const Icon = STATUS_STYLE[s].icon;
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(s)}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-1 rounded-xl text-[0.8125rem] font-medium transition-colors duration-200 active:scale-[0.97]",
                active ? "text-white" : "bg-sunken text-ink-2 hover:bg-line",
              )}
            >
              {active && (
                <motion.span
                  layoutId={`status-${book.id}`}
                  className={cn("absolute inset-0 rounded-xl", STATUS_STYLE[s].active)}
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <Icon className="relative size-5" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
              <span className="relative">{STATUS_LABEL[s]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-ink-3">Sua nota</p>
          <StarInput
            size={30}
            value={entry?.rating ?? null}
            onChange={(rating) => {
              saveEntry(book, {
                rating,
                // Dar nota implica que leu, a menos que esteja lendo agora.
                status: rating && status !== "lendo" ? "lido" : status,
                finishedOn: rating && !entry?.finishedOn ? new Date().toISOString().slice(0, 10) : entry?.finishedOn ?? null,
              });
            }}
          />
        </div>
        <LikeButton
          liked={Boolean(entry?.liked)}
          onToggle={() => saveEntry(book, { liked: !entry?.liked })}
        />
      </div>

      <LogDialog
        book={book}
        trigger={
          <Button variant="secondary" className="mt-5 w-full">
            <PenLine data-icon="inline-start" />
            {entry?.review ? "Editar review" : "Registrar leitura ou review"}
          </Button>
        }
      />
    </div>
  );
}
