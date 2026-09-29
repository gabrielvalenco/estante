"use client";

import { BookMarked, Copy, NotebookPen, Pencil, Plus, Quote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  createAnnotationAction,
  deleteAnnotationAction,
  getReadingData,
  setProgressAction,
  updateAnnotationAction,
  type Annotation,
  type AnnotationError,
  type ReadingData,
} from "@/app/reading-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, useAuthFlags } from "@/lib/auth";
import type { Book } from "@/lib/books";
import { todayISO } from "@/lib/dates";
import { saveEntry, useEntry } from "@/lib/library";
import { cn } from "@/lib/utils";

type BookRef = Pick<Book, "id" | "title" | "author" | "coverId" | "color">;

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none placeholder:text-ink-4 focus:border-line-strong focus:shadow-[0_0_0_4px_var(--anil-soft)] aria-invalid:border-destructive";

export const LIMIT_MESSAGE: Record<"limit_quotes" | "limit_notes", (planName: string, limit: number | null) => string> = {
  limit_quotes: (plan, n) => `O plano ${plan} guarda até ${n} citações. No Capa Dura, as citações são ilimitadas.`,
  limit_notes: (plan, n) => `O plano ${plan} guarda até ${n} notas por livro. No Capa Dura, as notas são ilimitadas.`,
};

/** "Sua leitura" na página do livro: marcador de página, citações e notas. Só para quem tem conta. */
export function ReadingTools({ book }: { book: Book }) {
  const auth = useAuth();
  const { accounts } = useAuthFlags();
  const [data, setData] = useState<ReadingData | null>(null);
  const [tab, setTab] = useState<"quote" | "note">("quote");
  const [editing, setEditing] = useState<{ kind: "quote" | "note"; annotation?: Annotation } | null>(null);

  const userId = auth.status === "user" ? auth.profile.id : null;
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    getReadingData(book.id).then((d) => alive && setData(d), () => alive && setData(null));
    return () => {
      alive = false;
    };
  }, [userId, book.id]);

  if (!accounts) return null;
  if (auth.status === "guest") {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-6 text-center">
        <BookMarked className="mx-auto size-6 text-ameixa" aria-hidden />
        <p className="mt-2 font-medium text-ink">Marque a página e guarde citações</p>
        <p className="mt-1 text-sm text-ink-3">Com uma conta, você acompanha onde parou e anota os trechos que ficaram com você.</p>
        <Button nativeButton={false} render={<Link href={`/entrar?next=/livro/${book.id}`} />} className="mt-4">
          Entrar
        </Button>
      </div>
    );
  }
  if (auth.status !== "user" || !data) return <Skeleton className="h-56 rounded-2xl" />;

  const list = data.annotations.filter((a) => a.kind === tab);
  const quotes = data.annotations.filter((a) => a.kind === "quote").length;
  const notes = data.annotations.length - quotes;
  const { usage } = data;

  async function remove(a: Annotation) {
    setData((d) => d && { ...d, annotations: d.annotations.filter((x) => x.id !== a.id), usage: adjust(d.usage, a.kind, -1) });
    const r = await deleteAnnotationAction(a.id).catch(() => ({ ok: false }));
    if (!r.ok) {
      setData((d) => d && { ...d, annotations: [a, ...d.annotations], usage: adjust(d.usage, a.kind, 1) });
      toast.error("Não foi possível excluir");
      return;
    }
    toast(a.kind === "quote" ? "Citação excluída" : "Nota excluída");
  }

  return (
    <div className="grid gap-5">
      <Bookmark book={book} progress={data.progress} onSaved={(progress) => setData((d) => d && { ...d, progress })} />

      <div className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Anotações" className="grid grid-cols-2 rounded-full bg-sunken p-1">
            {(
              [
                ["quote", `Citações ${quotes}`],
                ["note", `Notas ${notes}`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn("tnum h-8 rounded-full px-4 text-sm font-medium transition-colors", tab === k ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}
              >
                {label}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setEditing({ kind: tab })}>
            <Plus data-icon="inline-start" /> {tab === "quote" ? "Nova citação" : "Nova nota"}
          </Button>
        </div>

        {list.length ? (
          <ul className="mt-4 divide-y divide-line">
            {list.map((a) => (
              <AnnotationItem key={a.id} annotation={a} onEdit={() => setEditing({ kind: a.kind, annotation: a })} onDelete={() => remove(a)} />
            ))}
          </ul>
        ) : (
          <div className="mt-4 rounded-xl bg-sunken px-4 py-8 text-center">
            {tab === "quote" ? <Quote className="mx-auto size-5 text-ink-4" aria-hidden /> : <NotebookPen className="mx-auto size-5 text-ink-4" aria-hidden />}
            <p className="mt-2 text-sm text-ink-3">
              {tab === "quote" ? "Guarde aqui os trechos que você quer lembrar." : "Anote ideias, perguntas e o que achou de cada parte."}
            </p>
          </div>
        )}

        <p className="tnum mt-4 text-xs text-ink-4">
          {tab === "quote"
            ? usage.quotesLimit === null
              ? `${usage.quotes} citações`
              : `${usage.quotes} de ${usage.quotesLimit} citações no plano ${usage.planName}`
            : usage.notesPerBookLimit === null
              ? `${usage.notesInBook} notas neste livro`
              : `${usage.notesInBook} de ${usage.notesPerBookLimit} notas neste livro no plano ${usage.planName}`}
          {" · "}
          <Link href="/anotacoes" className="font-medium text-ink-3 hover:text-ink hover:underline">
            Ver todas as anotações
          </Link>
        </p>
      </div>

      {editing && (
        <AnnotationDialog
          book={book}
          kind={editing.kind}
          annotation={editing.annotation}
          defaultPage={data.progress?.page || null}
          onClose={() => setEditing(null)}
          onSaved={(a, created) =>
            setData(
              (d) =>
                d && {
                  ...d,
                  annotations: created ? [a, ...d.annotations] : d.annotations.map((x) => (x.id === a.id ? a : x)),
                  usage: created ? adjust(d.usage, a.kind, 1) : d.usage,
                },
            )
          }
          onLimit={(usage) => setData((d) => d && { ...d, usage })}
        />
      )}
    </div>
  );
}

function adjust(u: ReadingData["usage"], kind: "quote" | "note", delta: number): ReadingData["usage"] {
  return kind === "quote" ? { ...u, quotes: u.quotes + delta } : { ...u, notesInBook: u.notesInBook + delta };
}

// ------------------------------------------------------------
// Marcador de página
// ------------------------------------------------------------

function Bookmark({ book, progress, onSaved }: { book: Book; progress: ReadingData["progress"]; onSaved: (p: ReadingData["progress"]) => void }) {
  const entry = useEntry(book.id);
  const [page, setPage] = useState(progress?.page ? String(progress.page) : "");
  const [total, setTotal] = useState(String(progress?.totalPages ?? book.pages ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageN = Number(page) || 0;
  const totalN = Number(total) || null;
  const pct = totalN ? Math.min(100, Math.round((pageN / totalN) * 100)) : null;
  const changed = pageN !== (progress?.page ?? 0) || totalN !== (progress?.totalPages ?? (progress ? null : book.pages ?? null));
  const finished = totalN !== null && pageN >= totalN;

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (totalN !== null && pageN > totalN) return setError("A página passou do total do livro.");
    setSaving(true);
    const r = await setProgressAction({ bookId: book.id, page: pageN, totalPages: totalN }).catch(() => ({ ok: false as const, error: "unavailable" as AnnotationError }));
    setSaving(false);
    if (!r.ok) return setError("Não foi possível salvar o marcador.");
    onSaved(r.progress);
    // Marcar a página é sinal de leitura em andamento.
    if (pageN > 0 && !finished && entry?.status !== "lendo" && entry?.status !== "lido") saveEntry(book, { status: "lendo" });
    toast("Marcador salvo", { description: pct !== null ? `${pct}% de ${book.title}` : `Página ${pageN}` });
  }

  return (
    <form onSubmit={save} className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex items-center gap-2">
        <BookMarked className="size-4 text-ameixa" aria-hidden />
        <h3 className="text-sm font-semibold text-ink">Marcador</h3>
        {pct !== null && <span className="tnum ml-auto text-sm font-medium text-ameixa">{pct}%</span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-2">
        <label className="flex items-center gap-2">
          Estou na página
          <input
            inputMode="numeric"
            value={page}
            onChange={(e) => setPage(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="0"
            aria-label="Página atual"
            className={cn(inputClass, "tnum h-10 w-20 text-center")}
          />
        </label>
        <label className="flex items-center gap-2">
          de
          <input
            inputMode="numeric"
            value={total}
            onChange={(e) => setTotal(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="?"
            aria-label="Total de páginas da sua edição"
            className={cn(inputClass, "tnum h-10 w-20 text-center")}
          />
        </label>
        <Button type="submit" size="sm" variant={changed ? "default" : "secondary"} disabled={!changed || saving} className="ml-auto">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>
      {pct !== null && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da leitura">
          <div className="h-full rounded-full bg-ameixa transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      )}
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {finished && entry?.status !== "lido" && progress?.page === pageN && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-musgo-soft px-3 py-2 text-sm">
          <span className="text-musgo">Chegou ao fim?</span>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-musgo"
            onClick={() => {
              saveEntry(book, { status: "lido", finishedOn: entry?.finishedOn ?? todayISO() });
              toast("Marcado como lido", { description: book.title });
            }}
          >
            Marcar como lido
          </Button>
        </div>
      )}
    </form>
  );
}

// ------------------------------------------------------------
// Uma anotação
// ------------------------------------------------------------

export function AnnotationItem({ annotation: a, onEdit, onDelete, showBook = false }: { annotation: Annotation; onEdit: () => void; onDelete: () => void; showBook?: boolean }) {
  return (
    <li className="group py-4 first:pt-0 last:pb-0">
      {showBook && (
        <Link href={`/livro/${a.book.id}`} className="mb-1.5 block truncate text-xs font-medium text-ink-3 hover:text-ink">
          {a.book.title}
        </Link>
      )}
      {a.kind === "quote" ? (
        <blockquote className="border-l-2 border-ambar pl-3 text-[1.0625rem] leading-relaxed whitespace-pre-line text-ink">“{a.text}”</blockquote>
      ) : (
        <p className="leading-relaxed whitespace-pre-line text-ink-2">{a.text}</p>
      )}
      {a.comment && <p className="mt-2 text-sm whitespace-pre-line text-ink-3">{a.comment}</p>}
      <div className="mt-2 flex items-center gap-1 text-xs text-ink-4">
        {a.page && <span className="tnum mr-2 rounded-full bg-sunken px-2 py-0.5 font-medium text-ink-3">p. {a.page}</span>}
        <span>{new Date(a.createdAt).toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}</span>
        <span className="ml-auto flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
          {a.kind === "quote" && (
            <IconButton
              label="Copiar citação"
              onClick={() => {
                void navigator.clipboard?.writeText(`“${a.text}”, ${a.book.title}${a.book.author ? `, ${a.book.author}` : ""}${a.page ? `, p. ${a.page}` : ""}`);
                toast("Citação copiada");
              }}
            >
              <Copy className="size-3.5" />
            </IconButton>
          )}
          <IconButton label="Editar" onClick={onEdit}>
            <Pencil className="size-3.5" />
          </IconButton>
          <IconButton label="Excluir" onClick={onDelete}>
            <Trash2 className="size-3.5" />
          </IconButton>
        </span>
      </div>
    </li>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="inline-flex size-8 items-center justify-center rounded-full text-ink-3 hover:bg-sunken hover:text-ink">
      {children}
    </button>
  );
}

// ------------------------------------------------------------
// Criar / editar
// ------------------------------------------------------------

export function AnnotationDialog({
  book,
  kind,
  annotation,
  defaultPage,
  onClose,
  onSaved,
  onLimit,
}: {
  book: BookRef;
  kind: "quote" | "note";
  annotation?: Annotation;
  defaultPage: number | null;
  onClose: () => void;
  onSaved: (a: Annotation, created: boolean) => void;
  onLimit?: (usage: ReadingData["usage"]) => void;
}) {
  const [text, setText] = useState(annotation?.text ?? "");
  const [comment, setComment] = useState(annotation?.comment ?? "");
  const [page, setPage] = useState(String(annotation?.page ?? defaultPage ?? ""));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const max = kind === "quote" ? 1000 : 4000;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return setError(kind === "quote" ? "Escreva o trecho." : "Escreva a nota.");
    setSaving(true);
    setError(null);
    const pageN = Number(page) || null;
    const fallback = { ok: false as const, error: "unavailable" as AnnotationError };
    if (annotation) {
      const r = await updateAnnotationAction(annotation.id, { text, comment, page: pageN }).catch(() => fallback);
      setSaving(false);
      if (!r.ok) return setError("Não foi possível salvar. Tente de novo.");
      onSaved(r.annotation, false);
    } else {
      const r = await createAnnotationAction({ book, kind, text, comment, page: pageN }).catch(() => fallback);
      setSaving(false);
      if (!r.ok) {
        if ((r.error === "limit_quotes" || r.error === "limit_notes") && "usage" in r && r.usage) {
          onLimit?.(r.usage);
          return setError(LIMIT_MESSAGE[r.error](r.usage.planName, r.error === "limit_quotes" ? r.usage.quotesLimit : r.usage.notesPerBookLimit));
        }
        return setError("Não foi possível salvar. Tente de novo.");
      }
      onSaved(r.annotation, true);
    }
    toast(kind === "quote" ? "Citação guardada" : "Nota guardada");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-lg">
        <form onSubmit={submit}>
          <div className="border-b border-line p-5 pr-12">
            <DialogTitle className="text-lg font-semibold tracking-tight">
              {annotation ? "Editar" : "Nova"} {kind === "quote" ? "citação" : "nota"}
            </DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-ink-3">{book.title}</DialogDescription>
          </div>
          <div className="grid gap-4 p-5">
            <label className="grid gap-1.5">
              <span className="flex justify-between text-xs font-medium text-ink-3">
                {kind === "quote" ? "Trecho do livro" : "Nota"}
                <span className="tnum font-normal text-ink-4">
                  {text.length}/{max}
                </span>
              </span>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, max))}
                maxLength={max}
                autoFocus
                placeholder={kind === "quote" ? "Copie aqui a frase que você quer guardar" : "O que você pensou nesta parte?"}
                className={cn("rounded-xl px-3 py-2.5 text-[0.9375rem] md:text-[0.9375rem]", kind === "quote" ? "min-h-28" : "min-h-40")}
              />
            </label>
            {kind === "quote" && (
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-ink-3">Seu comentário (opcional)</span>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 1000))}
                  maxLength={1000}
                  placeholder="Por que esse trecho?"
                  className="min-h-20 rounded-xl px-3 py-2.5 text-[0.9375rem] md:text-[0.9375rem]"
                />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-ink-2">
              Página
              <input
                inputMode="numeric"
                value={page}
                onChange={(e) => setPage(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="opcional"
                className={cn(inputClass, "tnum h-10 w-28")}
              />
            </label>
            {error && (
              <p className="text-sm text-destructive">
                {error}
                {error.includes("Capa Dura") && (
                  <>
                    {" "}
                    <Link href="/planos" className="font-medium text-anil hover:underline">
                      Conhecer o Capa Dura
                    </Link>
                  </>
                )}
              </p>
            )}
            <p className="text-xs text-ink-4">Só você vê suas anotações.</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-line p-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
