"use client";

import { EyeOff, Flag, MessagesSquare, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  createThreadAction,
  deletePostAction,
  deleteThreadAction,
  getThread,
  listThreads,
  replyAction,
  reportAction,
  type DiscussionError,
  type PostView,
  type ThreadUsage,
  type ThreadView,
  type Viewer,
} from "@/app/discussion-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth, useAuthFlags } from "@/lib/auth";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none placeholder:text-ink-4 focus:border-line-strong focus:shadow-[0_0_0_4px_var(--anil-soft)]";

const ERRORS: Record<DiscussionError, string> = {
  unauthenticated: "Entre na sua conta para participar.",
  invalid: "Confira os campos: o título precisa de pelo menos 3 letras.",
  not_found: "Essa discussão não existe mais.",
  blocked: "Você não pode participar desta discussão.",
  limit_threads: "",
  rate_limited: "Muitas mensagens seguidas. Espere um pouco e tente de novo.",
  unavailable: "Não foi possível publicar. Tente de novo.",
};

function ago(ts: number) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d < 30 ? `há ${d} d` : new Date(ts).toLocaleDateString("pt-BR");
}

const pageLabel = (page: number) => (page === 0 ? "Sem spoiler" : `Até a p. ${page}`);

/** Explica o que a pessoa está vendo: até onde leu e se os spoilers estão escondidos. */
function ViewerNote({ viewer, onReveal }: { viewer: Viewer; onReveal: (reveal: boolean) => void }) {
  if (viewer.finished) return <p className="text-xs text-ink-3">Você já leu este livro: nada fica escondido.</p>;
  if (viewer.revealed || viewer.page === null) {
    return (
      <p className="text-xs text-ink-3">
        Mostrando spoilers.{" "}
        <button type="button" onClick={() => onReveal(false)} className="font-medium text-anil hover:underline">
          Esconder de novo
        </button>
      </p>
    );
  }
  return (
    <p className="text-xs text-ink-3">
      {viewer.loggedIn
        ? viewer.page
          ? `Você está na página ${viewer.page}: o que vem depois fica escondido.`
          : "Marque sua página em Sua leitura para ver o que já leu. Por enquanto, só o que é sem spoiler."
        : "Sem conta, você vê só o que é sem spoiler."}{" "}
      <button type="button" onClick={() => onReveal(true)} className="font-medium text-anil hover:underline">
        Mostrar spoilers
      </button>
    </p>
  );
}

// ------------------------------------------------------------
// Lista de discussões na página do livro
// ------------------------------------------------------------

export function DiscussionsSection({ book }: { book: { id: string; title: string } }) {
  const auth = useAuth();
  const { accounts } = useAuthFlags();
  const [data, setData] = useState<{ threads: ThreadView[]; viewer: Viewer; usage: ThreadUsage | null } | null>(null);
  const [reveal, setReveal] = useState(false);
  const [creating, setCreating] = useState(false);
  const userId = auth.status === "user" ? auth.profile.id : null;

  const load = useCallback(() => {
    void listThreads(book.id, reveal).then(setData, () => setData({ threads: [], viewer: { loggedIn: false, page: 0, finished: false, revealed: false }, usage: null }));
  }, [book.id, reveal]);
  useEffect(() => {
    if (auth.status !== "loading") load();
  }, [load, auth.status, userId]);

  if (!accounts) return null;
  if (!data) return <Skeleton className="h-40 rounded-2xl" />;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewerNote viewer={data.viewer} onReveal={setReveal} />
        {auth.status === "user" ? (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" /> Nova discussão
          </Button>
        ) : (
          <Button size="sm" variant="secondary" nativeButton={false} render={<Link href={`/entrar?next=/livro/${book.id}`} />}>
            Entrar para discutir
          </Button>
        )}
      </div>

      {data.threads.length ? (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-card">
          {data.threads.map((t) => (
            <li key={t.id}>
              <Link href={`/livro/${book.id}/discussao/${t.id}`} className="flex gap-3 p-4 transition-colors hover:bg-sunken/60 sm:p-5">
                <UserAvatar user={t.author} size={32} href={false} />
                <div className="min-w-0 flex-1">
                  {t.spoiler ? (
                    <p className="flex items-center gap-1.5 font-medium text-ink-3">
                      <EyeOff className="size-4 shrink-0" aria-hidden /> Spoiler: fala da página {t.page}
                    </p>
                  ) : (
                    <p className="line-clamp-2 font-medium text-ink">{t.title}</p>
                  )}
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-3">
                    <span className="font-medium text-ink-2">{t.author.name}</span>
                    <span className={cn("rounded-full px-2 py-0.5 font-medium", t.page ? "bg-ambar-soft text-ambar-ink" : "bg-musgo-soft text-musgo")}>{pageLabel(t.page)}</span>
                    <span className="tnum">
                      {t.replyCount} {t.replyCount === 1 ? "resposta" : "respostas"}
                    </span>
                    <span>{ago(t.lastActivityAt)}</span>
                    {t.hidden && <span className="text-destructive">escondida por denúncias</span>}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
          <MessagesSquare className="mx-auto size-6 text-ink-4" aria-hidden />
          <p className="mt-2 font-medium text-ink">Nenhuma discussão ainda</p>
          <p className="mt-1 text-sm text-ink-3">Comece uma conversa: cada mensagem diz até que página ela fala, e ninguém leva spoiler.</p>
        </div>
      )}

      {creating && (
        <NewThreadDialog
          book={book}
          defaultPage={data.viewer.page ?? 0}
          usage={data.usage}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
}

/** Campo "até que página esta mensagem fala", com o atalho "sem spoiler". */
function PageField({ page, setPage }: { page: string; setPage: (v: string) => void }) {
  const none = page === "" || page === "0";
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-ink-3">Até que página isto fala?</span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPage("0")}
          aria-pressed={none}
          className={cn("h-9 rounded-full px-3 text-sm font-medium", none ? "bg-musgo text-on-brand" : "bg-sunken text-ink-2 hover:bg-line")}
        >
          Sem spoiler
        </button>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          ou até a página
          <input
            inputMode="numeric"
            value={none ? "" : page}
            onChange={(e) => setPage(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="120"
            aria-label="Página"
            className={cn(inputClass, "tnum h-9 w-24")}
          />
        </label>
      </div>
      <span className="text-xs text-ink-4">Quem ainda não chegou nessa página vê só um aviso de spoiler.</span>
    </div>
  );
}

function NewThreadDialog({
  book,
  defaultPage,
  usage,
  onClose,
  onCreated,
}: {
  book: { id: string; title: string };
  defaultPage: number;
  usage: ThreadUsage | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [page, setPage] = useState(String(defaultPage));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (title.trim().length < 3) return setError("Dê um título com pelo menos 3 letras.");
    if (!body.trim()) return setError("Escreva o que você quer discutir.");
    setSaving(true);
    setError(null);
    const r = await createThreadAction({ book, title, body, page: Number(page) || 0 }).catch(() => ({ ok: false as const, error: "unavailable" as DiscussionError }));
    setSaving(false);
    if (!r.ok) {
      if (r.error === "limit_threads" && "usage" in r && r.usage) {
        return setError(`O plano ${r.usage.planName} abre até ${r.usage.threadsPerMonthLimit} discussões por mês. Responder continua livre, e o Capa Dura, que chega em breve, libera discussões ilimitadas.`);
      }
      return setError(ERRORS[r.error]);
    }
    toast("Discussão publicada");
    onCreated();
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-lg">
        <form onSubmit={submit}>
          <div className="border-b border-line p-5 pr-12">
            <DialogTitle className="text-lg font-semibold tracking-tight">Nova discussão</DialogTitle>
            <DialogDescription className="mt-0.5 truncate text-ink-3">{book.title}</DialogDescription>
          </div>
          <div className="grid gap-4 p-5">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-ink-3">Título</span>
              <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} maxLength={120} autoFocus placeholder="Sobre o que vamos conversar?" className={inputClass} />
            </label>
            <label className="grid gap-1.5">
              <span className="flex justify-between text-xs font-medium text-ink-3">
                Mensagem <span className="tnum font-normal text-ink-4">{body.length}/4000</span>
              </span>
              <Textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 4000))} maxLength={4000} className="min-h-32 rounded-xl px-3 py-2.5 text-[0.9375rem] md:text-[0.9375rem]" />
            </label>
            <PageField page={page} setPage={setPage} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-ink-4">
              Discussões são públicas, mesmo com o perfil privado.
              {usage?.threadsPerMonthLimit != null && ` ${usage.threadsThisMonth} de ${usage.threadsPerMonthLimit} discussões novas neste mês no plano ${usage.planName}.`}
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-line p-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Publicando..." : "Publicar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------
// Página de uma discussão
// ------------------------------------------------------------

type ThreadData = NonNullable<Awaited<ReturnType<typeof getThread>>>;

export function ThreadPage({ threadId, bookId }: { threadId: string; bookId: string }) {
  const auth = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ThreadData | null | undefined>(undefined);
  const [reveal, setReveal] = useState(false);
  const userId = auth.status === "user" ? auth.profile.id : null;

  const load = useCallback(() => {
    void getThread(threadId, reveal).then(setData, () => setData(null));
  }, [threadId, reveal]);
  useEffect(() => {
    if (auth.status !== "loading") load();
  }, [load, auth.status, userId]);

  if (data === undefined) {
    return (
      <div className="grid max-w-3xl gap-4">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
    );
  }
  if (data === null) {
    return (
      <div className="max-w-3xl rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
        <p className="font-medium text-ink">Discussão não encontrada</p>
        <p className="mt-1 text-sm text-ink-3">Ela pode ter sido apagada ou escondida por denúncias.</p>
        <Button className="mt-4" variant="secondary" nativeButton={false} render={<Link href={`/livro/${bookId}`} />}>
          Voltar ao livro
        </Button>
      </div>
    );
  }

  const { thread, posts, viewer, book } = data;

  async function removeThread() {
    if (!window.confirm("Apagar esta discussão e todas as respostas?")) return;
    const r = await deleteThreadAction(thread.id);
    if (r.ok) {
      toast("Discussão apagada");
      router.push(`/livro/${book.id}`);
    } else toast.error("Não foi possível apagar");
  }

  return (
    <div className="max-w-3xl">
      <Link href={`/livro/${book.id}`} className="text-sm font-medium text-ink-3 hover:text-ink">
        ← {book.title}
      </Link>

      <article className="mt-4 rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
        <header className="flex items-start gap-3">
          <UserAvatar user={thread.author} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <Link href={`/u/${thread.author.handle}`} className="font-semibold text-ink hover:underline">
                {thread.author.name}
              </Link>{" "}
              <span className="text-ink-4">· {ago(thread.createdAt)}</span>
            </p>
            <PageBadge page={thread.page} />
          </div>
          <ItemActions mine={thread.mine} onDelete={removeThread} kind="thread" id={thread.id} loggedIn={viewer.loggedIn} />
        </header>
        {thread.spoiler ? (
          <SpoilerCard page={thread.page} onReveal={() => setReveal(true)} />
        ) : (
          <>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-ink">{thread.title}</h1>
            <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-2">{thread.body}</p>
          </>
        )}
        {thread.hidden && <p className="mt-3 text-sm text-destructive">Escondida por denúncias: só você vê.</p>}
      </article>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          {posts.length} {posts.length === 1 ? "resposta" : "respostas"}
        </h2>
        <ViewerNote viewer={viewer} onReveal={setReveal} />
      </div>

      <ul className="mt-3 grid gap-3">
        {posts.map((p) => (
          <PostItem key={p.id} post={p} loggedIn={viewer.loggedIn} onReveal={() => setReveal(true)} onDeleted={load} />
        ))}
      </ul>

      {viewer.loggedIn ? (
        <ReplyForm threadId={thread.id} defaultPage={viewer.page ?? thread.page} onSent={load} />
      ) : (
        <div className="mt-6 rounded-2xl bg-sunken p-5 text-center text-sm text-ink-3">
          <Link href={`/entrar?next=/livro/${book.id}/discussao/${thread.id}`} className="font-medium text-anil hover:underline">
            Entre
          </Link>{" "}
          para responder.
        </div>
      )}
    </div>
  );
}

function PageBadge({ page }: { page: number }) {
  return (
    <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium", page ? "bg-ambar-soft text-ambar-ink" : "bg-musgo-soft text-musgo")}>{pageLabel(page)}</span>
  );
}

function SpoilerCard({ page, onReveal }: { page: number; onReveal: () => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-sunken px-4 py-3 text-sm text-ink-3">
      <EyeOff className="size-4 shrink-0" aria-hidden />
      <span className="flex-1">Fala da página {page}, que você ainda não leu.</span>
      <button type="button" onClick={onReveal} className="font-medium text-anil hover:underline">
        Mostrar mesmo assim
      </button>
    </div>
  );
}

function PostItem({ post, loggedIn, onReveal, onDeleted }: { post: PostView; loggedIn: boolean; onReveal: () => void; onDeleted: () => void }) {
  async function remove() {
    if (!window.confirm("Apagar sua resposta?")) return;
    const r = await deletePostAction(post.id);
    if (r.ok) {
      toast("Resposta apagada");
      onDeleted();
    } else toast.error("Não foi possível apagar");
  }
  return (
    <li className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <UserAvatar user={post.author} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-sm">
            <Link href={`/u/${post.author.handle}`} className="font-semibold text-ink hover:underline">
              {post.author.name}
            </Link>{" "}
            <span className="text-ink-4">· {ago(post.createdAt)}</span>
          </p>
          <PageBadge page={post.page} />
        </div>
        <ItemActions mine={post.mine} onDelete={remove} kind="post" id={post.id} loggedIn={loggedIn} />
      </div>
      {post.spoiler ? <SpoilerCard page={post.page} onReveal={onReveal} /> : <p className="mt-3 leading-relaxed whitespace-pre-line text-ink-2">{post.body}</p>}
      {post.hidden && <p className="mt-2 text-sm text-destructive">Escondida por denúncias: só você vê.</p>}
    </li>
  );
}

/** Apagar (o que é seu) ou denunciar (o que é dos outros). */
function ItemActions({ mine, onDelete, kind, id, loggedIn }: { mine: boolean; onDelete: () => void; kind: "thread" | "post"; id: string; loggedIn: boolean }) {
  const [reported, setReported] = useState(false);
  if (mine) {
    return (
      <button type="button" onClick={onDelete} aria-label="Apagar" title="Apagar" className="inline-flex size-8 items-center justify-center rounded-full text-ink-4 hover:bg-sunken hover:text-ink">
        <Trash2 className="size-4" />
      </button>
    );
  }
  if (!loggedIn) return null;
  return (
    <button
      type="button"
      disabled={reported}
      aria-label="Denunciar"
      title={reported ? "Denunciado" : "Denunciar"}
      onClick={async () => {
        if (!window.confirm("Denunciar por spoiler sem aviso, ofensa ou spam? Com 3 denúncias, a mensagem some da discussão.")) return;
        const r = await reportAction(kind, id);
        if (r.ok) {
          setReported(true);
          toast("Denúncia enviada", { description: "Obrigado por ajudar a manter a conversa boa." });
        } else toast.error("Não foi possível denunciar");
      }}
      className="inline-flex size-8 items-center justify-center rounded-full text-ink-4 hover:bg-sunken hover:text-ink disabled:opacity-40"
    >
      <Flag className="size-4" />
    </button>
  );
}

function ReplyForm({ threadId, defaultPage, onSent }: { threadId: string; defaultPage: number; onSent: () => void }) {
  const [body, setBody] = useState("");
  const [page, setPage] = useState(String(defaultPage));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    setError(null);
    const r = await replyAction(threadId, { body, page: Number(page) || 0 }).catch(() => ({ ok: false as const, error: "unavailable" as DiscussionError }));
    setSaving(false);
    if (!r.ok) return setError(ERRORS[r.error]);
    setBody("");
    toast("Resposta publicada");
    onSent();
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <label className="grid gap-1.5">
        <span className="text-xs font-medium text-ink-3">Sua resposta</span>
        <Textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, 4000))} maxLength={4000} placeholder="O que você achou?" className="min-h-24 rounded-xl px-3 py-2.5 text-[0.9375rem] md:text-[0.9375rem]" />
      </label>
      <PageField page={page} setPage={setPage} />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="submit" disabled={saving || !body.trim()}>
          {saving ? "Publicando..." : "Responder"}
        </Button>
      </div>
    </form>
  );
}
