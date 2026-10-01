"use client";

import { BadgeCheck, Ban, Download, Upload, Eye, EyeOff, Lock, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { changePasswordAction, deleteAccountAction, setPrivacyAction, updateSocialsAction } from "@/app/account-actions";
import { getPlanStatus } from "@/app/billing-actions";
import { getBlockedReaders, setBlockAction } from "@/app/social-actions";
import { PlatformSelect } from "@/components/platform-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { setBlocked, updateProfile, type Profile } from "@/lib/auth";
import type { ProfileCard } from "@/lib/db/types";
import { MAX_SOCIALS, PLATFORM_KEYS, PLATFORMS, VERIFIABLE, type Platform } from "@/lib/socials";
import { cn } from "@/lib/utils";

/** Seções extras de Configurações, cada uma com o próprio botão de salvar. */

function Section({ id, title, description, children }: { id: string; title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="mt-14 max-w-2xl scroll-mt-20 border-t border-line pt-10">
      <h2 className="text-section font-semibold text-ink">{title}</h2>
      {description && <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-3">{description}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-4 focus:border-line-strong focus:shadow-[0_0_0_4px_var(--anil-soft)] aria-invalid:border-destructive";

// ------------------------------------------------------------
// Privacidade
// ------------------------------------------------------------

export function PrivacySection({ profile }: { profile: Profile }) {
  const [saving, setSaving] = useState(false);

  async function toggle() {
    const next = !profile.isPrivate;
    setSaving(true);
    const r = await setPrivacyAction(next).catch(() => ({ ok: false as const }));
    setSaving(false);
    if (!r.ok) return toast.error("Não foi possível mudar a privacidade");
    updateProfile(r.profile);
    toast(next ? "Seu perfil agora é privado" : "Seu perfil agora é público", {
      description: next ? "Novos seguidores precisam de aprovação." : "Pedidos pendentes foram aceitos.",
    });
  }

  return (
    <Section
      id="privacidade"
      title="Privacidade"
      description="Num perfil privado, quem quiser seguir você precisa pedir, e só seguidores aprovados veem sua estante, seu diário e suas reviews. Seu nome e seu @ continuam aparecendo na busca."
    >
      <button
        type="button"
        role="switch"
        aria-checked={profile.isPrivate}
        onClick={toggle}
        disabled={saving}
        className="flex w-full items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong"
      >
        <span className="flex items-center gap-3">
          <span className={cn("flex size-10 items-center justify-center rounded-full", profile.isPrivate ? "bg-anil-soft text-anil" : "bg-sunken text-ink-3")}>
            <Lock className="size-[18px]" aria-hidden />
          </span>
          <span>
            <span className="block font-medium text-ink">Perfil privado</span>
            <span className="block text-sm text-ink-3">{profile.isPrivate ? "Só seguidores aprovados veem suas leituras" : "Qualquer pessoa vê suas leituras"}</span>
          </span>
        </span>
        <span className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", profile.isPrivate ? "bg-anil" : "bg-line-strong")}>
          <span
            className={cn(
              "absolute top-1 left-1 size-5 rounded-full bg-white shadow-sm transition-transform duration-200",
              profile.isPrivate && "translate-x-5",
            )}
          />
        </span>
      </button>
    </Section>
  );
}

// ------------------------------------------------------------
// Redes sociais
// ------------------------------------------------------------

type Row = { platform: Platform; handle: string };

export function SocialsSection({ profile }: { profile: Profile }) {
  const [rows, setRows] = useState<Row[]>(profile.socials.map((s) => ({ platform: s.platform, handle: s.handle })));
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const address = typeof window === "undefined" ? `/u/${profile.handle}` : `${window.location.host}/u/${profile.handle}`;

  const used = new Set(rows.map((r) => r.platform));
  const nextPlatform = PLATFORM_KEYS.find((p) => !used.has(p)) ?? "instagram";

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const r = await updateSocialsAction(rows).catch(() => ({ ok: false as const, errors: [{ index: -1, message: "Tente de novo em instantes." }] }));
    setSaving(false);
    if (!r.ok) {
      setErrors(Object.fromEntries(r.errors.map((x) => [x.index, x.message])));
      if (r.errors.some((x) => x.index === -1)) toast.error(r.errors.find((x) => x.index === -1)!.message);
      return;
    }
    setErrors({});
    updateProfile(r.profile);
    setRows(r.profile.socials.map((s) => ({ platform: s.platform, handle: s.handle })));
    const verified = r.profile.socials.filter((s) => s.verified).length;
    toast("Redes salvas", { description: verified ? `${verified} verificada${verified > 1 ? "s" : ""}.` : undefined });
  }

  return (
    <Section
      id="redes"
      title="Redes sociais"
      description={
        <>
          Até {MAX_SOCIALS}. Você escolhe a rede e digita só o @: o link é montado aqui, sempre para o site oficial. No{" "}
          {VERIFIABLE.map((p) => PLATFORMS[p].label).join(" e no ")}, dá para ganhar o selo{" "}
          <BadgeCheck className="inline size-4 text-musgo" aria-label="verificado" />: coloque <span className="font-medium text-ink-2">{address}</span> na
          bio ou no site do perfil e salve de novo.
        </>
      }
    >
      <form onSubmit={save} className="grid gap-3" noValidate>
        {rows.map((row, i) => {
          const saved = profile.socials.find((s) => s.platform === row.platform && s.handle === row.handle);
          return (
            <div key={i} className="grid gap-1.5">
              <div className="flex gap-2">
                <PlatformSelect
                  value={row.platform}
                  used={used}
                  onChange={(platform) => {
                    setRows(rows.map((r, j) => (j === i ? { ...r, platform } : r)));
                    setErrors((x) => ({ ...x, [i]: "" }));
                  }}
                />
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-4">@</span>
                  <input
                    aria-label={`@ no ${PLATFORMS[row.platform].label}`}
                    value={row.handle}
                    onChange={(e) => {
                      setRows(rows.map((r, j) => (j === i ? { ...r, handle: e.target.value } : r)));
                      setErrors((x) => ({ ...x, [i]: "" }));
                    }}
                    placeholder="seu_usuario"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={300}
                    aria-invalid={Boolean(errors[i]) || undefined}
                    className={cn(inputClass, "pl-8", saved?.verified && "pr-10")}
                  />
                  {saved?.verified && (
                    <BadgeCheck className="absolute top-1/2 right-3 size-5 -translate-y-1/2 text-musgo" aria-label="Verificado" />
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Remover"
                  onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl text-ink-3 transition-colors hover:bg-sunken hover:text-ink"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
              {errors[i] && (
                <p role="alert" className="text-sm text-destructive">
                  {errors[i]}
                </p>
              )}
            </div>
          );
        })}
        <div className="mt-1 flex flex-wrap items-center gap-3">
          {rows.length < MAX_SOCIALS && (
            <Button type="button" variant="secondary" onClick={() => setRows([...rows, { platform: nextPlatform, handle: "" }])}>
              <Plus data-icon="inline-start" /> Adicionar rede
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? "Conferindo..." : "Salvar redes"}
          </Button>
        </div>
      </form>
    </Section>
  );
}

// ------------------------------------------------------------
// Senha
// ------------------------------------------------------------

const PASSWORD_ERRORS: Record<string, string> = {
  wrong_current: "A senha atual não confere.",
  weak: "A nova senha precisa ter pelo menos 8 caracteres.",
  same: "A nova senha é igual à atual.",
  locked: "Muitas tentativas erradas. Espere 15 minutos.",
  no_password: "Sua conta entra pelo Google ou GitHub e não tem senha.",
};

export function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) return setError(PASSWORD_ERRORS.weak);
    if (next !== confirm) return setError("A confirmação não é igual à nova senha.");
    setSaving(true);
    const r = await changePasswordAction({ current, next }).catch(() => ({ ok: false as const, error: "unavailable" as const }));
    setSaving(false);
    if (!r.ok) return setError(PASSWORD_ERRORS[r.error] ?? "Não foi possível trocar a senha agora.");
    setError(null);
    setCurrent("");
    setNext("");
    setConfirm("");
    toast("Senha alterada");
  }

  const type = show ? "text" : "password";
  return (
    <Section id="senha" title="Senha" description="Para trocar, confirme a senha atual.">
      <form onSubmit={save} className="grid max-w-sm gap-3" noValidate>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-3">Senha atual</span>
          <input type={type} autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} maxLength={72} className={inputClass} />
        </label>
        <label className="grid gap-1.5">
          <span className="flex justify-between text-xs font-medium text-ink-3">
            Nova senha <span className="font-normal text-ink-4">mínimo de 8 caracteres</span>
          </span>
          <input type={type} autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} maxLength={72} className={inputClass} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-3">Confirmar nova senha</span>
          <input type={type} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} maxLength={72} className={inputClass} />
        </label>
        <button type="button" onClick={() => setShow((s) => !s)} className="inline-flex w-fit items-center gap-1.5 text-sm text-ink-3 hover:text-ink">
          {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          {show ? "Esconder senhas" : "Mostrar senhas"}
        </button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={saving || !current || !next} className="mt-1 w-fit">
          {saving ? "Salvando..." : "Trocar senha"}
        </Button>
      </form>
    </Section>
  );
}

// ------------------------------------------------------------
// Bloqueados
// ------------------------------------------------------------

export function BlockedSection() {
  const [list, setList] = useState<ProfileCard[] | null>(null);

  useEffect(() => {
    void getBlockedReaders().then(setList).catch(() => setList([]));
  }, []);

  async function unblock(handle: string) {
    setList((l) => l?.filter((p) => p.handle !== handle) ?? null);
    setBlocked(handle, false);
    const r = await setBlockAction(handle, false).catch(() => ({ ok: false }));
    if (!r.ok) toast.error("Não foi possível desbloquear");
    else toast(`@${handle} desbloqueado`);
  }

  return (
    <Section id="bloqueados" title="Bloqueados" description="Quem você bloqueou não pode seguir você, pedir para seguir nem reagir às suas reviews.">
      {list === null ? (
        <p className="text-sm text-ink-3">Carregando...</p>
      ) : list.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-ink-3">
          <Ban className="size-4" aria-hidden /> Você não bloqueou ninguém.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
          {list.map((p) => (
            <li key={p.handle} className="flex items-center gap-3 px-4 py-3">
              <UserAvatar user={p} size={36} href={false} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{p.name}</p>
                <p className="truncate text-sm text-ink-3">@{p.handle}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => unblock(p.handle)}>
                Desbloquear
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

// ------------------------------------------------------------
// Dados (LGPD)
// ------------------------------------------------------------

export function DataSection({ handle }: { handle: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    const r = await deleteAccountAction(typed).catch(() => ({ ok: false }));
    if (!r.ok) {
      setDeleting(false);
      return toast.error("Não foi possível excluir a conta", { description: "Confira o @ digitado." });
    }
    await signOut({ redirect: false });
    try {
      localStorage.removeItem("estante:v1");
    } catch {}
    toast("Sua conta foi excluída");
    router.push("/");
    router.refresh();
  }

  return (
    <Section
      id="dados"
      title="Seus dados"
      description={
        <>
          Pela LGPD, você pode baixar tudo o que a Estante guarda sobre você e excluir sua conta quando quiser. Detalhes na{" "}
          <Link href="/privacidade" className="font-medium text-anil hover:text-anil-hover">
            política de privacidade
          </Link>
          .
        </>
      }
    >
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" render={<Link href="/importar" />} nativeButton={false}>
          <Upload data-icon="inline-start" /> Importar do Goodreads ou Kindle
        </Button>
        <Button variant="secondary" render={<a href="/api/conta/exportar" download />} nativeButton={false}>
          <Download data-icon="inline-start" /> Baixar meus dados
        </Button>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          <Trash2 data-icon="inline-start" /> Excluir minha conta
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => (setOpen(o), setTyped(""))}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogTitle className="text-lg font-semibold tracking-tight">Excluir sua conta?</DialogTitle>
          <DialogDescription className="text-ink-3">
            Isso apaga para sempre sua estante, reviews, seguidores, reações e notificações. Não dá para desfazer. Se quiser guardar uma cópia,
            baixe seus dados antes.
          </DialogDescription>
          <label className="mt-2 grid gap-1.5">
            <span className="text-xs font-medium text-ink-3">
              Digite <span className="font-semibold text-ink">@{handle}</span> para confirmar
            </span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="none" spellCheck={false} className={inputClass} />
          </label>
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" disabled={deleting || typed.trim().replace(/^@/, "") !== handle} onClick={remove}>
              {deleting ? "Excluindo..." : "Excluir para sempre"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

// ------------------------------------------------------------
// Plano
// ------------------------------------------------------------

export function PlanSection() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getPlanStatus>> | null>(null);
  useEffect(() => {
    void getPlanStatus().then(setStatus);
  }, []);
  const plan = status?.status?.plan ?? "brochura";
  const paid = plan !== "brochura";
  const end = status?.status?.periodEnd ? new Date(status.status.periodEnd).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" }) : null;

  return (
    <Section id="plano" title="Plano" description="Brochura é grátis para sempre. O Capa Dura tira os limites de citações, notas e discussões.">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-4">
        <div>
          <p className="font-medium text-ink">{!status ? "..." : plan === "ex-libris" ? "Ex Libris" : paid ? "Capa Dura" : "Brochura (grátis)"}</p>
          <p className="text-sm text-ink-3">
            {!status
              ? "Carregando"
              : paid
                ? status.status?.canceling
                  ? `Cancelado: vale até ${end}.`
                  : end
                    ? `Renova em ${end}.`
                    : "Assinatura ativa."
                : "20 citações, 3 notas por livro e 3 discussões novas por mês."}
          </p>
        </div>
        <Button variant={paid ? "secondary" : "default"} nativeButton={false} render={<Link href="/planos" />}>
          {paid ? "Gerenciar" : "Conhecer o Capa Dura"}
        </Button>
      </div>
    </Section>
  );
}
