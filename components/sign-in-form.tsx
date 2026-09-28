"use client";

import { ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { Mark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";
import { getBrowserClient } from "@/lib/supabase/client";
import { githubEnabled, isSupabaseConfigured } from "@/lib/supabase/env";

type Step = { kind: "form"; error?: string } | { kind: "sending" } | { kind: "sent"; email: string };

export function SignInForm() {
  const params = useSearchParams();
  const router = useRouter();
  const auth = useAuth();
  const next = safeNext(params.get("next"));
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>(
    params.get("erro") ? { kind: "form", error: "Esse link expirou ou já foi usado. Peça um novo abaixo." } : { kind: "form" },
  );

  // Já está logado: segue para o destino.
  useEffect(() => {
    if (auth.status === "user") router.replace(next);
  }, [auth.status, next, router]);

  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    const sb = getBrowserClient();
    const value = email.trim();
    if (!sb) return;
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setStep({ kind: "form", error: "Confira o e-mail: parece faltar alguma coisa." });
      return;
    }
    setStep({ kind: "sending" });
    const { error } = await sb.auth.signInWithOtp({ email: value, options: { emailRedirectTo: callback() } });
    if (error) {
      setStep({
        kind: "form",
        error:
          error.status === 429
            ? "Muitos pedidos em pouco tempo. Espere um minuto e tente de novo."
            : "Não conseguimos enviar o link agora. Tente de novo em instantes.",
      });
      return;
    }
    setStep({ kind: "sent", email: value });
  }

  async function github() {
    const sb = getBrowserClient();
    await sb?.auth.signInWithOAuth({ provider: "github", options: { redirectTo: callback() } });
  }

  if (!isSupabaseConfigured) {
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

  if (step.kind === "sent") {
    return (
      <Card>
        <span className="flex size-12 items-center justify-center rounded-full bg-musgo-soft text-musgo">
          <Mail className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Confira seu e-mail</h1>
        <p className="mt-2 text-ink-3" aria-live="polite">
          Mandamos um link de acesso para <span className="font-medium text-ink">{step.email}</span>. Abra neste mesmo navegador.
        </p>
        <Button variant="ghost" className="mt-6 -ml-3 text-anil" onClick={() => setStep({ kind: "form" })}>
          <ArrowLeft data-icon="inline-start" />
          Usar outro e-mail
        </Button>
      </Card>
    );
  }

  const sending = step.kind === "sending";
  const error = step.kind === "form" ? step.error : undefined;

  return (
    <Card>
      <Mark size={44} />
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-ink">Entre na Estante</h1>
      <p className="mt-2 text-ink-3">
        Sua estante em qualquer aparelho, com perfil público. Sem senha: enviamos um link para o seu e-mail.
      </p>

      <form onSubmit={sendLink} className="mt-8 grid gap-3" noValidate>
        <label className="grid gap-1.5">
          <span className="text-xs font-medium text-ink-3">E-mail</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={error ? "signin-error" : undefined}
            className="h-12 w-full rounded-xl border border-line bg-surface px-4 text-base outline-none placeholder:text-ink-4 focus:border-line-strong focus:shadow-[0_0_0_4px_var(--anil-soft)] aria-invalid:border-destructive"
          />
        </label>
        {error && (
          <p id="signin-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" disabled={sending} className="mt-1 w-full">
          {sending ? "Enviando..." : "Enviar link de acesso"}
        </Button>
      </form>

      {githubEnabled && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-ink-4">
            <span className="h-px flex-1 bg-line" /> ou <span className="h-px flex-1 bg-line" />
          </div>
          <Button type="button" size="lg" variant="outline" className="w-full" onClick={github}>
            <GitHubIcon />
            Continuar com GitHub
          </Button>
        </>
      )}

      <p className="mt-8 text-center text-[0.8125rem] text-ink-4">
        O que você já marcou neste navegador vai junto para a sua conta.
      </p>
    </Card>
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
