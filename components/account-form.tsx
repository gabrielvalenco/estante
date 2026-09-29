"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/actions";
import { AvatarEditor } from "@/components/avatar-editor";
import { BlockedSection, DataSection, PasswordSection, PrivacySection, SocialsSection } from "@/components/account-sections";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { updateProfile, useAuth, useAuthFlags, type Profile } from "@/lib/auth";
import { useLibrary } from "@/lib/library";
import { cn } from "@/lib/utils";

const TONES = [
  { value: "anil", label: "Anil", className: "bg-anil" },
  { value: "ameixa", label: "Ameixa", className: "bg-ameixa" },
  { value: "musgo", label: "Musgo", className: "bg-musgo" },
  { value: "ambar", label: "Âmbar", className: "bg-ambar" },
];

type Draft = Pick<Profile, "name" | "handle" | "bio" | "goal" | "tone" | "favorites">;

export function AccountForm() {
  const auth = useAuth();
  const router = useRouter();
  const { accounts } = useAuthFlags();

  // Só manda para o login quem chegou aqui sem conta. Quem acabou de sair
  // já está sendo levado para a home pelo menu; redirecionar aqui seria uma corrida.
  const wasUser = useRef(false);
  useEffect(() => {
    if (auth.status === "user") wasUser.current = true;
    if (auth.status === "guest" && !wasUser.current) router.replace("/entrar?next=/conta");
  }, [auth.status, router]);

  if (!accounts) {
    return <p className="text-ink-3">Contas estão desativadas nesta versão de demonstração.</p>;
  }
  if (auth.status !== "user") return <FormSkeleton />;
  return (
    <>
      <Form key={auth.profile.id} profile={auth.profile} />
      <PrivacySection profile={auth.profile} />
      <SocialsSection profile={auth.profile} />
      {auth.hasPassword && <PasswordSection />}
      <BlockedSection />
      <DataSection handle={auth.profile.handle} />
    </>
  );
}

function Form({ profile }: { profile: Profile }) {
  const library = useLibrary();
  const [draft, setDraft] = useState<Draft>({
    name: profile.name,
    handle: profile.handle,
    bio: profile.bio,
    goal: profile.goal,
    tone: profile.tone,
    favorites: profile.favorites,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Draft, string>>>({});
  const [saving, setSaving] = useState(false);

  const read = Object.values(library)
    .filter((e) => e.status === "lido")
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  function toggleFavorite(id: string) {
    const has = draft.favorites.includes(id);
    if (!has && draft.favorites.length >= 4) {
      toast("Escolha no máximo 4 favoritos", { description: "Tire um para colocar outro." });
      return;
    }
    set("favorites", has ? draft.favorites.filter((f) => f !== id) : [...draft.favorites, id]);
  }

  function validate(): boolean {
    const next: typeof errors = {};
    if (!draft.name.trim()) next.name = "Diga como quer ser chamado.";
    if (!/^[a-z0-9_]{3,20}$/.test(draft.handle)) next.handle = "De 3 a 20 caracteres: letras minúsculas, números e _.";
    if (!(draft.goal >= 1 && draft.goal <= 365)) next.goal = "Entre 1 e 365 livros.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const result = await updateProfileAction({
      ...draft,
      tone: draft.tone as "anil" | "ameixa" | "musgo" | "ambar",
    }).catch(() => ({ ok: false as const, error: "unavailable" as const }));
    setSaving(false);

    if (!result.ok) {
      if (result.error === "handle_taken") setErrors({ handle: "Esse @ já é de outra pessoa." });
      else if (result.error === "name_taken") setErrors({ name: "Já existe alguém com esse nome. Que tal um sobrenome ou apelido?" });
      else if (result.error === "handle_unavailable") setErrors({ handle: "Esse @ não está disponível." });
      else toast.error("Não foi possível salvar", { description: "Tente de novo em instantes." });
      return;
    }
    updateProfile(result.profile);
    toast("Perfil atualizado");
  }

  return (
    <form onSubmit={save} className="max-w-2xl" noValidate>
      <div className="flex items-center gap-4">
        <AvatarEditor profile={profile} preview={draft} />
        <div>
          <h1 className="text-title font-semibold text-ink">Configurações</h1>
          <p className="text-sm text-ink-3">@{profile.handle}</p>
        </div>
      </div>

      <div className="mt-10 grid gap-6">
        <Field label="Nome" error={errors.name}>
          <input value={draft.name} maxLength={60} onChange={(e) => set("name", e.target.value)} className={inputClass} aria-invalid={Boolean(errors.name) || undefined} />
        </Field>

        <Field label="Endereço do perfil" error={errors.handle} hint={`/u/${draft.handle || "..."}`}>
          <div className="relative">
            <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-4">@</span>
            <input
              value={draft.handle}
              maxLength={20}
              autoCapitalize="none"
              spellCheck={false}
              onChange={(e) => set("handle", e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              className={cn(inputClass, "pl-8")}
              aria-invalid={Boolean(errors.handle) || undefined}
            />
          </div>
        </Field>

        <Field label="Bio" hint={`${draft.bio.length}/200`}>
          <Textarea
            value={draft.bio}
            maxLength={200}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="O que você gosta de ler?"
            className="min-h-24 rounded-xl px-4 py-3 text-base md:text-base"
          />
        </Field>

        <div className="grid gap-6 sm:grid-cols-2">
          <Field label={`Meta de livros em ${new Date().getFullYear()}`} error={errors.goal}>
            <input
              type="number"
              min={1}
              max={365}
              value={draft.goal}
              onChange={(e) => set("goal", Number(e.target.value))}
              className={cn(inputClass, "tnum")}
              aria-invalid={Boolean(errors.goal) || undefined}
            />
          </Field>

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-ink-3">Cor do avatar</legend>
            <div className="flex h-12 items-center gap-3">
              {TONES.map((t) => (
                <label key={t.value} className="relative cursor-pointer">
                  <input type="radio" name="tone" value={t.value} checked={draft.tone === t.value} onChange={() => set("tone", t.value)} className="peer sr-only" />
                  <span className={cn("flex size-9 items-center justify-center rounded-full ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-anil", t.className)}>
                    {draft.tone === t.value && <Check className="size-4 text-on-brand" aria-hidden />}
                  </span>
                  <span className="sr-only">{t.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <fieldset>
          <legend className="text-xs font-medium text-ink-3">
            Favoritos <span className="font-normal text-ink-4">({draft.favorites.length}/4, aparecem no topo do perfil)</span>
          </legend>
          {read.length ? (
            <ul className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {read.map((e) => {
                const i = draft.favorites.indexOf(e.book.id);
                return (
                  <li key={e.book.id}>
                    <button
                      type="button"
                      onClick={() => toggleFavorite(e.book.id)}
                      aria-pressed={i >= 0}
                      aria-label={`${e.book.title}${i >= 0 ? `, favorito ${i + 1}` : ""}`}
                      className={cn("relative block w-full rounded-md transition", i >= 0 ? "ring-3 ring-anil ring-offset-2" : "opacity-80 hover:opacity-100")}
                    >
                      <BookCover book={e.book} size="M" />
                      {i >= 0 && (
                        <span className="tnum absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full bg-anil text-xs font-semibold text-on-brand">
                          {i + 1}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-3">
              Marque livros como lidos para escolher seus favoritos.{" "}
              <Link href="/livros" className="font-medium text-anil">
                Explorar livros
              </Link>
            </p>
          )}
        </fieldset>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] mt-10 md:bottom-0 flex items-center justify-end gap-3 border-t border-line bg-canvas/90 py-4 backdrop-blur">
        <Button variant="ghost" render={<Link href={`/u/${profile.handle}`} />} nativeButton={false}>
          Ver meu perfil
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </form>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-4 focus:border-line-strong focus:shadow-[0_0_0_4px_var(--anil-soft)] aria-invalid:border-destructive";

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex justify-between gap-3 text-xs font-medium text-ink-3">
        {label}
        {hint && <span className="truncate font-normal text-ink-4">{hint}</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="text-sm text-destructive">
          {error}
        </span>
      )}
    </label>
  );
}

function FormSkeleton() {
  return (
    <div className="max-w-2xl" aria-busy aria-label="Carregando">
      <div className="flex items-center gap-4">
        <Skeleton className="size-16 rounded-full" />
        <Skeleton className="h-10 w-56" />
      </div>
      <div className="mt-10 grid gap-6">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[4.5rem] w-full" />
        ))}
      </div>
    </div>
  );
}
