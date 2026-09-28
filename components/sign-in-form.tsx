"use client";

import { Eye, EyeOff, FlaskConical } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useEffect, useState, type FormEvent } from "react";

import { Mark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth, useAuthFlags } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";
type Pending = "github" | "google" | "password" | "dev" | null;

const ERRORS: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_taken: "Já existe uma conta com esse e-mail. Use a aba Entrar.",
  locked: "Muitas tentativas erradas. Por segurança, espere 15 minutos e tente de novo.",
  invalid_input: "Confira os campos e tente de novo.",
};

export function SignInForm() {
  const params = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const flags = useAuthFlags();
  const next = safeNext(params.get("next") ?? params.get("callbackUrl"));
  const [pending, setPending] = useState<Pending>(null);
  const [devName, setDevName] = useState("");
  const [oauthFailed] = useState(() => params.has("error"));

  // Já está logado: segue para o destino.
  useEffect(() => {
    if (auth.status === "user") router.replace(next);
  }, [auth.status, next, router]);

  if (!flags.accounts) {
    return (
      <Card>
        <Mark size={44} />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Login desativado nesta versão</h1>
        <p className="mt-2 text-ink-3">
          Esta cópia roda sem banco de dados. Sua estante continua funcionando e fica salva neste navegador.
        </p>
        <Button size="lg" className="mt-8 w-full" render={<Link href="/estante" />} nativeButton={false}>
          Ir para minha estante
        </Button>
      </Card>
    );
  }

  function oauth(provider: "github" | "google") {
    setPending(provider);
    void signIn(provider, { redirectTo: next });
  }

  function devLogin(e: FormEvent) {
    e.preventDefault();
    if (!devName.trim()) return;
    setPending("dev");
    void signIn("dev", { name: devName.trim(), redirectTo: next });
  }

  const hasOAuth = flags.github || flags.google;

  return (
    <Card>
      <Mark size={44} />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Entre na Estante</h1>
      <p className="mt-2 text-ink-3">Sua estante em qualquer aparelho, com perfil público para mostrar o que você lê.</p>

      {oauthFailed && (
        <p role="alert" className="mt-6 rounded-xl bg-sunken px-4 py-3 text-sm text-ink-2">
          Não foi possível entrar. Tente de novo; se continuar, tente outra forma de login.
        </p>
      )}

      {hasOAuth && (
        <div className="mt-8 grid gap-2.5">
          {flags.google && (
            <Button size="lg" variant="outline" className="w-full" onClick={() => oauth("google")} disabled={pending !== null}>
              <GoogleIcon />
              {pending === "google" ? "Abrindo o Google..." : "Continuar com Google"}
            </Button>
          )}
          {flags.github && (
            <Button size="lg" variant="outline" className="w-full" onClick={() => oauth("github")} disabled={pending !== null}>
              <GitHubIcon />
              {pending === "github" ? "Abrindo o GitHub..." : "Continuar com GitHub"}
            </Button>
          )}
        </div>
      )}

      {flags.password && (
        <>
          {hasOAuth && (
            <div className="my-6 flex items-center gap-3 text-xs text-ink-4">
              <span className="h-px flex-1 bg-line" /> ou com e-mail <span className="h-px flex-1 bg-line" />
            </div>
          )}
          <PasswordForm next={next} pending={pending} setPending={setPending} className={hasOAuth ? "" : "mt-8"} />
        </>
      )}

      {flags.devLogin && (
        <form onSubmit={devLogin} className="mt-8 grid gap-3 rounded-2xl border border-dashed border-line-strong p-4">
          <p className="flex items-center gap-2 text-xs font-medium text-ink-3">
            <FlaskConical className="size-3.5" aria-hidden />
            Login de teste · só em desenvolvimento
          </p>
          <label className="grid gap-1.5">
            <span className="sr-only">Nome do leitor de teste</span>
            <input
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              placeholder="Nome do leitor de teste"
              maxLength={60}
              className={inputClass}
            />
          </label>
          <Button type="submit" variant="secondary" disabled={pending !== null || !devName.trim()}>
            {pending === "dev" ? "Entrando..." : "Entrar como leitor de teste"}
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-[0.8125rem] text-ink-4">O que você já marcou neste navegador vai junto para a sua conta.</p>
    </Card>
  );
}

function PasswordForm({
  next,
  pending,
  setPending,
  className,
}: {
  next: string;
  pending: Pending;
  setPending: (p: Pending) => void;
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(m: Mode) {
    setMode(m);
    setError(null);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (mode === "signup" && !name.trim()) return setError("Diga como quer ser chamado.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) return setError("Confira o e-mail: parece faltar alguma coisa.");
    if (mode === "signup" && password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (!password) return setError("Digite sua senha.");

    setError(null);
    setPending("password");
    const result = await signIn("password", {
      redirect: false,
      mode,
      email: cleanEmail,
      password,
      name: name.trim(),
    }).catch(() => null);

    if (!result || result.error) {
      setPending(null);
      setError(ERRORS[result?.code ?? ""] ?? "Não foi possível entrar agora. Tente de novo em instantes.");
      return;
    }
    // Recarrega para a sessão nova valer em todo o app (cabeçalho, estante, perfil).
    window.location.assign(next);
  }

  const busy = pending === "password";

  return (
    <div className={className}>
      <div role="tablist" aria-label="Entrar ou criar conta" className="grid grid-cols-2 rounded-full bg-sunken p-1">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchMode(m)}
            className={cn(
              "h-9 rounded-full text-sm font-medium transition-colors",
              mode === m ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink",
            )}
          >
            {m === "signin" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-5 grid gap-3" noValidate>
        {mode === "signup" && (
          <Field label="Nome">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={60}
              placeholder="Como quer aparecer no perfil"
              className={inputClass}
            />
          </Field>
        )}
        <Field label="E-mail">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            maxLength={254}
            className={inputClass}
          />
        </Field>
        <Field label="Senha" hint={mode === "signup" ? "Mínimo de 8 caracteres" : undefined}>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={72}
              className={cn(inputClass, "pr-12")}
            />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Esconder senha" : "Mostrar senha"}
              className="absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2 items-center justify-center rounded-full text-ink-3 hover:bg-sunken hover:text-ink"
            >
              {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            </button>
          </div>
        </Field>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="mt-1 w-full" disabled={pending !== null}>
          {busy ? (mode === "signup" ? "Criando conta..." : "Entrando...") : mode === "signup" ? "Criar conta" : "Entrar"}
        </Button>

        {mode === "signup" && (
          <p className="text-[0.8125rem] text-ink-4">
            Guarde bem sua senha: nesta versão ainda não há recuperação por e-mail.
          </p>
        )}
      </form>
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-xl border border-line bg-surface px-4 text-base text-ink outline-none placeholder:text-ink-4 focus:border-line-strong focus:shadow-[0_0_0_4px_var(--anil-soft)]";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="flex justify-between text-xs font-medium text-ink-3">
        {label}
        {hint && <span className="font-normal text-ink-4">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-sm animate-fade-up">{children}</div>;
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-current">
      <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.56-.29-5.25-1.28-5.25-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.27 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

/** Logo do Google nas cores oficiais, como pedem as diretrizes de marca do "Sign in with Google". */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-[18px]">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.9l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.28v3.1A12 12 0 0 0 12 24Z" />
      <path fill="#FBBC05" d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.28a12 12 0 0 0 0 10.78l4.01-3.1Z" />
      <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44A11.5 11.5 0 0 0 12 0 12 12 0 0 0 1.28 6.61l4.01 3.1C6.23 6.88 8.88 4.77 12 4.77Z" />
    </svg>
  );
}
