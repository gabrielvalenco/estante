"use client";

import { Check, Download, Link2, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { siBluesky, siFacebook, siThreads, siWhatsapp, siX } from "simple-icons";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, useAuthFlags } from "@/lib/auth";
import { formatRating } from "@/lib/format";
import { cn } from "@/lib/utils";

type Format = "story" | "post";

/** Redes com "intenção de post" na web. Instagram não tem: vai pela imagem (compartilhar ou baixar). */
const NETWORKS = [
  { name: "WhatsApp", icon: siWhatsapp, href: (text: string, url: string) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
  { name: "X", icon: siX, href: (text: string, url: string) => `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
  { name: "Threads", icon: siThreads, href: (text: string, url: string) => `https://www.threads.net/intent/post?text=${encodeURIComponent(`${text} ${url}`)}` },
  { name: "Bluesky", icon: siBluesky, href: (text: string, url: string) => `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text} ${url}`)}` },
  { name: "Facebook", icon: siFacebook, href: (_: string, url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
];

/**
 * Compartilhar uma avaliação, como no Letterboxd: imagem pronta para Stories (9:16) ou feed (4:5),
 * gerada no servidor, e um link com prévia. No celular, "Compartilhar" abre a folha nativa com a imagem
 * (Instagram, WhatsApp...). No computador: baixar a imagem, copiar o link ou postar direto nas redes.
 */
export function ShareReviewDialog({
  open,
  onOpenChange,
  handle,
  bookId,
  title,
  rating,
  version,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  handle: string;
  bookId: string;
  title: string;
  rating: number | null;
  /** Muda quando a avaliação muda: evita imagem antiga em cache. */
  version: number;
}) {
  const [format, setFormat] = useState<Format>("story");
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  const [canShareFiles, setCanShareFiles] = useState(false);
  const [busy, setBusy] = useState(false);

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const pageUrl = `${origin}/u/${handle}/livro/${bookId}`;
  const imageUrl = (f: Format) => `/api/og/review?u=${handle}&b=${bookId}&f=${f}&v=${version}`;
  const text = rating !== null ? `${formatRating(rating)}★ para ${title} na Estante` : `Minha review de ${title} na Estante`;
  const fileName = `estante-${title.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40)}-${format}.png`;

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    // Folha de compartilhamento com arquivo existe no celular (e em alguns navegadores de desktop).
    try {
      const probe = new File([new Blob()], "x.png", { type: "image/png" });
      setCanShareFiles(typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] }));
    } catch {
      setCanShareFiles(false);
    }
    // Já pede o outro formato, para a troca ser instantânea.
    const other = new Image();
    other.src = imageUrl(format === "story" ? "post" : "story");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function imageFile() {
    const res = await fetch(imageUrl(format));
    if (!res.ok) throw new Error("imagem");
    return new File([await res.blob()], fileName, { type: "image/png" });
  }

  async function shareNative() {
    setBusy(true);
    try {
      const file = await imageFile();
      await navigator.share({ files: [file], title, text: `${text} ${pageUrl}` });
    } catch (err) {
      // Cancelar a folha de compartilhamento não é erro.
      if ((err as Error).name !== "AbortError") toast.error("Não foi possível compartilhar", { description: "Tente baixar a imagem." });
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    try {
      const file = await imageFile();
      const url = URL.createObjectURL(file);
      const a = Object.assign(document.createElement("a"), { href: url, download: fileName });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast("Imagem baixada", { description: "Pronta para postar no Instagram ou onde quiser." });
    } catch {
      toast.error("Não foi possível baixar a imagem");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(pageUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-md">
        <div className="p-5 pb-0">
          <DialogTitle className="text-lg font-semibold tracking-tight">Compartilhar avaliação</DialogTitle>
          <DialogDescription className="mt-0.5 text-ink-3">{title}</DialogDescription>

          <div role="tablist" aria-label="Formato da imagem" className="mt-4 grid grid-cols-2 rounded-full bg-sunken p-1">
            {(["story", "post"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={format === f}
                onClick={() => setFormat(f)}
                className={cn("h-8 rounded-full text-sm font-medium transition-colors", format === f ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}
              >
                {f === "story" ? "Stories" : "Feed"}
              </button>
            ))}
          </div>
        </div>

        {/* Prévia no tamanho real da proporção */}
        <div className="flex justify-center px-5 pt-4">
          <div className={cn("relative overflow-hidden rounded-2xl bg-sunken shadow-card", format === "story" ? "aspect-[9/16] h-[min(52vh,26rem)]" : "aspect-[4/5] h-[min(42vh,20rem)]")}>
            {!loaded[format] && <Skeleton className="absolute inset-0 rounded-none" />}
            {/* eslint-disable-next-line @next/next/no-img-element -- imagem gerada na hora, não passa pelo otimizador */}
            <img
              key={format}
              src={imageUrl(format)}
              alt={`Imagem da avaliação de ${title} para ${format === "story" ? "Stories" : "feed"}`}
              onLoad={() => setLoaded((l) => ({ ...l, [format]: true }))}
              className={cn("size-full object-cover transition-opacity duration-300", loaded[format] ? "opacity-100" : "opacity-0")}
            />
          </div>
        </div>

        <div className="grid gap-2 p-5">
          {canShareFiles && (
            <Button size="lg" onClick={shareNative} disabled={busy} className="w-full">
              <Share2 data-icon="inline-start" /> Compartilhar
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant={canShareFiles ? "secondary" : "default"} onClick={download} disabled={busy}>
              <Download data-icon="inline-start" /> Baixar imagem
            </Button>
            <Button variant="secondary" onClick={copyLink}>
              {copied ? <Check data-icon="inline-start" /> : <Link2 data-icon="inline-start" />}
              {copied ? "Link copiado" : "Copiar link"}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            {NETWORKS.map((n) => (
              <a
                key={n.name}
                href={n.href(text, pageUrl)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Postar no ${n.name}`}
                title={n.name}
                className="inline-flex size-11 items-center justify-center rounded-full bg-sunken text-ink transition-colors hover:bg-line"
              >
                <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]" style={{ fill: ["X", "Threads"].includes(n.name) ? "currentColor" : `#${n.icon.hex}` }}>
                  <path d={n.icon.path} />
                </svg>
              </a>
            ))}
          </div>
          <p className="mt-1 text-center text-xs text-ink-4">No Instagram, use a imagem: compartilhe ou baixe e poste nos Stories.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Botão que abre o compartilhamento. Só para a própria avaliação, e só com conta
 * (a imagem é gerada a partir da avaliação salva). Visitante vê o convite para entrar.
 */
export function ShareReviewButton({
  handle,
  bookId,
  title,
  rating,
  version,
  variant = "full",
}: {
  handle: string;
  bookId: string;
  title: string;
  rating: number | null;
  version: number;
  variant?: "full" | "icon";
}) {
  const [open, setOpen] = useState(false);
  if (variant === "icon") {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Compartilhar sua avaliação de ${title}`}
          className="inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-ink-3 transition-colors hover:bg-sunken hover:text-ink-2"
        >
          <Share2 className="size-3.5" aria-hidden /> Compartilhar
        </button>
        <ShareReviewDialog open={open} onOpenChange={setOpen} handle={handle} bookId={bookId} title={title} rating={rating} version={version} />
      </>
    );
  }
  return (
    <>
      <Button variant="secondary" className="mt-2 w-full" onClick={() => setOpen(true)}>
        <Share2 data-icon="inline-start" /> Compartilhar avaliação
      </Button>
      <ShareReviewDialog open={open} onOpenChange={setOpen} handle={handle} bookId={bookId} title={title} rating={rating} version={version} />
    </>
  );
}

/** Versão do painel do livro: aparece quando a pessoa já deu nota ou escreveu review. */
export function ShareMyReview({ bookId, title, rating, review, version }: { bookId: string; title: string; rating: number | null; review: string; version: number }) {
  const auth = useAuth();
  const { accounts } = useAuthFlags();
  if (!accounts || (rating === null && !review)) return null;
  if (auth.status === "guest") {
    return (
      <Link
        href={`/entrar?next=${encodeURIComponent(`/livro/${bookId}`)}`}
        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-sunken text-sm font-medium text-ink-2 transition-colors hover:bg-line"
      >
        <Share2 className="size-4" aria-hidden /> Entre para compartilhar
      </Link>
    );
  }
  if (auth.status !== "user") return null;
  return <ShareReviewButton handle={auth.profile.handle} bookId={bookId} title={title} rating={rating} version={version} />;
}
