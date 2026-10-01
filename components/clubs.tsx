"use client";

import { BookOpen, Check, Copy, Crown, Lock, LogOut, Plus, RefreshCw, Search, Trash2, UserMinus, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  createClubAction,
  deleteClubAction,
  getClub,
  joinClubAction,
  leaveClubAction,
  listMyClubs,
  previewInvite,
  regenerateInviteAction,
  removeMemberAction,
  updateClubAction,
  type ClubBook,
  type ClubError,
  type ClubMemberView,
  type ClubView,
} from "@/app/club-actions";
import { BookCover } from "@/components/book-cover";
import { DiscussionsSection } from "@/components/discussions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none placeholder:text-ink-4 focus:border-line-strong focus:shadow-[0_0_0_4px_var(--anil-soft)]";

const ERRORS: Record<ClubError, string> = {
  unauthenticated: "Entre na sua conta para continuar.",
  invalid: "Confira os campos: o nome precisa de 3 a 60 letras.",
  not_found: "Esse convite não vale mais. Peça um link novo a quem criou o clube.",
  plan: "Criar clubes é do plano Ex Libris.",
  limit_clubs: "Você já criou o máximo de clubes do seu plano.",
  full: "Esse clube está cheio.",
  blocked: "Você não pode entrar neste clube.",
  owner_cannot_leave: "Quem criou o clube não pode sair. Dá para apagar o clube.",
};

/** Redireciona para o login quem chegou sem conta. */
function useRequireLogin(next: string) {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (auth.status === "guest") router.replace(`/entrar?next=${encodeURIComponent(next)}`);
  }, [auth.status, router, next]);
  return auth.status === "user" ? auth.profile.id : null;
}

// ------------------------------------------------------------
// Lista de clubes
// ------------------------------------------------------------

export function ClubsPage() {
  const userId = useRequireLogin("/clubes");
  const router = useRouter();
  const [data, setData] = useState<Awaited<ReturnType<typeof listMyClubs>> | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (userId) void listMyClubs().then(setData, () => setData(null));
  }, [userId]);

  if (data === undefined) return <ListSkeleton />;
  if (data === null) return <p className="text-ink-3">Não foi possível carregar seus clubes.</p>;

  function joinWithCode(e: FormEvent) {
    e.preventDefault();
    // Aceita o link inteiro ou só o código.
    const c = code.trim().split("/").filter(Boolean).pop() ?? "";
    if (c) router.push(`/clubes/convite/${encodeURIComponent(c)}`);
  }

  return (
    <div className="max-w-3xl">
      <p className="text-sm font-medium text-anil">Clubes de leitura</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-title font-semibold text-ink">Seus clubes</h1>
        {data.canCreate && (
          <Button onClick={() => setCreating(true)}>
            <Plus data-icon="inline-start" /> Criar clube
          </Button>
        )}
      </div>
      <p className="mt-2 text-ink-3">Leiam o mesmo livro, vejam até onde cada um chegou e conversem sem spoiler.</p>

      {data.clubs.length ? (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {data.clubs.map((c) => (
            <li key={c.id}>
              <Link href={`/clubes/${c.id}`} className="flex h-full gap-4 rounded-2xl border border-line bg-surface p-4 shadow-card transition-colors hover:border-line-strong">
                {c.book ? <BookCover book={c.book} size="S" className="w-12 shrink-0" /> : <span className="flex h-[72px] w-12 shrink-0 items-center justify-center rounded bg-sunken"><BookOpen className="size-5 text-ink-4" aria-hidden /></span>}
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 font-medium text-ink">
                    {c.name}
                    {c.role === "owner" && <Crown className="size-3.5 text-ambar" aria-label="Você criou" />}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-ink-3">{c.book ? `Lendo ${c.book.title}` : "Sem livro escolhido"}</span>
                  <span className="mt-1 flex items-center gap-1 text-xs text-ink-4">
                    <Users className="size-3.5" aria-hidden /> {c.members} {c.members === 1 ? "pessoa" : "pessoas"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong px-6 py-10 text-center">
          <Users className="mx-auto size-6 text-ink-4" aria-hidden />
          <p className="mt-2 font-medium text-ink">Você ainda não está em nenhum clube</p>
          <p className="mt-1 text-sm text-ink-3">Entre pelo link que alguém te mandou ou crie o seu.</p>
        </div>
      )}

      <form onSubmit={joinWithCode} className="mt-8 flex flex-wrap items-end gap-2 rounded-2xl bg-sunken p-4">
        <label className="grid min-w-56 flex-1 gap-1.5">
          <span className="text-xs font-medium text-ink-3">Recebeu um convite?</span>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Cole o link ou o código" className={inputClass} />
        </label>
        <Button type="submit" variant="secondary" disabled={!code.trim()} className="bg-surface">
          Ver convite
        </Button>
      </form>

      {!data.canCreate && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-anil/30 bg-anil-soft/50 p-4">
          <p className="text-sm text-ink-2">
            {data.ownedLimit === 0
              ? `Criar clubes é do plano Ex Libris (você está no ${data.planName}). Entrar no clube de alguém é sempre grátis.`
              : `Você já criou ${data.owned} de ${data.ownedLimit} clubes.`}
          </p>
          {data.ownedLimit === 0 && (
            <Button size="sm" nativeButton={false} render={<Link href="/planos" />}>
              Conhecer o Ex Libris
            </Button>
          )}
        </div>
      )}

      {creating && (
        <ClubDialog
          title="Criar clube"
          onClose={() => setCreating(false)}
          onSubmit={async (v) => {
            const r = await createClubAction(v).catch(() => ({ ok: false as const, error: "invalid" as ClubError }));
            if (!r.ok) return ERRORS[r.error];
            toast("Clube criado", { description: "Agora é só mandar o link de convite." });
            router.push(`/clubes/${r.id}`);
            return null;
          }}
        />
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="grid max-w-3xl gap-4">
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-28 rounded-2xl" />
    </div>
  );
}

// ------------------------------------------------------------
// Criar / editar
// ------------------------------------------------------------

type ClubValues = { name: string; description: string; book: ClubBook | null };

function ClubDialog({ title, initial, onClose, onSubmit }: { title: string; initial?: ClubValues; onClose: () => void; onSubmit: (v: ClubValues) => Promise<string | null> }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [book, setBook] = useState<ClubBook | null>(initial?.book ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 3) return setError("Dê um nome com pelo menos 3 letras.");
    setSaving(true);
    setError(await onSubmit({ name: name.trim(), description: description.trim(), book }));
    setSaving(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto rounded-3xl p-0 sm:max-w-lg">
        <form onSubmit={submit}>
          <div className="border-b border-line p-5 pr-12">
            <DialogTitle className="text-lg font-semibold tracking-tight">{title}</DialogTitle>
            <DialogDescription className="mt-0.5 text-ink-3">Um nome, uma descrição e o livro que vocês vão ler.</DialogDescription>
          </div>
          <div className="grid gap-4 p-5">
            <label className="grid gap-1.5">
              <span className="text-xs font-medium text-ink-3">Nome do clube</span>
              <input value={name} onChange={(e) => setName(e.target.value.slice(0, 60))} maxLength={60} autoFocus placeholder="Clube das Terças" className={inputClass} />
            </label>
            <label className="grid gap-1.5">
              <span className="flex justify-between text-xs font-medium text-ink-3">
                Descrição <span className="tnum font-normal text-ink-4">{description.length}/500</span>
              </span>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 500))} maxLength={500} placeholder="Um livro por mês, encontro no fim." className="min-h-20 rounded-xl px-3 py-2.5 text-[0.9375rem] md:text-[0.9375rem]" />
            </label>
            <BookPicker book={book} onChange={setBook} />
            {error && <p className="text-sm text-destructive">{error}</p>}
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

/** Escolhe o livro do clube pela busca (Open Library). */
function BookPicker({ book, onChange }: { book: ClubBook | null; onChange: (b: ClubBook | null) => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ClubBook[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setResults([]);
    const t = setTimeout(() => {
      setSearching(true);
      void fetch(`/api/v1/books/search?q=${encodeURIComponent(term)}`)
        .then((r) => r.json())
        .then((d: { books: ClubBook[] }) => setResults(d.books.slice(0, 6)))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  if (book) {
    return (
      <div className="grid gap-1.5">
        <span className="text-xs font-medium text-ink-3">Livro do clube</span>
        <div className="flex items-center gap-3 rounded-xl border border-line p-2">
          <BookCover book={book} size="S" className="w-9 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-ink">{book.title}</span>
            <span className="block truncate text-xs text-ink-3">{book.author}</span>
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
            Trocar
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="grid gap-1.5">
      <span className="text-xs font-medium text-ink-3">Livro do clube (dá para escolher depois)</span>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-4" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar livro" aria-label="Buscar livro do clube" className={cn(inputClass, "pl-9")} />
      </div>
      {searching && <p className="text-xs text-ink-4">Buscando...</p>}
      {results.length > 0 && (
        <ul className="grid gap-1 rounded-xl border border-line p-1">
          {results.map((b) => (
            <li key={b.id}>
              <button type="button" onClick={() => onChange(b)} className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left hover:bg-sunken">
                <BookCover book={b} size="S" className="w-8 shrink-0" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{b.title}</span>
                  <span className="block truncate text-xs text-ink-3">{b.author}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Página do clube
// ------------------------------------------------------------

function percent(m: ClubMemberView) {
  if (m.finished) return 100;
  return m.page && m.totalPages ? Math.min(100, Math.round((m.page / m.totalPages) * 100)) : null;
}

export function ClubPage({ clubId }: { clubId: string }) {
  const userId = useRequireLogin(`/clubes/${clubId}`);
  const router = useRouter();
  const [club, setClub] = useState<ClubView | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(() => {
    void getClub(clubId).then(setClub, () => setClub(null));
  }, [clubId]);
  useEffect(() => {
    if (userId) load();
  }, [userId, load]);

  if (club === undefined) return <ListSkeleton />;
  if (club === null) {
    return (
      <div className="max-w-3xl rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
        <Lock className="mx-auto size-6 text-ink-4" aria-hidden />
        <p className="mt-2 font-medium text-ink">Clube não encontrado</p>
        <p className="mt-1 text-sm text-ink-3">Clubes são privados: só quem entrou pelo convite vê.</p>
        <Button className="mt-4" variant="secondary" nativeButton={false} render={<Link href="/clubes" />}>
          Ver meus clubes
        </Button>
      </div>
    );
  }

  const owner = club.role === "owner";
  const inviteUrl = club.inviteCode ? `${typeof window === "undefined" ? "" : window.location.origin}/clubes/convite/${club.inviteCode}` : null;
  const ranked = [...club.memberList].sort((a, b) => (percent(b) ?? -1) - (percent(a) ?? -1));

  async function leave() {
    if (!window.confirm("Sair do clube? Você deixa de ver o progresso e as discussões dele.")) return;
    const r = await leaveClubAction(club!.id);
    if (r.ok) {
      toast("Você saiu do clube");
      router.push("/clubes");
    } else toast.error(r.error ? ERRORS[r.error] : "Não foi possível sair");
  }

  return (
    <div className="max-w-4xl">
      <Link href="/clubes" className="text-sm font-medium text-ink-3 hover:text-ink">
        ← Clubes
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-title font-semibold text-ink">{club.name}</h1>
          {club.description && <p className="mt-1 max-w-2xl whitespace-pre-line text-ink-2">{club.description}</p>}
          <p className="mt-2 flex items-center gap-1.5 text-sm text-ink-3">
            <Lock className="size-3.5" aria-hidden /> Clube privado · {club.members} de {club.maxMembers} pessoas
          </p>
        </div>
        {owner ? (
          <Button variant="secondary" onClick={() => setEditing(true)}>
            Editar clube
          </Button>
        ) : (
          <Button variant="ghost" onClick={leave}>
            <LogOut data-icon="inline-start" /> Sair do clube
          </Button>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-3xl border border-line bg-surface p-5 shadow-card sm:p-6">
          {club.book ? (
            <>
              <div className="flex gap-4">
                <Link href={`/livro/${club.book.id}`} className="shrink-0">
                  <BookCover book={club.book} size="M" className="w-20" />
                </Link>
                <div className="min-w-0">
                  <p className="text-xs font-semibold tracking-wide text-ink-3 uppercase">Lendo agora</p>
                  <Link href={`/livro/${club.book.id}`} className="mt-1 block text-lg font-semibold text-ink hover:underline">
                    {club.book.title}
                  </Link>
                  <p className="text-sm text-ink-3">{club.book.author}</p>
                  <p className="mt-2 text-xs text-ink-4">O progresso vem do marcador de cada um, em Sua leitura na página do livro.</p>
                </div>
              </div>
              <h2 className="mt-6 text-sm font-semibold text-ink">Progresso do grupo</h2>
              <ul className="mt-3 grid gap-3">
                {ranked.map((m) => {
                  const pct = percent(m);
                  return (
                    <li key={m.handle} className="flex items-center gap-3">
                      <UserAvatar user={m} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm">
                          <span className="truncate font-medium text-ink">{m.name}</span>
                          {m.role === "owner" && <Crown className="size-3.5 shrink-0 text-ambar" aria-label="Criou o clube" />}
                          <span className="ml-auto shrink-0 text-xs text-ink-3">
                            {m.finished ? "Terminou" : m.page ? (m.totalPages ? `p. ${m.page} de ${m.totalPages}` : `p. ${m.page}`) : "Ainda não começou"}
                          </span>
                        </p>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${m.name}`}>
                          <div className={cn("h-full rounded-full", m.finished ? "bg-musgo" : "bg-ameixa")} style={{ width: `${pct ?? 0}%` }} />
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <div className="py-6 text-center">
              <BookOpen className="mx-auto size-6 text-ink-4" aria-hidden />
              <p className="mt-2 font-medium text-ink">Nenhum livro escolhido</p>
              <p className="mt-1 text-sm text-ink-3">{owner ? "Escolha o livro do clube em Editar clube." : "Quem criou o clube ainda vai escolher o livro."}</p>
            </div>
          )}
        </section>

        <aside className="grid content-start gap-4">
          {owner && inviteUrl && (
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <p className="text-sm font-semibold text-ink">Convidar</p>
              <p className="mt-1 text-xs text-ink-3">Quem tiver este link entra no clube, mesmo no plano grátis.</p>
              <div className="mt-3 flex gap-2">
                <input readOnly value={inviteUrl} aria-label="Link de convite" className={cn(inputClass, "h-9 min-w-0 flex-1 text-xs")} onFocus={(e) => e.target.select()} />
                <Button
                  size="sm"
                  variant="secondary"
                  aria-label="Copiar link"
                  onClick={async () => {
                    await navigator.clipboard?.writeText(inviteUrl);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  {copied ? <Check /> : <Copy />}
                </Button>
              </div>
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-3 hover:text-ink"
                onClick={async () => {
                  if (!window.confirm("Criar um link novo? O link atual deixa de funcionar.")) return;
                  const r = await regenerateInviteAction(club.id);
                  if (r.ok) {
                    toast("Link novo criado");
                    load();
                  }
                }}
              >
                <RefreshCw className="size-3.5" aria-hidden /> Criar link novo
              </button>
            </div>
          )}
          {owner && club.memberList.length > 1 && (
            <div className="rounded-3xl border border-line bg-surface p-5 shadow-card">
              <p className="text-sm font-semibold text-ink">Membros</p>
              <ul className="mt-2 grid gap-1">
                {club.memberList
                  .filter((m) => m.role !== "owner")
                  .map((m) => (
                    <li key={m.handle} className="flex items-center justify-between gap-2 text-sm">
                      <span className="truncate text-ink-2">{m.name}</span>
                      <button
                        type="button"
                        aria-label={`Tirar ${m.name} do clube`}
                        title="Tirar do clube"
                        className="inline-flex size-8 items-center justify-center rounded-full text-ink-4 hover:bg-sunken hover:text-ink"
                        onClick={async () => {
                          if (!window.confirm(`Tirar ${m.name} do clube?`)) return;
                          const r = await removeMemberAction(club.id, m.handle);
                          if (r.ok) load();
                        }}
                      >
                        <UserMinus className="size-4" />
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {club.book && (
        <section className="mt-10 max-w-3xl">
          <h2 className="text-lg font-semibold text-ink">Discussões do clube</h2>
          <p className="mb-4 text-sm text-ink-3">Só os membros veem. Cada mensagem diz até que página fala.</p>
          <DiscussionsSection book={{ id: club.book.id, title: club.book.title }} clubId={club.id} />
        </section>
      )}

      {editing && (
        <ClubDialog
          title="Editar clube"
          initial={{ name: club.name, description: club.description, book: club.book }}
          onClose={() => setEditing(false)}
          onSubmit={async (v) => {
            const r = await updateClubAction(club.id, v).catch(() => ({ ok: false, error: "invalid" as ClubError }));
            if (!r.ok) return ERRORS[r.error ?? "invalid"];
            setEditing(false);
            toast("Clube atualizado");
            load();
            return null;
          }}
        />
      )}

      {owner && (
        <div className="mt-12 border-t border-line pt-6">
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!window.confirm("Apagar o clube? As discussões dele também somem. Não dá para desfazer.")) return;
              const r = await deleteClubAction(club.id);
              if (r.ok) {
                toast("Clube apagado");
                router.push("/clubes");
              }
            }}
          >
            <Trash2 data-icon="inline-start" /> Apagar clube
          </Button>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Convite
// ------------------------------------------------------------

export function InvitePage({ code }: { code: string }) {
  const userId = useRequireLogin(`/clubes/convite/${code}`);
  const router = useRouter();
  const [invite, setInvite] = useState<Awaited<ReturnType<typeof previewInvite>> | undefined>(undefined);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (userId) void previewInvite(code).then(setInvite, () => setInvite(null));
  }, [userId, code]);

  if (invite === undefined) return <ListSkeleton />;
  if (invite === null) {
    return (
      <div className="max-w-md rounded-2xl border border-dashed border-line-strong px-6 py-12 text-center">
        <p className="font-medium text-ink">Convite inválido</p>
        <p className="mt-1 text-sm text-ink-3">{ERRORS.not_found}</p>
      </div>
    );
  }

  async function join() {
    setJoining(true);
    const r = await joinClubAction(code).catch(() => ({ ok: false as const, error: "not_found" as ClubError }));
    setJoining(false);
    if (!r.ok) return toast.error(ERRORS[r.error]);
    toast("Bem-vindo ao clube");
    router.push(`/clubes/${r.id}`);
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-line bg-surface p-6 text-center shadow-card sm:p-8">
      <p className="text-sm font-medium text-anil">Convite para clube de leitura</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">{invite.name}</h1>
      {invite.description && <p className="mt-2 text-ink-2">{invite.description}</p>}
      <p className="mt-2 text-sm text-ink-3">
        Criado por {invite.ownerName} · {invite.members} {invite.members === 1 ? "pessoa" : "pessoas"}
      </p>
      {invite.book && (
        <div className="mx-auto mt-5 flex max-w-xs items-center gap-3 rounded-2xl bg-sunken p-3 text-left">
          <BookCover book={invite.book} size="S" className="w-10 shrink-0" />
          <span className="min-w-0">
            <span className="block text-xs text-ink-3">Lendo agora</span>
            <span className="block truncate font-medium text-ink">{invite.book.title}</span>
          </span>
        </div>
      )}
      {invite.alreadyMember ? (
        <Button className="mt-6 w-full" nativeButton={false} render={<Link href={`/clubes/${invite.id}`} />}>
          Você já está no clube
        </Button>
      ) : (
        <>
          <Button className="mt-6 w-full" onClick={join} disabled={joining}>
            {joining ? "Entrando..." : "Entrar no clube"}
          </Button>
          <p className="mt-3 text-xs text-ink-4">
            No clube, os outros membros veem seu nome, sua foto e até que página você leu do livro do clube. Suas outras anotações continuam só suas.
          </p>
        </>
      )}
    </div>
  );
}
