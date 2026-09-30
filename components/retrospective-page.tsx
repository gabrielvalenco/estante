"use client";

import { Download, Lock, Quote, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getRetrospective } from "@/app/retrospective-actions";
import { BarChart } from "@/components/bar-chart";
import { BookCover } from "@/components/book-cover";
import { Stars } from "@/components/stars";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { formatRating } from "@/lib/format";
import type { RetroBook, Retrospective } from "@/lib/retrospective";
import { cn } from "@/lib/utils";

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_FULL = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export function RetrospectivePage() {
  const auth = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const year = Number(params.get("ano")) || undefined;
  const [data, setData] = useState<Retrospective | null | undefined>(undefined);
  const [sharing, setSharing] = useState(false);
  const userId = auth.status === "user" ? auth.profile.id : null;

  useEffect(() => {
    if (auth.status === "guest") router.replace("/entrar?next=/retrospectiva");
    if (!userId) return;
    setData(undefined);
    void getRetrospective(year).then(setData, () => setData(null));
  }, [auth.status, userId, year, router]);

  if (data === undefined) {
    return (
      <div className="grid max-w-4xl gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-72 rounded-3xl" />
        <Skeleton className="h-48 rounded-3xl" />
      </div>
    );
  }
  if (data === null) return <p className="text-ink-3">Não foi possível montar a retrospectiva agora.</p>;

  const { basic, full } = data;
  const goalPct = basic.goal ? Math.min(100, Math.round((basic.booksRead / basic.goal) * 100)) : 0;

  return (
    <div className="max-w-4xl">
      <p className="text-sm font-medium text-anil">Retrospectiva</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-hero font-semibold tracking-tight text-ink">
          Sua leitura em {data.year}
          {data.inProgress && <span className="text-ink-4">, até agora</span>}
        </h1>
        {data.years.length > 1 && (
          <nav aria-label="Ano" className="flex flex-wrap gap-1.5">
            {data.years.map((y) => (
              <Link
                key={y}
                href={`/retrospectiva?ano=${y}`}
                aria-current={y === data.year ? "page" : undefined}
                className={cn("tnum h-8 rounded-full px-3 text-sm leading-8 font-medium", y === data.year ? "bg-ink text-canvas" : "bg-sunken text-ink-2 hover:bg-line")}
              >
                {y}
              </Link>
            ))}
          </nav>
        )}
      </div>

      {basic.booksRead === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-line-strong px-6 py-14 text-center">
          <p className="font-medium text-ink">Nenhum livro marcado como lido em {data.year}</p>
          <p className="mt-1 text-sm text-ink-3">Marque um livro como lido, com a data em que terminou, e ele entra na sua retrospectiva.</p>
          <Button className="mt-5" nativeButton={false} render={<Link href="/livros" />}>
            Explorar livros
          </Button>
        </div>
      ) : (
        <>
          {/* Destaque: o número do ano */}
          <section className="mt-8 overflow-hidden rounded-3xl bg-[linear-gradient(160deg,#2a2378_0%,#16133d_55%,#0b0b0d_100%)] p-6 text-[#f5f5f7] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg text-white/70">{data.inProgress ? "Até agora, você leu" : "Você leu"}</p>
                <p className="mt-1 flex items-baseline gap-3">
                  <span className="tnum text-7xl font-semibold tracking-tighter sm:text-8xl">{basic.booksRead}</span>
                  <span className="text-2xl font-semibold text-[#8f89ff]">{basic.booksRead === 1 ? "livro" : "livros"}</span>
                </p>
              </div>
              <Button variant="secondary" onClick={() => setSharing(true)} className="bg-white/10 text-white hover:bg-white/20">
                <Share2 data-icon="inline-start" /> Compartilhar
              </Button>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {basic.pagesKnown > 0 && (
                <Stat value={basic.pagesRead.toLocaleString("pt-BR")} label={basic.pagesKnown < basic.booksRead ? `páginas (em ${basic.pagesKnown} livros)` : "páginas"} />
              )}
              {basic.avgRating !== null && <Stat value={`${formatRating(basic.avgRating)}★`} label="nota média" />}
              <Stat value={`${goalPct}%`} label={`da meta de ${basic.goal} livros`} />
            </dl>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100} aria-label="Meta do ano">
              <div className="h-full rounded-full bg-[#5cc88a]" style={{ width: `${goalPct}%` }} />
            </div>
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
            <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
              <BarChart
                title="Livros por mês"
                category="Mês"
                unit={["livro", "livros"]}
                data={basic.byMonth.map((value, i) => ({ label: MONTHS[i], fullLabel: MONTHS_FULL[i], value }))}
              />
            </section>
            {basic.topRated && (
              <section className="rounded-3xl border border-line bg-surface p-5 shadow-card">
                <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Favorito do ano</p>
                <BookRow book={basic.topRated} />
              </section>
            )}
          </div>

          <section className="mt-6">
            <h2 className="text-sm font-semibold text-ink">Os livros de {data.year}</h2>
            <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {basic.covers.map((b) => (
                <li key={b.id}>
                  <Link href={`/livro/${b.id}`} title={b.title}>
                    <BookCover book={b} size="M" className="w-full" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {full ? <FullSections full={full} year={data.year} /> : <Locked planName={data.plan.name} />}
        </>
      )}

      {sharing && <ShareDialog year={data.year} onClose={() => setSharing(false)} />}
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <dd className="tnum text-3xl font-semibold">{value}</dd>
      <dt className="text-sm text-white/60">{label}</dt>
    </div>
  );
}

function BookRow({ book, note }: { book: RetroBook; note?: string }) {
  return (
    <Link href={`/livro/${book.id}`} className="mt-3 flex gap-3 rounded-xl hover:bg-sunken/60">
      <BookCover book={book} size="M" className="w-16 shrink-0" />
      <div className="min-w-0 py-1">
        <p className="line-clamp-2 font-medium text-ink">{book.title}</p>
        <p className="truncate text-sm text-ink-3">{book.author}</p>
        {book.rating !== null && <Stars value={book.rating} size={13} className="mt-1.5" />}
        {note && <p className="mt-1 text-xs text-ink-4">{note}</p>}
      </div>
    </Link>
  );
}

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl border border-line bg-surface p-5 shadow-card", className)}>
      <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">{title}</p>
      {children}
    </section>
  );
}

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });

function FullSections({ full, year }: { full: NonNullable<Retrospective["full"]>; year: number }) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2">
      {full.topAuthors.length > 0 && (
        <Card title="Autores do ano">
          <ol className="mt-3 grid gap-2">
            {full.topAuthors.map((a, i) => (
              <li key={a.name} className="flex items-baseline gap-3">
                <span className="tnum w-5 text-sm text-ink-4">{i + 1}.</span>
                <span className="flex-1 font-medium text-ink">{a.name}</span>
                <span className="tnum text-sm text-ink-3">
                  {a.books} {a.books === 1 ? "livro" : "livros"}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
      <Card title="Suas notas">
        <div className="mt-3">
          <BarChart
            title="Livros por nota"
            category="Nota"
            unit={["livro", "livros"]}
            tone="ambar"
            height={110}
            data={full.ratings.map((value, i) => ({ label: i % 2 ? String((i + 1) / 2) : "", fullLabel: `${formatRating((i + 1) / 2)} estrelas`, value }))}
          />
        </div>
        <p className="mt-3 text-sm text-ink-3">
          {full.liked} {full.liked === 1 ? "livro curtido" : "livros curtidos"} · {full.reviews} {full.reviews === 1 ? "review escrita" : "reviews escritas"}
        </p>
      </Card>
      {full.longest && (
        <Card title="O mais longo">
          <BookRow book={full.longest} note={`${full.longest.pages} páginas`} />
          {full.shortest && full.shortest.id !== full.longest.id && (
            <>
              <p className="mt-5 text-xs font-semibold tracking-wide text-ink-3 uppercase">O mais curto</p>
              <BookRow book={full.shortest} note={`${full.shortest.pages} páginas`} />
            </>
          )}
        </Card>
      )}
      {full.first && (
        <Card title={`O primeiro de ${year}`}>
          <BookRow book={full.first} note={`Terminado em ${shortDate(full.first.finishedOn)}`} />
          {full.last && (
            <>
              <p className="mt-5 text-xs font-semibold tracking-wide text-ink-3 uppercase">O mais recente</p>
              <BookRow book={full.last} note={`Terminado em ${shortDate(full.last.finishedOn)}`} />
            </>
          )}
        </Card>
      )}
      <Card title="Anotações e conversas" className="sm:col-span-2">
        <dl className="mt-3 flex flex-wrap gap-x-10 gap-y-3">
          {[
            [full.quotes, full.quotes === 1 ? "citação guardada" : "citações guardadas"],
            [full.notes, full.notes === 1 ? "nota" : "notas"],
            [full.threads, full.threads === 1 ? "discussão aberta" : "discussões abertas"],
            [full.replies, full.replies === 1 ? "resposta em discussões" : "respostas em discussões"],
          ].map(([n, label]) => (
            <div key={String(label)}>
              <dd className="tnum text-2xl font-semibold text-ink">{n}</dd>
              <dt className="text-sm text-ink-3">{label}</dt>
            </div>
          ))}
        </dl>
        {full.quoteOfYear && (
          <figure className="mt-6 rounded-2xl bg-sunken p-5">
            <Quote className="size-5 text-ambar" aria-hidden />
            <blockquote className="mt-2 text-lg leading-relaxed text-ink">“{full.quoteOfYear.text}”</blockquote>
            <figcaption className="mt-2 text-sm text-ink-3">
              Sua citação do ano · {full.quoteOfYear.bookTitle}
              {full.quoteOfYear.page ? `, p. ${full.quoteOfYear.page}` : ""}
            </figcaption>
          </figure>
        )}
      </Card>
    </div>
  );
}

function Locked({ planName }: { planName: string }) {
  return (
    <section className="mt-8 rounded-3xl border-2 border-dashed border-anil/40 bg-anil-soft/40 p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <Lock className="mt-1 size-5 shrink-0 text-anil" aria-hidden />
        <div>
          <h2 className="text-lg font-semibold text-ink">A retrospectiva completa é do Capa Dura</h2>
          <p className="mt-1 text-sm text-ink-2">Você está no plano {planName}. No Capa Dura, a retrospectiva também mostra:</p>
          <ul className="mt-3 grid gap-1.5 text-sm text-ink-2 sm:grid-cols-2">
            {["Seus autores do ano", "A distribuição das suas notas", "O livro mais longo e o mais curto", "O primeiro e o último do ano", "Citações, notas e discussões", "Sua citação do ano"].map((f) => (
              <li key={f}>· {f}</li>
            ))}
          </ul>
          <Button className="mt-5" nativeButton={false} render={<Link href="/planos" />}>
            Conhecer o Capa Dura
          </Button>
        </div>
      </div>
    </section>
  );
}

function ShareDialog({ year, onClose }: { year: number; onClose: () => void }) {
  const [format, setFormat] = useState<"story" | "post">("story");
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const src = `/api/retrospectiva/imagem?ano=${year}&f=${format}`;

  async function file() {
    const res = await fetch(src);
    if (!res.ok) throw new Error();
    return new File([await res.blob()], `estante-retrospectiva-${year}-${format}.png`, { type: "image/png" });
  }

  async function download() {
    try {
      const f = await file();
      const url = URL.createObjectURL(f);
      Object.assign(document.createElement("a"), { href: url, download: f.name }).click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Não foi possível baixar a imagem");
    }
  }

  async function share() {
    try {
      const f = await file();
      if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: `Minha leitura em ${year}` });
      else await download();
    } catch {
      // A pessoa fechou a folha de compartilhar: nada a fazer.
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-md">
        <div className="p-5 pb-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">Compartilhar retrospectiva</DialogTitle>
          <DialogDescription className="mt-0.5 text-ink-3">Sua leitura em {year}, pronta para os Stories ou o feed.</DialogDescription>
          <div role="tablist" aria-label="Formato" className="mt-4 grid grid-cols-2 rounded-full bg-sunken p-1">
            {(["story", "post"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={format === f}
                onClick={() => setFormat(f)}
                className={cn("h-8 rounded-full text-sm font-medium", format === f ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}
              >
                {f === "story" ? "Stories" : "Feed"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-center px-5 pt-4">
          <div className={cn("relative overflow-hidden rounded-2xl bg-sunken shadow-card", format === "story" ? "aspect-[9/16] h-[min(52vh,26rem)]" : "aspect-[4/5] h-[min(42vh,20rem)]")}>
            {!loaded[format] && <Skeleton className="absolute inset-0 rounded-none" />}
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada na hora */}
            <img
              key={format}
              src={src}
              alt={`Imagem da retrospectiva de ${year} para ${format === "story" ? "Stories" : "feed"}`}
              onLoad={() => setLoaded((l) => ({ ...l, [format]: true }))}
              className={cn("size-full object-cover transition-opacity", loaded[format] ? "opacity-100" : "opacity-0")}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 p-5">
          <Button variant="secondary" onClick={download}>
            <Download data-icon="inline-start" /> Baixar
          </Button>
          <Button onClick={share}>
            <Share2 data-icon="inline-start" /> Compartilhar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
