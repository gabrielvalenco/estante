"use client";

import { useState, type ReactElement } from "react";
import { toast } from "sonner";

import { LikeButton } from "@/components/like-button";
import { BookCover } from "@/components/book-cover";
import { DatePicker, type DayMark } from "@/components/date-picker";
import { StarInput } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { Book } from "@/lib/books";
import { todayISO } from "@/lib/dates";
import { saveEntry, useEntry, useLibrary } from "@/lib/library";

const MAX = 600;

/** Registrar uma leitura: data, nota, curtida e review. Salvar marca o livro como lido. */
export function LogDialog({ book, trigger }: { book: Book; trigger: ReactElement }) {
  const entry = useEntry(book.id);
  const [open, setOpen] = useState(false);
  const library = useLibrary();
  const today = todayISO();

  const [date, setDate] = useState(today);
  const [rating, setRating] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [review, setReview] = useState("");

  // Outras leituras terminadas viram pontinhos no calendário, na cor da capa.
  const marks = new Map<string, DayMark[]>();
  for (const e of Object.values(library)) {
    if (e.status !== "lido" || !e.finishedOn || e.book.id === book.id) continue;
    marks.set(e.finishedOn, [...(marks.get(e.finishedOn) ?? []), { title: e.book.title, color: e.book.color }]);
  }

  function onOpenChange(next: boolean) {
    if (next) {
      // Abre sempre com o que já está salvo.
      setDate(entry?.finishedOn ?? today);
      setRating(entry?.rating ?? null);
      setLiked(entry?.liked ?? false);
      setReview(entry?.review ?? "");
    }
    setOpen(next);
  }

  function save() {
    saveEntry(book, { status: "lido", finishedOn: date, rating, liked, review: review.trim() });
    setOpen(false);
    toast(review.trim() ? "Review publicada na sua estante" : "Leitura registrada", { description: book.title });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      {/* No celular o diálogo é mais alto que a tela: cabeçalho e botões ficam fixos e só o meio rola. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-3xl p-0 sm:max-w-lg">
        <div className="flex gap-4 border-b border-line p-5 pr-12">
          <BookCover book={book} size="M" className="w-12 shrink-0" priority />
          <div className="min-w-0">
            <DialogTitle className="text-lg leading-tight font-semibold tracking-tight">Registrar leitura</DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-ink-3">
              {book.title} · {book.author}
            </DialogDescription>
          </div>
        </div>

        <div className="grid content-start gap-5 overflow-y-auto overscroll-contain p-5">
          <div className="grid gap-1.5">
            <span className="text-xs font-medium text-ink-3">Terminei em</span>
            <DatePicker label="Terminei em" value={date} max={today} onChange={setDate} marks={marks} />
          </div>

          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-ink-3">Nota</p>
              <StarInput value={rating} onChange={setRating} size={34} />
            </div>
            <LikeButton liked={liked} onToggle={() => setLiked((v) => !v)} />
          </div>

          <label className="grid gap-1.5">
            <span className="flex justify-between text-xs font-medium text-ink-3">
              Review <span className="tnum font-normal text-ink-4">{review.length}/{MAX}</span>
            </span>
            <Textarea
              value={review}
              maxLength={MAX}
              onChange={(e) => setReview(e.target.value)}
              placeholder="O que ficou na sua cabeça? Pode ser uma frase só."
              className="min-h-28 rounded-xl px-3 py-2.5 text-[0.9375rem] md:text-[0.9375rem]"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-line p-4">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={save}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
