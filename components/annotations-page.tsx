"use client";

import { NotebookPen, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { deleteAnnotationAction, listAnnotations, listProgress, type Annotation, type Progress, type Usage } from "@/app/reading-actions";
import { BookCover } from "@/components/book-cover";
import { AnnotationDialog, AnnotationItem } from "@/components/reading-tools";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { fold } from "@/lib/search";
import { cn } from "@/lib/utils";

type Filter = "todas" | "quote" | "note";

/** Todas as citações e notas da pessoa, com os marcadores dos livros que ela está lendo. */
export function AnnotationsPage() {
  const auth = useAuth();
  const router = useRouter();
  const library = useLibrary();
  const [data, setData] = useState<{ annotations: Annotation[]; usage: Usage } | null>(null);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [filter, setFilter] = useState<Filter>("todas");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Annotation | null>(null);

  const userId = auth.status === "user" ? auth.profile.id : null;
  useEffect(() => {
    if (auth.status === "guest") router.replace("/entrar?next=/anotacoes");
  }, [auth.status, router]);
  useEffect(() => {
    if (!userId) return;
    void Promise.all([listAnnotations(), listProgress()]).then(([a, p]) => {
      setData(a);
      setProgress(p);
    });
  }, [userId]);

  if (!data) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  const reading = Object.values(library).filter((e) => e.status === "lendo");
  const q = fold(query.trim());
  const shown = data.annotations.filter(
    (a) => (filter === "todas" || a.kind === filter) && (!q || fold(`${a.text} ${a.comment} ${a.book.title} ${a.book.author}`).includes(q)),
  );
  const quotes = data.annotations.filter((a) => a.kind === "quote").length;

  async function remove(a: Annotation) {
    setData((d) => d && { ...d, annotations: d.annotations.filter((x) => x.id !== a.id) });
    const r = await deleteAnnotationAction(a.id).catch(() => ({ ok: false }));
    if (!r.ok) {
      setData((d) => d && { ...d, annotations: [a, ...d.annotations] });
      toast.error("Não foi possível excluir");
    } else toast(a.kind === "quote" ? "Citação excluída" : "Nota excluída");
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-title font-semibold text-ink">Anotações</h1>
      <p className="mt-1 text-ink-3">Seus marcadores, citações e notas. Só você vê.</p>

      {reading.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xs font-semibold tracking-wide text-ink-3 uppercase">Lendo agora</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {reading.map((e) => {
              const p = progress[e.book.id];
              const pct = p?.totalPages ? Math.min(100, Math.round((p.page / p.totalPages) * 100)) : null;
              return (
                <li key={e.book.id}>
                  <Link href={`/livro/${e.book.id}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-line-strong">
                    <BookCover book={e.book} size="S" className="w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink">{e.book.title}</p>
                      <p className="tnum text-xs text-ink-3">
                        {p ? (p.totalPages ? `Página ${p.page} de ${p.totalPages}` : `Página ${p.page}`) : "Sem marcador ainda"}
                      </p>
                      {pct !== null && (
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                          <div className="h-full rounded-full bg-ameixa" style={{ width: `${pct}%` }} />
                        </div>
                      )}
                    </div>
                    {pct !== null && <span className="tnum text-sm font-medium text-ameixa">{pct}%</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label="Tipo" className="flex rounded-full bg-sunken p-1">
            {(
              [
                ["todas", `Todas ${data.annotations.length}`],
                ["quote", `Citações ${quotes}`],
                ["note", `Notas ${data.annotations.length - quotes}`],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={filter === k}
                onClick={() => setFilter(k)}
                className={cn("tnum h-8 rounded-full px-4 text-sm font-medium transition-colors", filter === k ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="relative min-w-48 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-4" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar nas anotações"
              aria-label="Buscar nas anotações"
              className="h-10 w-full rounded-full border border-line bg-surface pr-4 pl-9 text-sm text-ink outline-none placeholder:text-ink-4 focus:border-line-strong"
            />
          </label>
        </div>

        {shown.length ? (
          <ul className="mt-6 divide-y divide-line rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
            {shown.map((a) => (
              <AnnotationItem key={a.id} annotation={a} showBook onEdit={() => setEditing(a)} onDelete={() => remove(a)} />
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
            <NotebookPen className="mx-auto size-6 text-ink-4" aria-hidden />
            <p className="mt-2 font-medium text-ink">{data.annotations.length ? "Nada encontrado" : "Nenhuma anotação ainda"}</p>
            <p className="mt-1 text-sm text-ink-3">
              {data.annotations.length ? "Tente outra palavra." : "Abra um livro e guarde uma citação ou uma nota na seção Sua leitura."}
            </p>
          </div>
        )}

        {data.usage.quotesLimit !== null && (
          <p className="tnum mt-4 text-xs text-ink-4">
            {data.usage.quotes} de {data.usage.quotesLimit} citações no plano {data.usage.planName} · até {data.usage.notesPerBookLimit} notas por livro
          </p>
        )}
      </section>

      {editing && (
        <AnnotationDialog
          book={editing.book}
          kind={editing.kind}
          annotation={editing}
          defaultPage={null}
          onClose={() => setEditing(null)}
          onSaved={(a) => setData((d) => d && { ...d, annotations: d.annotations.map((x) => (x.id === a.id ? a : x)) })}
        />
      )}
    </div>
  );
}
