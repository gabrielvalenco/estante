"use client";

import { BookOpenCheck, FileUp, Highlighter, Library } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { importGoodreadsAction, importKindleAction, importPermissions, matchBooksAction, type MatchedBook } from "@/app/import-actions";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { parseGoodreadsCsv, parseKindleClippings, type GoodreadsBook, type KindleBook } from "@/lib/importers";
import { refreshLibrary } from "@/lib/library";
import { cn } from "@/lib/utils";

type Source = "goodreads" | "kindle";
type Row = { key: string; title: string; author: string; isbn?: string | null; detail: string; match?: MatchedBook | null; include: boolean };
type Step = { name: "idle" } | { name: "matching"; done: number; total: number } | { name: "review" } | { name: "importing"; done: number; total: number } | { name: "done"; message: string };

const MAX_FILE = 10 * 1024 * 1024;
const STATUS_LABEL = { lido: "lido", lendo: "lendo", "quero-ler": "quero ler" } as const;

export function ImportPage() {
  const auth = useAuth();
  const router = useRouter();
  const [perms, setPerms] = useState<Awaited<ReturnType<typeof importPermissions>> | null>(null);
  const [source, setSource] = useState<Source>("goodreads");

  useEffect(() => {
    if (auth.status === "guest") router.replace("/entrar?next=/importar");
    if (auth.status === "user") void importPermissions().then(setPerms);
  }, [auth.status, router]);

  if (!perms) {
    return (
      <div className="grid max-w-3xl gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-title font-semibold text-ink">Importar</h1>
      <p className="mt-1 text-ink-3">Traga sua estante do Goodreads e seus destaques do Kindle. Nada é importado antes de você revisar.</p>

      <div role="tablist" aria-label="De onde importar" className="mt-8 grid grid-cols-2 gap-3">
        {(
          [
            ["goodreads", "Goodreads", "Estante, notas e reviews", Library],
            ["kindle", "Kindle", "Destaques e notas", Highlighter],
          ] as const
        ).map(([id, name, sub, Icon]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={source === id}
            onClick={() => setSource(id)}
            className={cn(
              "flex items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
              source === id ? "border-anil bg-anil-soft" : "border-line bg-surface hover:border-line-strong",
            )}
          >
            <Icon className={cn("size-5 shrink-0", source === id ? "text-anil" : "text-ink-3")} aria-hidden />
            <span>
              <span className="block font-medium text-ink">{name}</span>
              <span className="block text-sm text-ink-3">{sub}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-6">
        {source === "goodreads" ? <GoodreadsImport key="g" /> : <KindleImport key="k" allowed={perms.kindle} planName={perms.planName} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Passos comuns: arquivo → achar os livros → revisar → importar
// ------------------------------------------------------------

function useMatcher() {
  const [rows, setRows] = useState<Row[]>([]);
  const [step, setStep] = useState<Step>({ name: "idle" });
  const cancelled = useRef(false);

  async function match(initial: Row[]) {
    cancelled.current = false;
    setRows(initial);
    setStep({ name: "matching", done: 0, total: initial.length });
    const found = new Map<string, MatchedBook | null>();
    for (let i = 0; i < initial.length && !cancelled.current; i += 10) {
      const chunk = initial.slice(i, i + 10);
      const r = await matchBooksAction(chunk.map(({ key, title, author, isbn }) => ({ key, title, author, isbn }))).catch(() => null);
      chunk.forEach((c) => found.set(c.key, r?.find((m) => m.key === c.key)?.book ?? null));
      setStep({ name: "matching", done: Math.min(initial.length, i + 10), total: initial.length });
    }
    setRows(initial.map((r) => ({ ...r, match: found.get(r.key) ?? null, include: Boolean(found.get(r.key)) })));
    setStep({ name: "review" });
  }

  return { rows, setRows, step, setStep, match, cancel: () => (cancelled.current = true) };
}

function FilePicker({ accept, label, hint, onFile }: { accept: string; label: string; hint: React.ReactNode; onFile: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="rounded-3xl border border-dashed border-line-strong bg-surface p-6 text-center sm:p-8">
      <FileUp className="mx-auto size-7 text-ink-4" aria-hidden />
      <div className="mt-3 text-sm text-ink-3">{hint}</div>
      <Button className="mt-5" onClick={() => input.current?.click()}>
        {label}
      </Button>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={label}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > MAX_FILE) return toast.error("Arquivo grande demais", { description: "O limite é 10 MB." });
          onFile(await file.text());
        }}
      />
    </div>
  );
}

function Progress({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="rounded-3xl border border-line bg-surface p-6" role="status" aria-live="polite">
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="tnum mt-0.5 text-sm text-ink-3">
        {done} de {total}
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-sunken">
        <div className="h-full rounded-full bg-anil transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ReviewList({ rows, setRows }: { rows: Row[]; setRows: (fn: (r: Row[]) => Row[]) => void }) {
  const found = rows.filter((r) => r.match).length;
  return (
    <div className="rounded-3xl border border-line bg-surface shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4 text-sm">
        <span className="text-ink-2">
          <strong className="font-semibold text-ink">{found}</strong> de {rows.length} livros encontrados no catálogo
        </span>
        <span className="flex gap-3">
          <button type="button" className="font-medium text-anil hover:underline" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, include: Boolean(r.match) })))}>
            Marcar todos
          </button>
          <button type="button" className="font-medium text-ink-3 hover:underline" onClick={() => setRows((rs) => rs.map((r) => ({ ...r, include: false })))}>
            Desmarcar
          </button>
        </span>
      </div>
      <ul className="max-h-[28rem] divide-y divide-line overflow-y-auto">
        {rows.map((r) => (
          <li key={r.key}>
            <label className={cn("flex items-center gap-3 p-3 sm:px-4", r.match ? "cursor-pointer hover:bg-sunken/60" : "opacity-60")}>
              <input
                type="checkbox"
                checked={r.include}
                disabled={!r.match}
                onChange={(e) => setRows((rs) => rs.map((x) => (x.key === r.key ? { ...x, include: e.target.checked } : x)))}
                className="size-4 shrink-0 accent-anil"
                aria-label={`Importar ${r.title}`}
              />
              {r.match ? <BookCover book={r.match} size="S" className="w-9 shrink-0" /> : <span className="h-[54px] w-9 shrink-0 rounded bg-sunken" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-ink">{r.match?.title ?? r.title}</span>
                <span className="block truncate text-xs text-ink-3">
                  {r.match ? r.match.author : "Não encontrado no catálogo"}
                  {r.match && r.match.title.toLowerCase() !== r.title.toLowerCase() ? ` · no arquivo: ${r.title}` : ""}
                </span>
              </span>
              <span className="shrink-0 text-xs text-ink-3">{r.detail}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------
// Goodreads
// ------------------------------------------------------------

function GoodreadsImport() {
  const m = useMatcher();
  const [books, setBooks] = useState<Map<string, GoodreadsBook>>(new Map());

  function read(text: string) {
    try {
      const { books: parsed } = parseGoodreadsCsv(text);
      if (!parsed.length) return toast.error("Nenhum livro no arquivo");
      const list = parsed.slice(0, 1000);
      setBooks(new Map(list.map((b) => [b.key, b])));
      void m.match(
        list.map((b) => ({
          key: b.key,
          title: b.title,
          author: b.author,
          isbn: b.isbn,
          detail: [STATUS_LABEL[b.status], b.rating ? "★".repeat(b.rating) : null].filter(Boolean).join(" · "),
          include: true,
        })),
      );
    } catch {
      toast.error("Esse arquivo não parece o CSV do Goodreads", { description: "Use o arquivo baixado em Export library." });
    }
  }

  async function run() {
    const chosen = m.rows.filter((r) => r.include && r.match);
    let imported = 0;
    m.setStep({ name: "importing", done: 0, total: chosen.length });
    for (let i = 0; i < chosen.length; i += 100) {
      const chunk = chosen.slice(i, i + 100).map((r) => {
        const b = books.get(r.key)!;
        return { book: r.match!, status: b.status, rating: b.rating, review: b.review, finishedOn: b.finishedOn, addedOn: b.addedOn };
      });
      const res = await importGoodreadsAction(chunk).catch(() => ({ ok: false as const, error: "invalid" as const }));
      if (res.ok) imported += res.imported;
      m.setStep({ name: "importing", done: Math.min(chosen.length, i + 100), total: chosen.length });
    }
    await refreshLibrary().catch(() => {});
    const kept = chosen.length - imported;
    m.setStep({
      name: "done",
      message: `${imported} ${imported === 1 ? "livro importado" : "livros importados"} para a sua estante.${kept > 0 ? ` ${kept} já estavam na Estante com registro mais novo e ficaram como estavam.` : ""}`,
    });
  }

  if (m.step.name === "idle") {
    return (
      <FilePicker
        accept=".csv,text/csv"
        label="Escolher o CSV do Goodreads"
        onFile={read}
        hint={
          <>
            No Goodreads, abra <strong className="font-medium text-ink-2">My Books</strong>, depois <strong className="font-medium text-ink-2">Import and export</strong> e{" "}
            <strong className="font-medium text-ink-2">Export library</strong>. Status, notas, datas e reviews vêm junto. Grátis em todos os planos.
          </>
        }
      />
    );
  }
  if (m.step.name === "matching") return <Progress label="Procurando seus livros no catálogo" done={m.step.done} total={m.step.total} />;
  if (m.step.name === "importing") return <Progress label="Importando para a sua estante" done={m.step.done} total={m.step.total} />;
  if (m.step.name === "done") return <Done message={m.step.message} href="/estante" cta="Ver minha estante" onAgain={() => m.setStep({ name: "idle" })} />;

  const count = m.rows.filter((r) => r.include).length;
  return (
    <div className="grid gap-4">
      <ReviewList rows={m.rows} setRows={m.setRows} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-4">Livros que você já registrou na Estante depois da data do Goodreads não são sobrescritos.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => m.setStep({ name: "idle" })}>
            Cancelar
          </Button>
          <Button onClick={run} disabled={!count}>
            Importar {count} {count === 1 ? "livro" : "livros"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Kindle
// ------------------------------------------------------------

function KindleImport({ allowed, planName }: { allowed: boolean; planName: string }) {
  const m = useMatcher();
  const [books, setBooks] = useState<Map<string, KindleBook>>(new Map());
  const [summary, setSummary] = useState<{ quotes: number; notes: number; books: number } | null>(null);

  function read(text: string) {
    const { books: parsed } = parseKindleClippings(text);
    if (!parsed.length) return toast.error("Nenhum destaque no arquivo", { description: "Use o My Clippings.txt da pasta documents do Kindle." });
    const list = parsed.slice(0, 200);
    setBooks(new Map(list.map((b) => [b.key, b])));
    const quotes = list.reduce((n, b) => n + b.clips.filter((c) => c.kind === "quote").length, 0);
    const notes = list.reduce((n, b) => n + b.clips.filter((c) => c.kind === "note").length, 0);
    setSummary({ quotes, notes, books: list.length });
    if (!allowed) return;
    void m.match(
      list.map((b) => {
        const q = b.clips.filter((c) => c.kind === "quote").length;
        const n = b.clips.length - q;
        return {
          key: b.key,
          title: b.title,
          author: b.author,
          detail: [q ? `${q} ${q === 1 ? "destaque" : "destaques"}` : null, n ? `${n} ${n === 1 ? "nota" : "notas"}` : null].filter(Boolean).join(" · "),
          include: true,
        };
      }),
    );
  }

  async function run() {
    const chosen = m.rows.filter((r) => r.include && r.match);
    const items = chosen.flatMap((r) => {
      const b = r.match!;
      return books.get(r.key)!.clips.map((c) => ({ book: { id: b.id, title: b.title, author: b.author, coverId: b.coverId, color: b.color }, kind: c.kind, text: c.text, page: c.page }));
    });
    let imported = 0;
    let duplicates = 0;
    let truncated = 0;
    m.setStep({ name: "importing", done: 0, total: items.length });
    for (let i = 0; i < items.length; i += 500) {
      const res = await importKindleAction(items.slice(i, i + 500)).catch(() => null);
      if (res?.ok) {
        imported += res.imported;
        duplicates += res.duplicates;
        truncated += res.truncated;
      }
      m.setStep({ name: "importing", done: Math.min(items.length, i + 500), total: items.length });
    }
    m.setStep({
      name: "done",
      message: [
        `${imported} ${imported === 1 ? "anotação importada" : "anotações importadas"} de ${chosen.length} ${chosen.length === 1 ? "livro" : "livros"}.`,
        duplicates ? `${duplicates} já estavam na Estante.` : "",
        truncated ? `${truncated} destaques muito longos foram encurtados para 1000 caracteres.` : "",
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  if (!summary || m.step.name === "idle") {
    if (summary && !allowed) {
      return (
        <div className="rounded-3xl border-2 border-anil bg-surface p-6 text-center sm:p-8">
          <BookOpenCheck className="mx-auto size-7 text-anil" aria-hidden />
          <p className="mt-3 text-lg font-semibold text-ink">
            Encontramos {summary.quotes} {summary.quotes === 1 ? "destaque" : "destaques"}
            {summary.notes ? ` e ${summary.notes} ${summary.notes === 1 ? "nota" : "notas"}` : ""} de {summary.books} {summary.books === 1 ? "livro" : "livros"}
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-ink-3">
            Importar do Kindle faz parte do Capa Dura. Você está no plano {planName}: assinando, seus destaques viram citações na hora, sem limite.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="secondary" onClick={() => setSummary(null)}>
              Voltar
            </Button>
            <Button nativeButton={false} render={<Link href="/planos" />}>
              Conhecer o Capa Dura
            </Button>
          </div>
        </div>
      );
    }
    return (
      <FilePicker
        accept=".txt,text/plain"
        label="Escolher o My Clippings.txt"
        onFile={read}
        hint={
          <>
            Ligue o Kindle no computador pelo cabo USB e abra a pasta <strong className="font-medium text-ink-2">documents</strong>: o arquivo{" "}
            <strong className="font-medium text-ink-2">My Clippings.txt</strong> tem todos os seus destaques e notas.
            {!allowed && <> Você pode ver o que tem no arquivo agora; importar é do plano Capa Dura.</>}
          </>
        }
      />
    );
  }
  if (m.step.name === "matching") return <Progress label="Procurando seus livros no catálogo" done={m.step.done} total={m.step.total} />;
  if (m.step.name === "importing") return <Progress label="Importando destaques e notas" done={m.step.done} total={m.step.total} />;
  if (m.step.name === "done") return <Done message={m.step.message} href="/anotacoes" cta="Ver minhas anotações" onAgain={() => { setSummary(null); m.setStep({ name: "idle" }); }} />;

  const count = m.rows.filter((r) => r.include).length;
  return (
    <div className="grid gap-4">
      <ReviewList rows={m.rows} setRows={m.setRows} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-4">Destaques viram citações e notas viram notas, só para você. Importar de novo não duplica.</p>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setSummary(null); m.setStep({ name: "idle" }); }}>
            Cancelar
          </Button>
          <Button onClick={run} disabled={!count}>
            Importar de {count} {count === 1 ? "livro" : "livros"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Done({ message, href, cta, onAgain }: { message: string; href: string; cta: string; onAgain: () => void }) {
  return (
    <div className="rounded-3xl border border-musgo/30 bg-musgo-soft p-6 text-center sm:p-8" role="status">
      <p className="text-lg font-semibold text-musgo">Pronto!</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-ink-2">{message}</p>
      <div className="mt-5 flex justify-center gap-2">
        <Button variant="secondary" onClick={onAgain}>
          Importar outro arquivo
        </Button>
        <Button nativeButton={false} render={<Link href={href} />}>
          {cta}
        </Button>
      </div>
    </div>
  );
}
